import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { isServiceError } from "@/lib/services/service-error";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    return NextResponse.json({
      ok: true,
      data: { user },
    });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: error.code,
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
