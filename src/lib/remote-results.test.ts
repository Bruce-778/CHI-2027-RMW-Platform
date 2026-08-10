import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("remote participant persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", new MemoryStorage());
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    [409, "participant_conflict"],
    [503, "unavailable"],
  ] as const)("returns a discriminated start failure for HTTP %s", async (status, expected) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, status)));
    const { startRemoteStudySession } = await import("./remote-results");
    const result = await startRemoteStudySession({ participantCode: "RMW-1234ABCD", locale: "zh-CN", condition: "rmw", taskId: "waste" });
    expect(result.status).toBe(expected);
  });

  it("distinguishes a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    const { startRemoteStudySession } = await import("./remote-results");
    const result = await startRemoteStudySession({ participantCode: "RMW-1234ABCD", locale: "zh-CN", condition: "rmw", taskId: "waste" });
    expect(result.status).toBe("network_error");
  });

  it("waits for completion persistence and reports saved", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({ token: "participant-token" }))
      .mockResolvedValueOnce(response({ mode: "completed" })));
    const { completeRemoteStudy, startRemoteStudySession } = await import("./remote-results");
    expect((await startRemoteStudySession({ participantCode: "RMW-1234ABCD", locale: "zh-CN", condition: "rmw", taskId: "waste" })).status).toBe("ready");
    expect((await completeRemoteStudy({ memo: "memo", chat: [], problemState: null })).status).toBe("saved");
  });

  it("keeps a failed completion in the browser outbox", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({ token: "participant-token" }))
      .mockResolvedValueOnce(response({ code: "RESULT_STORAGE_BACKEND_ERROR" }, 503)));
    const { completeRemoteStudy, startRemoteStudySession } = await import("./remote-results");
    await startRemoteStudySession({ participantCode: "RMW-1234ABCD", locale: "zh-CN", condition: "rmw", taskId: "waste" });
    expect((await completeRemoteStudy({ memo: "memo", chat: [], problemState: null })).status).toBe("queued");
    expect(localStorage.length).toBeGreaterThan(0);
  });
});
