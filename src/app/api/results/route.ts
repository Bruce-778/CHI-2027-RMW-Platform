import { NextResponse } from "next/server";
import { z } from "zod";
import { getParticipantSessionSecret, getResultsStore } from "@/lib/results-server";
import { createSignedToken, verifySignedToken } from "@/lib/signed-token";

const participantCodeSchema = z.string().regex(/^RMW-[A-F0-9]{8}$/);
const chatSchema = z.array(z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(8000),
})).max(60);
const snapshotSchema = z.object({
  preSurvey: z.record(z.string(), z.number().int().min(1).max(5)).optional(),
  memo: z.string().max(20000).optional(),
  chat: chatSchema.optional(),
  problemState: z.unknown().optional(),
  recall: z.record(z.string(), z.string().max(8000)).optional(),
  recoveryState: z.unknown().optional(),
}).strict();
const eventSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1).max(100),
  stage: z.string().min(1).max(100),
  targetType: z.string().max(100).optional(),
  targetId: z.string().max(200).optional(),
  sequenceNumber: z.number().int().positive(),
  payload: z.record(z.string(), z.unknown()),
  at: z.string().datetime(),
});
const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    participantCode: participantCodeSchema,
    locale: z.enum(["zh-CN", "en"]),
    condition: z.enum(["rmw", "summary", "notes"]),
    taskId: z.literal("waste"),
    token: z.string().min(1).max(2000).optional(),
  }),
  z.object({ action: z.literal("event"), token: z.string().min(1).max(2000), event: eventSchema }),
  z.object({ action: z.literal("snapshot"), token: z.string().min(1).max(2000), data: snapshotSchema }),
  z.object({ action: z.literal("complete"), token: z.string().min(1).max(2000), data: snapshotSchema }),
]);

async function participantFromToken(token: string, secret: string) {
  const payload = await verifySignedToken(token, secret);
  if (payload?.scope !== "participant" || typeof payload.participantCode !== "string") return null;
  return participantCodeSchema.safeParse(payload.participantCode).success ? payload.participantCode : null;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid result payload" }, { status: 400 });
  const store = getResultsStore();
  const sessionSecret = getParticipantSessionSecret();
  if (!store || !sessionSecret) {
    return NextResponse.json({ mode: "unavailable", error: "Central result storage is not configured" }, { status: 503 });
  }

  if (parsed.data.action === "start") {
    const { participantCode, locale, condition, taskId, token: resumeToken } = parsed.data;
    const { data: existing, error: lookupError } = await store.from("participant_results")
      .select("participant_code")
      .eq("participant_code", participantCode)
      .maybeSingle();
    if (lookupError) return NextResponse.json({ error: "Could not start result session" }, { status: 502 });
    if (existing) {
      const resumedParticipant = resumeToken ? await participantFromToken(resumeToken, sessionSecret) : null;
      if (resumedParticipant !== participantCode) {
        return NextResponse.json({ error: "Participant code is already in use" }, { status: 409 });
      }
    } else {
      const { error } = await store.from("participant_results").insert({
        participant_code: participantCode,
        locale,
        condition,
        task_id: taskId,
        status: "started",
        consented_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) return NextResponse.json({ error: "Could not start result session" }, { status: 502 });
    }
    const token = await createSignedToken({
      scope: "participant",
      participantCode,
      exp: Date.now() + 12 * 60 * 60 * 1000,
    }, sessionSecret);
    return NextResponse.json({ mode: "live", token });
  }

  const participantCode = await participantFromToken(parsed.data.token, sessionSecret);
  if (!participantCode) return NextResponse.json({ error: "Invalid participant session" }, { status: 401 });

  if (parsed.data.action === "event") {
    const event = parsed.data.event;
    const { error } = await store.from("participant_result_events").upsert({
      id: event.id,
      participant_code: participantCode,
      sequence_number: event.sequenceNumber,
      event_type: event.type,
      stage: event.stage,
      target_type: event.targetType || null,
      target_id: event.targetId || null,
      payload: event.payload,
      client_timestamp: event.at,
    }, { onConflict: "id", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: "Could not save event" }, { status: 502 });
    return NextResponse.json({ mode: "saved" });
  }

  const data = parsed.data.data;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.preSurvey !== undefined) update.pre_survey = data.preSurvey;
  if (data.memo !== undefined) update.memo = data.memo;
  if (data.chat !== undefined) update.chat = data.chat;
  if (data.problemState !== undefined) update.problem_state = data.problemState;
  if (data.recall !== undefined) update.recall = data.recall;
  if (data.recoveryState !== undefined) update.recovery_state = data.recoveryState;
  if (parsed.data.action === "complete") {
    update.status = "completed";
    update.completed_at = new Date().toISOString();
  }
  const { error } = await store.from("participant_results").update(update).eq("participant_code", participantCode);
  if (error) return NextResponse.json({ error: "Could not save result snapshot" }, { status: 502 });
  return NextResponse.json({ mode: parsed.data.action === "complete" ? "completed" : "saved" });
}
