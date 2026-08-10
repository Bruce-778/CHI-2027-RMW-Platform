import { NextRequest, NextResponse } from "next/server";
import { listParticipantResults, readAllResults, readParticipantResult, ResultStorageError, resultStorageMode } from "@/lib/result-store";
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
  if (!getResearcherAuthConfig()) return NextResponse.json({ mode: "unavailable", code: "RESEARCHER_AUTH_UNAVAILABLE" }, { status: 503 });
  if (!await isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!resultStorageMode()) return NextResponse.json({ mode: "unavailable", code: "RESULT_STORAGE_UNAVAILABLE" }, { status: 503 });

  try {
    if (request.nextUrl.searchParams.get("export") === "1") {
      const database = await readAllResults();
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
      const database = await readParticipantResult(participantCode);
      const result = database.results[0];
      if (!result) return NextResponse.json({ error: "Participant not found" }, { status: 404 });
      const events = database.events
        .filter((event) => event.participant_code === participantCode)
        .sort((left, right) => left.sequence_number - right.sequence_number);
      return NextResponse.json({ mode: resultStorageMode(), result, events });
    }

    const results = (await listParticipantResults())
      .map(({ participant_code, locale, condition, task_id, status, consented_at, completed_at, created_at, updated_at }) => ({
        participant_code, locale, condition, task_id, status, consented_at, completed_at, created_at, updated_at,
      }))
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    return NextResponse.json({ mode: resultStorageMode(), results });
  } catch (error) {
    const storageError = error instanceof ResultStorageError ? error : null;
    console.error("Research result read failed", {
      storageMode: resultStorageMode(),
      code: storageError?.code || "UNEXPECTED_ERROR",
      details: storageError?.details,
      error: storageError ? undefined : error,
    });
    return NextResponse.json({ mode: "unavailable", code: "RESULT_STORAGE_BACKEND_ERROR" }, { status: 502 });
  }
}
