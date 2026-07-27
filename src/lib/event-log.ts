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
  const item: StudyEvent = {
    id: crypto.randomUUID(),
    type,
    stage: context.stage || "unknown",
    targetType: context.targetType,
    targetId: context.targetId,
    sequenceNumber: current.length + 1,
    payload,
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
