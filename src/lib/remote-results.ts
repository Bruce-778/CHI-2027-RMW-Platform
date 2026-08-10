import type { ProblemStateSnapshot } from "./rmw-types";

const TOKEN_KEY = "rmw-participant-session-token";
const OUTBOX_KEY_PREFIX = "rmw-result-snapshot-outbox";
const LOCAL_EVENTS_KEY = "rmw-demo-events";
const PARTICIPANT_KEY = "rmw-participant-id";

type ChatTurn = { role: "user" | "assistant"; text: string };

function getToken() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

function getOutboxKey() {
  if (typeof window === "undefined") return OUTBOX_KEY_PREFIX;
  const participantCode = sessionStorage.getItem(PARTICIPANT_KEY) || "anonymous";
  return `${OUTBOX_KEY_PREFIX}:${participantCode}`;
}

function readOutbox() {
  if (typeof window === "undefined") return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(localStorage.getItem(getOutboxKey()) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function writeOutbox(data: Record<string, unknown>) {
  if (typeof window !== "undefined") localStorage.setItem(getOutboxKey(), JSON.stringify(data));
}

function readLocalParticipantEvents(participantCode: string) {
  if (typeof window === "undefined") return [] as Record<string, unknown>[];
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((event) => event?.payload?.anonymousCode === participantCode) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

async function postResult(body: Record<string, unknown>) {
  try {
    const response = await fetch("/api/results", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return null;
    return await response.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function startRemoteStudySession(input: {
  participantCode: string;
  locale: string;
  condition: string;
  taskId: string;
}) {
  const existingToken = getToken();
  const result = await postResult({ action: "start", ...input, token: existingToken || undefined });
  if (typeof result?.token === "string") {
    sessionStorage.setItem(TOKEN_KEY, result.token);
    const pendingSnapshot = readOutbox();
    if (Object.keys(pendingSnapshot).length) void postResult({ action: "snapshot", token: result.token, data: pendingSnapshot });
    readLocalParticipantEvents(input.participantCode).forEach((event) => {
      void postResult({ action: "event", token: result.token, event });
    });
  }
  return Boolean(result?.token);
}

export function syncRemoteEvent(event: Record<string, unknown>) {
  const token = getToken();
  if (!token) return;
  void postResult({ action: "event", token, event });
}

export function saveRemoteStudySnapshot(input: {
  preSurvey?: Record<string, number>;
  memo?: string;
  chat?: ChatTurn[];
  problemState?: ProblemStateSnapshot | null;
  recall?: Record<string, string>;
  recoveryState?: unknown;
}) {
  const pendingSnapshot = { ...readOutbox(), ...input };
  writeOutbox(pendingSnapshot);
  const token = getToken();
  if (!token) return;
  void postResult({ action: "snapshot", token, data: pendingSnapshot });
}

export function completeRemoteStudy(input: {
  memo: string;
  chat: ChatTurn[];
  problemState: ProblemStateSnapshot | null;
}) {
  const finalSnapshot = { ...readOutbox(), ...input };
  writeOutbox(finalSnapshot);
  const token = getToken();
  if (!token) return;
  void postResult({ action: "complete", token, data: finalSnapshot }).then((result) => {
    if (result?.mode === "completed") localStorage.removeItem(getOutboxKey());
  });
}
