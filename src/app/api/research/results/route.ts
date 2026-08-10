import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getResearcherAuthConfig, getResultsStore } from "@/lib/results-server";
import { verifySignedToken } from "@/lib/signed-token";

async function isAuthorized(request: NextRequest) {
  const config = getResearcherAuthConfig();
  if (!config) return false;
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const payload = await verifySignedToken(token, config.sessionSecret);
  return payload?.scope === "researcher";
}

export async function GET(request: NextRequest) {
  const authConfig = getResearcherAuthConfig();
  if (!authConfig) {
    return NextResponse.json({ mode: "unavailable", error: "Research result storage is not configured" }, { status: 503 });
  }
  if (!await isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = getResultsStore();
  if (!store) return NextResponse.json({ mode: "unavailable", error: "Research result storage is not configured" }, { status: 503 });

  if (request.nextUrl.searchParams.get("export") === "1") {
    const [{ data: results, error: resultsError }, { data: events, error: eventsError }] = await Promise.all([
      store.from("participant_results").select("*").order("created_at", { ascending: true }),
      store.from("participant_result_events").select("*").order("server_timestamp", { ascending: true }),
    ]);
    if (resultsError || eventsError) return NextResponse.json({ error: "Could not export results" }, { status: 502 });
    return NextResponse.json({
      schemaVersion: "rmw-central-results-v1",
      exportedAt: new Date().toISOString(),
      results: results || [],
      events: events || [],
    });
  }

  const participantCode = request.nextUrl.searchParams.get("participantCode");
  if (participantCode) {
    const [{ data: result, error: resultError }, { data: events, error: eventsError }] = await Promise.all([
      store.from("participant_results").select("*").eq("participant_code", participantCode).maybeSingle(),
      store.from("participant_result_events").select("*").eq("participant_code", participantCode).order("sequence_number", { ascending: true }),
    ]);
    if (resultError || eventsError) return NextResponse.json({ error: "Could not load participant result" }, { status: 502 });
    if (!result) return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    return NextResponse.json({ mode: "live", result, events: events || [] });
  }

  const { data, error } = await store.from("participant_results")
    .select("participant_code,locale,condition,task_id,status,consented_at,completed_at,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load results" }, { status: 502 });
  return NextResponse.json({ mode: "live", results: data || [] });
}
