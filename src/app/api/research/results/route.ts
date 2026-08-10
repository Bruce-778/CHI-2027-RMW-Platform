import { NextRequest, NextResponse } from "next/server";
import { readAllResults, resultStorageMode } from "@/lib/result-store";
import { ADMIN_COOKIE, getResearcherAuthConfig } from "@/lib/results-server";
import { verifySignedToken } from "@/lib/signed-token";

async function isAuthorized(request: NextRequest) {
  const config = getResearcherAuthConfig();
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!config || !token) return false;
  const payload = await verifySignedToken(token, config.sessionSecret);
  return payload?.scope === "researcher";
}

export async function GET(request: NextRequest) {
  if (!getResearcherAuthConfig() || !resultStorageMode()) {
    return NextResponse.json({ mode: "unavailable", error: "Research result storage is not configured" }, { status: 503 });
  }
  if (!await isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const database = await readAllResults();
    if (request.nextUrl.searchParams.get("export") === "1") {
      return NextResponse.json({
        schemaVersion: "rmw-research-results-v2",
        storageMode: resultStorageMode(),
        exportedAt: new Date().toISOString(),
        results: database.results,
        events: database.events,
      });
    }

    const participantCode = request.nextUrl.searchParams.get("participantCode");
    if (participantCode) {
      const result = database.results.find((candidate) => candidate.participant_code === participantCode);
      if (!result) return NextResponse.json({ error: "Participant not found" }, { status: 404 });
      const events = database.events
        .filter((event) => event.participant_code === participantCode)
        .sort((left, right) => left.sequence_number - right.sequence_number);
      return NextResponse.json({ mode: resultStorageMode(), result, events });
    }

    const results = database.results
      .map(({ participant_code, locale, condition, task_id, status, consented_at, completed_at, created_at, updated_at }) => ({
        participant_code, locale, condition, task_id, status, consented_at, completed_at, created_at, updated_at,
      }))
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    return NextResponse.json({ mode: resultStorageMode(), results });
  } catch (error) {
    console.error("Research result read failed", { storageMode: resultStorageMode(), error });
    return NextResponse.json({ error: "Could not load research results" }, { status: 502 });
  }
}
