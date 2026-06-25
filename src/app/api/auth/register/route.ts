import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AUTH_SESSION_COOKIE_NAME,
  getAuthSessionCookieOptions,
} from "@/lib/auth/constants";
import { registerUserWithPassword } from "@/lib/services/auth-service";
import { isServiceError } from "@/lib/services/service-error";

const registerPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(80),
  locale: z.string().min(2).max(12).optional(),
  timezone: z.string().min(2).max(64).optional(),
  studyGoalMinutes: z.number().int().min(5).max(240).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registerPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid register payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await registerUserWithPassword({
      ...parsed.data,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    const response = NextResponse.json(
      {
        ok: true,
        data: {
          user: result.user,
          defaultWorkspaceId: result.defaultWorkspaceId,
        },
      },
      { status: 201 },
    );
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
    console.error("Register error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
