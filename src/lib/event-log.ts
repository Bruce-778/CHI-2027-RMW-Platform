export interface StudyEvent {
  id: string;
  type: string;
  stage: string;
  targetType?: string;
  targetId?: string;
  sequenceNumber: number;
  payload: Record<string, unknown>;
  at: string;
}

export interface ProblemStateAction {
  type: string;
  stage: string;
  targetType?: string;
  targetId?: string;
  sequenceNumber: number;
  payload: Record<string, unknown>;
  at: string;
}

const STORAGE_KEY = "rmw-demo-events";
const PARTICIPANT_KEY = "rmw-participant-id";

export function getOrCreateParticipantId() {
  if (typeof window === "undefined") return "";
  const existing = sessionStorage.getItem(PARTICIPANT_KEY);
  if (existing) return existing;
  const generated = `RMW-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  sessionStorage.setItem(PARTICIPANT_KEY, generated);
  return generated;
}

export function readStudyEvents(): StudyEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const PROBLEM_STATE_ACTIONS = new Set([
  "material_opened",
  "phase_criterion_toggled",
  "memo_edited",
  "chat_message_sent",
  "chat_response_received",
  "phase_one_checkpoint_requested",
  "workspace_timer_expired",
]);

export function readProblemStateActions(): ProblemStateAction[] {
  const anonymousCode = getOrCreateParticipantId();
  const allEvents = readStudyEvents();
  const studyStart = allEvents.findLastIndex((event) =>
    event.type === "research_task_started" && event.payload.anonymousCode === anonymousCode);
  const relevant = allEvents.slice(studyStart + 1).filter((event) =>
    event.payload.anonymousCode === anonymousCode
    && event.stage === "research_work"
    && PROBLEM_STATE_ACTIONS.has(event.type));
  const lastMemoEdit = relevant.findLastIndex((event) => event.type === "memo_edited");

  return relevant
    .filter((event, index) => event.type !== "memo_edited" || index === lastMemoEdit)
    .slice(-80)
    .map((event) => {
      const safePayload = { ...event.payload };
      delete safePayload.anonymousCode;
      return {
        type: event.type,
        stage: event.stage,
        targetType: event.targetType,
        targetId: event.targetId,
        sequenceNumber: event.sequenceNumber,
        payload: safePayload,
        at: event.at,
      };
    });
}

export function eventLog(
  type: string,
  payload: Record<string, unknown> = {},
  context: { stage?: string; targetType?: string; targetId?: string } = {},
) {
  if (typeof window === "undefined") return;
  const current = readStudyEvents();
  const anonymousCode = getOrCreateParticipantId();
  const item: StudyEvent = {
    id: crypto.randomUUID(),
    type,
    stage: context.stage || "unknown",
    targetType: context.targetType,
    targetId: context.targetId,
    sequenceNumber: current.length + 1,
    payload: { anonymousCode, ...payload },
    at: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, item].slice(-1000)));
  syncRemoteEvent(item as unknown as Record<string, unknown>);
}
import { syncRemoteEvent } from "./remote-results";
