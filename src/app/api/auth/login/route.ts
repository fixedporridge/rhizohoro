import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AUTH_SESSION_COOKIE_NAME,
  getAuthSessionCookieOptions,
} from "@/lib/auth/constants";
import { loginUserWithPassword } from "@/lib/services/auth-service";
import { isServiceError } from "@/lib/services/service-error";

const loginPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid login payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await loginUserWithPassword({
      ...parsed.data,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    const response = NextResponse.json({
      ok: true,
      data: { user: result.user },
    });
    response.cookies.set(
      AUTH_SESSION_COOKIE_NAME,
      result.sessionToken,
      getAuthSessionCookieOptions(result.sessionExpiresAt),
    );
    return response;
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
