import { getResultStorageConfig, type SupabaseStorageConfig } from "./results-server";

export type ParticipantResultRow = {
  participant_code: string;
  locale: string;
  condition: string;
  task_id: string;
  status: "started" | "completed";
  consented_at: string;
  completed_at: string | null;
  pre_survey: Record<string, number> | null;
  memo: string | null;
  chat: unknown;
  problem_state: unknown;
  recall: Record<string, string> | null;
  recovery_state: unknown;
  created_at: string;
  updated_at: string;
};

export type ResultEventRow = {
  id: string;
  participant_code: string;
  sequence_number: number;
  event_type: string;
  stage: string;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, unknown>;
  client_timestamp: string;
  server_timestamp: string;
};

export type ResultDatabase = { results: ParticipantResultRow[]; events: ResultEventRow[] };
export type ParticipantResultSummary = Pick<ParticipantResultRow, "participant_code" | "locale" | "condition" | "task_id" | "status" | "consented_at" | "completed_at" | "created_at" | "updated_at">;
export type ResultEventInput = Omit<ResultEventRow, "participant_code" | "server_timestamp">;
export type ResultUpdate = Partial<Pick<ParticipantResultRow, "pre_survey" | "memo" | "chat" | "problem_state" | "recall" | "recovery_state">>;

export type ResultStorageErrorCode =
  | "STORAGE_NOT_CONFIGURED"
  | "INVALID_CREDENTIALS"
  | "PERMISSION_DENIED"
  | "SCHEMA_MISSING"
  | "PARTICIPANT_CONFLICT"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_NETWORK_ERROR"
  | "UPSTREAM_ERROR";

export class ResultStorageError extends Error {
  constructor(
    public readonly code: ResultStorageErrorCode,
    message: string,
    public readonly details: { status?: number; postgrestCode?: string; postgrestMessage?: string; hint?: string } = {},
  ) {
    super(message);
    this.name = "ResultStorageError";
  }
}

const EMPTY_DATABASE: ResultDatabase = { results: [], events: [] };
const PAGE_SIZE = 1000;

async function localStore() {
  return await import("./local-result-store");
}

export function buildSupabaseHeaders(config: SupabaseStorageConfig, extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("apikey", config.secret);
  headers.set("content-type", "application/json");
  if (config.authorization) headers.set("authorization", config.authorization);
  return headers;
}

function mapSupabaseError(status: number, body: unknown) {
  const detail = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const postgrestCode = typeof detail.code === "string" ? detail.code : undefined;
  const postgrestMessage = typeof detail.message === "string" ? detail.message : undefined;
  const hint = typeof detail.hint === "string" ? detail.hint : undefined;
  const metadata = { status, postgrestCode, postgrestMessage, hint };
  if (status === 401 || /invalid jwt/i.test(postgrestMessage || "")) {
    return new ResultStorageError("INVALID_CREDENTIALS", "Supabase rejected the configured credential", metadata);
  }
  if (status === 403 || postgrestCode === "42501") {
    return new ResultStorageError("PERMISSION_DENIED", "Supabase denied access to result storage", metadata);
  }
  if (status === 404 || postgrestCode === "PGRST205" || postgrestCode === "42P01") {
    return new ResultStorageError("SCHEMA_MISSING", "The result storage schema is unavailable", metadata);
  }
  if (status === 409 || postgrestCode === "23505") {
    return new ResultStorageError("PARTICIPANT_CONFLICT", "The participant result already exists", metadata);
  }
  return new ResultStorageError("UPSTREAM_ERROR", "Supabase result storage request failed", metadata);
}

export async function supabaseRequest<T>(pathName: string, init: RequestInit = {}) {
  const config = getResultStorageConfig();
  if (!config || config.mode !== "supabase") {
    throw new ResultStorageError("STORAGE_NOT_CONFIGURED", "Supabase result storage is not configured");
  }
  let response: Response;
  try {
    response = await fetch(`${config.url}/rest/v1/${pathName}`, {
      ...init,
      headers: buildSupabaseHeaders(config, init.headers),
      signal: init.signal || AbortSignal.timeout(10_000),
    });
  } catch (error) {
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new ResultStorageError("UPSTREAM_TIMEOUT", "Supabase result storage timed out");
    }
    throw new ResultStorageError("UPSTREAM_NETWORK_ERROR", "Could not reach Supabase result storage");
  }
  if (!response.ok) {
    let body: unknown = null;
    try { body = await response.json(); } catch { /* The upstream body may be empty or non-JSON. */ }
    throw mapSupabaseError(response.status, body);
  }
  if (response.status === 204 || response.headers.get("content-length") === "0") return null as T;
  return await response.json() as T;
}

