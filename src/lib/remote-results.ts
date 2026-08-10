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

export type RemoteStudyStartResult =
  | { status: "ready" }
  | { status: "unavailable" }
  | { status: "participant_conflict" }
  | { status: "network_error" };

export type RemoteStudyCompletionResult = { status: "saved" | "queued" };

type PostResult = { ok: boolean; status: number; body: Record<string, unknown> | null; networkError?: boolean };
let flushQueue: Promise<boolean> = Promise.resolve(true);

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

async function postResult(body: Record<string, unknown>): Promise<PostResult> {
  try {
    const response = await fetch("/api/results", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      signal: AbortSignal.timeout(8_000),
    });
    let parsed: Record<string, unknown> | null = null;
    try { parsed = await response.json() as Record<string, unknown>; } catch { /* Safe status handling does not require a response body. */ }
    return { ok: response.ok, status: response.status, body: parsed };
  } catch {
    return { ok: false, status: 0, body: null, networkError: true };
  }
}

async function flushOutboxes(completed = false) {
  if (typeof window === "undefined") return false;
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  let fullySaved = true;

  const snapshotKey = storageKey(SNAPSHOT_OUTBOX_PREFIX);
  const snapshot = readObject<Snapshot>(snapshotKey, {});
  if (completed || Object.keys(snapshot).length) {
    const sentSnapshot = JSON.stringify(snapshot);
    const result = await postResult({ action: completed ? "complete" : "snapshot", token, data: snapshot });
    if (result.ok && (result.body?.mode === "saved" || result.body?.mode === "completed")) {
      if (localStorage.getItem(snapshotKey) === sentSnapshot) localStorage.removeItem(snapshotKey);
    } else {
      fullySaved = false;
    }
  }

  const eventKey = storageKey(EVENT_OUTBOX_PREFIX);
  const events = readObject<Record<string, unknown>[]>(eventKey, []);
  for (const event of events) {
    const result = await postResult({ action: "event", token, event });
    if (!result.ok) {
      fullySaved = false;
      break;
    }
    const current = readObject<Record<string, unknown>[]>(eventKey, []);
    const remaining = current.filter((saved) => saved.id !== event.id);
    if (remaining.length) writeObject(eventKey, remaining);
    else localStorage.removeItem(eventKey);
  }
  return fullySaved && !localStorage.getItem(snapshotKey) && !localStorage.getItem(eventKey);
}

function queueFlush(completed = false) {
  flushQueue = flushQueue.then(() => flushOutboxes(completed)).catch(() => false);
  return flushQueue;
}

export async function startRemoteStudySession(input: { participantCode: string; locale: string; condition: string; taskId: string }): Promise<RemoteStudyStartResult> {
  const existingToken = typeof window === "undefined" ? "" : sessionStorage.getItem(TOKEN_KEY) || "";
  const result = await postResult({ action: "start", ...input, token: existingToken || undefined });
  if (!result.ok) {
    if (result.status === 409) return { status: "participant_conflict" };
    if (result.networkError) return { status: "network_error" };
    return { status: "unavailable" };
  }
  if (typeof result.body?.token !== "string") return { status: "unavailable" };
  sessionStorage.setItem(TOKEN_KEY, result.body.token);
  await queueFlush();
  return { status: "ready" };
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

export async function completeRemoteStudy(input: Pick<Snapshot, "memo" | "chat" | "problemState">): Promise<RemoteStudyCompletionResult> {
  if (typeof window === "undefined") return { status: "queued" };
  const key = storageKey(SNAPSHOT_OUTBOX_PREFIX);
  writeObject(key, { ...readObject<Snapshot>(key, {}), ...input });
  return { status: await queueFlush(true) ? "saved" : "queued" };
}
