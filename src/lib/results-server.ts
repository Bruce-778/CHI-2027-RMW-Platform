export const ADMIN_COOKIE = "rmw-researcher-session";

export function getParticipantSessionSecret() {
  return process.env.PARTICIPANT_SESSION_SECRET || null;
}

export function getResearcherAuthConfig() {
  const password = process.env.RESEARCHER_ADMIN_PASSWORD;
  const sessionSecret = process.env.RESEARCHER_SESSION_SECRET;
  if (!password || !sessionSecret) return null;
  return { password, sessionSecret };
}

export function getResultStorageConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (supabaseUrl && supabaseSecret) {
    return { mode: "supabase" as const, url: supabaseUrl.replace(/\/$/, ""), secret: supabaseSecret };
  }
  const directory = process.env.RMW_LOCAL_RESULTS_DIR;
  if (directory && process.env.NODE_ENV !== "production") return { mode: "local" as const, directory };
  return null;
}
