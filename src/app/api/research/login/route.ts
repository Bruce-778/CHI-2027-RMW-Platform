import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, getResearcherAuthConfig } from "@/lib/results-server";
import { createSignedToken, secretsMatch } from "@/lib/signed-token";

const loginSchema = z.object({ password: z.string().min(1).max(500) });

export async function POST(request: NextRequest) {
  const config = getResearcherAuthConfig();
  if (!config) return NextResponse.json({ error: "Researcher login is not configured" }, { status: 503 });
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success || !secretsMatch(parsed.data.password, config.password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  const token = await createSignedToken({ scope: "researcher", exp: Date.now() + 12 * 60 * 60 * 1000 }, config.sessionSecret);
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
