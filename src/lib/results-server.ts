export const ADMIN_COOKIE = "rmw-researcher-session";

export type SupabaseStorageConfig = {
  mode: "supabase";
  url: string;
  secret: string;
  authorization?: string;
};

export type LocalStorageConfig = { mode: "local"; directory: string };
export type ResultStorageConfig = SupabaseStorageConfig | LocalStorageConfig;
export type ResultStorageConfigCode = "missing" | "partial" | "invalid_url" | "invalid_key_type";

export type ResultStorageResolution = {
  config: ResultStorageConfig | null;
  issue: ResultStorageConfigCode | null;
};

export function getParticipantSessionSecret() {
  return process.env.PARTICIPANT_SESSION_SECRET || null;
}

export function getResearcherAuthConfig() {
  const password = process.env.RESEARCHER_ADMIN_PASSWORD;
  const sessionSecret = process.env.RESEARCHER_SESSION_SECRET;
  if (!password || !sessionSecret) return null;
  return { password, sessionSecret };
}

function legacyJwtRole(secret: string) {
  const segments = secret.split(".");
  if (segments.length !== 3) return null;
  try {
    const payload = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const parsed = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as { role?: unknown };
    return typeof parsed.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}

export function resolveResultStorageConfig(env: NodeJS.ProcessEnv = process.env): ResultStorageResolution {
  const rawUrl = env.SUPABASE_URL?.trim() || "";
  const secret = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (rawUrl || secret) {
    if (!rawUrl || !secret) return { config: null, issue: "partial" };
    let url: URL;
    try {
      url = new URL(rawUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported protocol");
    } catch {
      return { config: null, issue: "invalid_url" };
    }

    if (secret.startsWith("sb_publishable_")) return { config: null, issue: "invalid_key_type" };
    if (secret.startsWith("sb_secret_")) {
      return { config: { mode: "supabase", url: url.toString().replace(/\/$/, ""), secret }, issue: null };
    }

    const role = legacyJwtRole(secret);
    if (role !== "service_role") return { config: null, issue: "invalid_key_type" };
    return {
      config: { mode: "supabase", url: url.toString().replace(/\/$/, ""), secret, authorization: `Bearer ${secret}` },
      issue: null,
    };
  }

  const directory = env.RMW_LOCAL_RESULTS_DIR?.trim();
  if (directory && env.NODE_ENV !== "production") return { config: { mode: "local", directory }, issue: null };
  return { config: null, issue: "missing" };
}

export function getResultStorageConfig() {
  return resolveResultStorageConfig().config;
}

export function getResultStorageConfigurationIssue() {
  return resolveResultStorageConfig().issue;
}
