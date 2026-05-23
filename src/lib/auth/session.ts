import { createHash, randomBytes } from "node:crypto";

import { NextRequest } from "next/server";

import {
  AUTH_SESSION_COOKIE_NAME,
  AUTH_SESSION_TTL_DAYS,
} from "@/lib/auth/constants";
import { db } from "@/lib/db/client";
import { ServiceError } from "@/lib/services/service-error";

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  role: "LEARNER" | "ADMIN";
}

export interface CreatedAuthSession {
  token: string;
  expiresAt: Date;
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function buildSessionExpiryDate(): Date {
  return new Date(Date.now() + AUTH_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function createAuthSession(params: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<CreatedAuthSession> {
  const token = randomBytes(48).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = buildSessionExpiryDate();

  await db.authSession.create({
    data: {
      userId: params.userId,
      tokenHash,
      expiresAt,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });

  return { token, expiresAt };
}

function readBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token) {
    return null;
  }

  if (scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

export function extractSessionToken(request: NextRequest): string | null {
  const bearerToken = readBearerToken(request);
  if (bearerToken) {
    return bearerToken;
  }

  const cookieToken = request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value;
  return cookieToken ?? null;
}

export async function resolveAuthenticatedUser(
  request: NextRequest,
): Promise<AuthenticatedUser | null> {
  const token = extractSessionToken(request);
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const session = await db.authSession.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  await db.authSession.update({
    where: { id: session.id },
    data: { lastSeenAt: now },
  });

  return {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    role: session.user.role,
  };
}

export async function requireAuthenticatedUser(
  request: NextRequest,
): Promise<AuthenticatedUser> {
  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    throw new ServiceError("Authentication required.", {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }

  return user;
}

export async function revokeSessionToken(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);
  await db.authSession.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
