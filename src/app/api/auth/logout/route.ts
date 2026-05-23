import { NextRequest, NextResponse } from "next/server";

import {
  AUTH_SESSION_COOKIE_NAME,
  getClearedAuthSessionCookieOptions,
} from "@/lib/auth/constants";
import { extractSessionToken, revokeSessionToken } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const token = extractSessionToken(request);
  if (token) {
    await revokeSessionToken(token);
  }

  const response = NextResponse.json({
    ok: true,
    data: { loggedOut: true },
  });
  response.cookies.set(
    AUTH_SESSION_COOKIE_NAME,
    "",
    getClearedAuthSessionCookieOptions(),
  );
  return response;
}
