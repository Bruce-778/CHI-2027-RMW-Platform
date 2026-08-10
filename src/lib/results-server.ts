import { createClient } from "@supabase/supabase-js";

export const ADMIN_COOKIE = "rmw-researcher-session";

export function getResultsStore() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function getParticipantSessionSecret() {
  return process.env.PARTICIPANT_SESSION_SECRET || null;
}

export function getResearcherAuthConfig() {
  const password = process.env.RESEARCHER_ADMIN_PASSWORD;
  const sessionSecret = process.env.RESEARCHER_SESSION_SECRET;
  if (!password || !sessionSecret) return null;
  return { password, sessionSecret };
}
