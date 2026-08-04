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
}

export function exportStudyEvents() {
  const events = readStudyEvents();
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), events }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rmw-demo-events-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  eventLog("event_log_exported", { eventCount: events.length }, { stage: "admin" });
}

export interface ExperimentExportPayload {
  participantCode: string;
  locale: string;
  condition: string;
  taskId: string;
  memo: string;
  chat: Array<{ role: "user" | "assistant"; text: string }>;
  recallResponses: string[];
}

function summarizeEvents(events: StudyEvent[]) {
  const byType = events.reduce<Record<string, number>>((summary, item) => {
    summary[item.type] = (summary[item.type] || 0) + 1;
    return summary;
  }, {});
  const byStage = events.reduce<Record<string, number>>((summary, item) => {
    summary[item.stage] = (summary[item.stage] || 0) + 1;
    return summary;
  }, {});
  const firstAt = events[0]?.at;
  const lastAt = events.at(-1)?.at;
  const durationSeconds = firstAt && lastAt
    ? Math.max(0, Math.round((Date.parse(lastAt) - Date.parse(firstAt)) / 1000))
    : 0;
  return {
    totalEvents: events.length,
    durationSeconds,
    byType,
    byStage,
    firstAt: firstAt || null,
    lastAt: lastAt || null,
  };
}

export function exportExperimentArchive(payload: ExperimentExportPayload) {
  const events = readStudyEvents();
  const archive = {
    schemaVersion: "rmw-participant-export-v1",
    exportedAt: new Date().toISOString(),
    participant: {
      anonymousCode: payload.participantCode,
      locale: payload.locale,
      condition: payload.condition,
      taskId: payload.taskId,
    },
    summary: {
      ...summarizeEvents(events),
      chatTurns: payload.chat.length,
      userChatTurns: payload.chat.filter((item) => item.role === "user").length,
      memoCharacters: payload.memo.replace(/\s/g, "").length,
      recallAnswered: payload.recallResponses.filter((item) => item.trim()).length,
    },
    finalState: {
      memo: payload.memo,
      chatTranscript: payload.chat,
      unsupportedRecall: payload.recallResponses,
    },
    interactionTimeline: events,
  };
  const blob = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rmw-participant-${payload.participantCode || "anonymous"}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  eventLog("experiment_archive_exported", { eventCount: events.length }, { stage: "complete" });
}
