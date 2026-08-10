import type { ProblemStateSnapshot } from "./rmw-types";

const TOKEN_KEY = "rmw-participant-session-token";
const SNAPSHOT_OUTBOX_PREFIX = "rmw-result-snapshot-outbox";
const EVENT_OUTBOX_PREFIX = "rmw-result-event-outbox";
const PARTICIPANT_KEY = "rmw-participant-id";

type ChatTurn = { role: "user" | "assistant"; text: string };
type Snapshot = {
  preSurvey?: Record<string, number>;
  memo?: string;
  chat?: ChatTurn[];
  problemState?: ProblemStateSnapshot | null;
  recall?: Record<string, string>;
  recoveryState?: unknown;
};

let flushQueue = Promise.resolve();

function participantCode() {
  return typeof window === "undefined" ? "anonymous" : sessionStorage.getItem(PARTICIPANT_KEY) || "anonymous";
}

function storageKey(prefix: string) {
  return `${prefix}:${participantCode()}`;
}

function readObject<T extends object>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed && typeof parsed === "object" ? parsed as T : fallback;
  } catch {
    return fallback;
  }
}

function writeObject(key: string, value: object) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}

async function postResult(body: Record<string, unknown>) {
  try {
    const response = await fetch("/api/results", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    return await response.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function flushOutboxes(completed = false) {
  if (typeof window === "undefined") return;
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return;

  const snapshotKey = storageKey(SNAPSHOT_OUTBOX_PREFIX);
  const snapshot = readObject<Snapshot>(snapshotKey, {});
  if (completed || Object.keys(snapshot).length) {
    const sentSnapshot = JSON.stringify(snapshot);
    const result = await postResult({ action: completed ? "complete" : "snapshot", token, data: snapshot });
    if ((result?.mode === "saved" || result?.mode === "completed") && localStorage.getItem(snapshotKey) === sentSnapshot) {
      localStorage.removeItem(snapshotKey);
    }
  }

  const eventKey = storageKey(EVENT_OUTBOX_PREFIX);
  const events = readObject<Record<string, unknown>[]>(eventKey, []);
  for (const event of events) {
    const result = await postResult({ action: "event", token, event });
    if (!result) break;
    const current = readObject<Record<string, unknown>[]>(eventKey, []);
    const remaining = current.filter((saved) => saved.id !== event.id);
    if (remaining.length) writeObject(eventKey, remaining);
    else localStorage.removeItem(eventKey);
  }
}

function queueFlush(completed = false) {
  flushQueue = flushQueue.then(() => flushOutboxes(completed)).catch(() => undefined);
  return flushQueue;
}

export async function startRemoteStudySession(input: { participantCode: string; locale: string; condition: string; taskId: string }) {
  const existingToken = typeof window === "undefined" ? "" : sessionStorage.getItem(TOKEN_KEY) || "";
  const result = await postResult({ action: "start", ...input, token: existingToken || undefined });
  if (typeof result?.token !== "string") return false;
  sessionStorage.setItem(TOKEN_KEY, result.token);
  await queueFlush();
  return true;
}

export function syncRemoteEvent(event: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const key = storageKey(EVENT_OUTBOX_PREFIX);
  const events = readObject<Record<string, unknown>[]>(key, []);
  if (!events.some((saved) => saved.id === event.id)) writeObject(key, [...events, event].slice(-1000));
  void queueFlush();
}

export function saveRemoteStudySnapshot(input: Snapshot) {
  if (typeof window === "undefined") return;
  const key = storageKey(SNAPSHOT_OUTBOX_PREFIX);
  writeObject(key, { ...readObject<Snapshot>(key, {}), ...input });
  void queueFlush();
}

export function completeRemoteStudy(input: Pick<Snapshot, "memo" | "chat" | "problemState">) {
  if (typeof window === "undefined") return;
  const key = storageKey(SNAPSHOT_OUTBOX_PREFIX);
  writeObject(key, { ...readObject<Snapshot>(key, {}), ...input });
  void queueFlush(true);
}