async function readSupabasePages<T>(pathName: string) {
  const rows: T[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const page = await supabaseRequest<T[]>(pathName, { headers: { range: `${start}-${start + PAGE_SIZE - 1}` } });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export function resultStorageMode() {
  return getResultStorageConfig()?.mode || null;
}

export async function probeResultStorage() {
  const config = getResultStorageConfig();
  if (!config) throw new ResultStorageError("STORAGE_NOT_CONFIGURED", "Result storage is not configured");
  if (config.mode === "local") {
    await (await localStore()).readLocalDatabase(config.directory);
    return config.mode;
  }
  await supabaseRequest<Pick<ParticipantResultRow, "participant_code">[]>("participant_results?select=participant_code&limit=0");
  return config.mode;
}

export async function findParticipant(participantCode: string) {
  const config = getResultStorageConfig();
  if (!config) return null;
  if (config.mode === "local") {
    return (await (await localStore()).readLocalDatabase(config.directory)).results.find((result) => result.participant_code === participantCode) || null;
  }
  const rows = await supabaseRequest<ParticipantResultRow[]>(`participant_results?participant_code=eq.${encodeURIComponent(participantCode)}&limit=1`);
  return rows[0] || null;
}

export async function createParticipant(input: { participantCode: string; locale: string; condition: string; taskId: string }) {
  const config = getResultStorageConfig();
  if (!config) throw new ResultStorageError("STORAGE_NOT_CONFIGURED", "Result storage is not configured");
  const now = new Date().toISOString();
  const row: ParticipantResultRow = {
    participant_code: input.participantCode, locale: input.locale, condition: input.condition, task_id: input.taskId,
    status: "started", consented_at: now, completed_at: null, pre_survey: null, memo: null, chat: null,
    problem_state: null, recall: null, recovery_state: null, created_at: now, updated_at: now,
  };
  if (config.mode === "local") {
    await (await localStore()).updateLocalDatabase(config.directory, (database) => {
      if (!database.results.some((result) => result.participant_code === input.participantCode)) database.results.push(row);
    });
    return;
  }
  await supabaseRequest("participant_results", { method: "POST", headers: { prefer: "return=minimal" }, body: JSON.stringify(row) });
}

export async function saveResultEvent(participantCode: string, event: ResultEventInput) {
  const config = getResultStorageConfig();
  if (!config) throw new ResultStorageError("STORAGE_NOT_CONFIGURED", "Result storage is not configured");
  const row: ResultEventRow = { ...event, participant_code: participantCode, server_timestamp: new Date().toISOString() };
  if (config.mode === "local") {
    await (await localStore()).updateLocalDatabase(config.directory, (database) => {
      if (!database.events.some((saved) => saved.id === row.id || (saved.participant_code === participantCode && saved.sequence_number === row.sequence_number))) database.events.push(row);
    });
    return;
  }
  await supabaseRequest("participant_result_events?on_conflict=id", {
    method: "POST", headers: { prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(row),
  });
}

export async function updateParticipant(participantCode: string, update: ResultUpdate, completed: boolean) {
  const config = getResultStorageConfig();
  if (!config) throw new ResultStorageError("STORAGE_NOT_CONFIGURED", "Result storage is not configured");
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { ...update, updated_at: now };
  if (completed) Object.assign(patch, { status: "completed", completed_at: now });
  if (config.mode === "local") {
    await (await localStore()).updateLocalDatabase(config.directory, (database) => {
      const result = database.results.find((candidate) => candidate.participant_code === participantCode);
      if (!result) throw new Error("Participant not found");
      Object.assign(result, patch);
    });
    return;
  }
  await supabaseRequest(`participant_results?participant_code=eq.${encodeURIComponent(participantCode)}`, {
    method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify(patch),
  });
}

export async function listParticipantResults(): Promise<ParticipantResultSummary[]> {
  const config = getResultStorageConfig();
  if (!config) return [];
  if (config.mode === "local") return (await (await localStore()).readLocalDatabase(config.directory)).results;
  return await readSupabasePages<ParticipantResultSummary>("participant_results?select=participant_code,locale,condition,task_id,status,consented_at,completed_at,created_at,updated_at&order=created_at.asc");
}

export async function readParticipantResult(participantCode: string): Promise<ResultDatabase> {
  const config = getResultStorageConfig();
  if (!config) return structuredClone(EMPTY_DATABASE);
  if (config.mode === "local") {
    const database = await (await localStore()).readLocalDatabase(config.directory);
    return {
      results: database.results.filter((result) => result.participant_code === participantCode),
      events: database.events.filter((event) => event.participant_code === participantCode),
    };
  }
  const code = encodeURIComponent(participantCode);
  const [results, events] = await Promise.all([
    supabaseRequest<ParticipantResultRow[]>(`participant_results?select=*&participant_code=eq.${code}&limit=1`),
    readSupabasePages<ResultEventRow>(`participant_result_events?select=*&participant_code=eq.${code}&order=sequence_number.asc`),
  ]);
  return { results, events };
}

export async function readAllResults(): Promise<ResultDatabase> {
  const config = getResultStorageConfig();
  if (!config) return structuredClone(EMPTY_DATABASE);
  if (config.mode === "local") return (await localStore()).readLocalDatabase(config.directory);
  const [results, events] = await Promise.all([
    readSupabasePages<ParticipantResultRow>("participant_results?select=*&order=created_at.asc"),
    readSupabasePages<ResultEventRow>("participant_result_events?select=*&order=server_timestamp.asc"),
  ]);
  return { results, events };
}
