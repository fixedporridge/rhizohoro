import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "rhizohoro-web",
    phase: "foundation-scaffold",
    timestamp: new Date().toISOString(),
  });
}
