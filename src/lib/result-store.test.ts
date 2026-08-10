import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSupabaseHeaders, readAllResults, ResultStorageError, supabaseRequest } from "./result-store";
import { resolveResultStorageConfig, type SupabaseStorageConfig } from "./results-server";

function legacyKey(role: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode({ role })}.signature`;
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

describe("Supabase result storage configuration", () => {
  it("sends a new secret key only as apikey", () => {
    const resolved = resolveResultStorageConfig({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_test" });
    expect(resolved.issue).toBeNull();
    const headers = buildSupabaseHeaders(resolved.config as SupabaseStorageConfig);
    expect(headers.get("apikey")).toBe("sb_secret_test");
    expect(headers.has("authorization")).toBe(false);
  });

  it("adds Bearer only for a legacy service_role JWT", () => {
    const secret = legacyKey("service_role");
    const resolved = resolveResultStorageConfig({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: secret });
    const headers = buildSupabaseHeaders(resolved.config as SupabaseStorageConfig);
    expect(headers.get("apikey")).toBe(secret);
    expect(headers.get("authorization")).toBe(`Bearer ${secret}`);
  });

  it.each([
    [{ SUPABASE_URL: "https://example.supabase.co" }, "partial"],
    [{ SUPABASE_SECRET_KEY: "sb_secret_test" }, "partial"],
    [{ SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "sb_publishable_test" }, "invalid_key_type"],
    [{ SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: legacyKey("anon") }, "invalid_key_type"],
  ] as const)("rejects unsafe or partial configuration", (environment, issue) => {
    expect(resolveResultStorageConfig(environment).issue).toBe(issue);
  });
});

describe("Supabase result storage requests", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("RMW_LOCAL_RESULTS_DIR", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    [401, { message: "Invalid JWT" }, "INVALID_CREDENTIALS"],
    [403, { code: "42501", message: "permission denied" }, "PERMISSION_DENIED"],
    [404, { code: "PGRST205", message: "table missing" }, "SCHEMA_MISSING"],
    [409, { code: "23505", message: "duplicate key" }, "PARTICIPANT_CONFLICT"],
  ] as const)("maps PostgREST %s responses", async (status, body, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(body, status)));
    await expect(supabaseRequest("participant_results?limit=0")).rejects.toMatchObject<ResultStorageError>({ code });
  });

  it("maps timeouts without leaking the upstream response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")));
    await expect(supabaseRequest("participant_results?limit=0")).rejects.toMatchObject<ResultStorageError>({ code: "UPSTREAM_TIMEOUT" });
  });

  it("paginates full exports beyond the PostgREST 1000 row default", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const range = new Headers(init?.headers).get("range");
      const start = Number(range?.split("-")[0] || 0);
      const isEvents = url.includes("participant_result_events");
      const count = start === 0 ? 1000 : 1;
      const rows = Array.from({ length: count }, (_, index) => isEvents
        ? { id: `${start + index}`, participant_code: "RMW-00000000" }
        : { participant_code: `RMW-${String(start + index).padStart(8, "0")}` });
      return jsonResponse(rows);
    });
    vi.stubGlobal("fetch", fetchMock);
    const database = await readAllResults();
    expect(database.results).toHaveLength(1001);
    expect(database.events).toHaveLength(1001);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
