import { db } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAuthSession } from "@/lib/auth/session";
import { ServiceError } from "@/lib/services/service-error";

export interface RegisterUserInput {
  email: string;
  password: string;
  displayName: string;
  locale?: string;
  timezone?: string;
  studyGoalMinutes?: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface LoginUserInput {
  email: string;
  password: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuthServiceResult {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: "LEARNER" | "ADMIN";
  };
  sessionToken: string;
  sessionExpiresAt: Date;
  defaultWorkspaceId?: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerUserWithPassword(
  input: RegisterUserInput,
): Promise<AuthServiceResult> {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();
  if (!email) {
    throw new ServiceError("Email is required.", {
      statusCode: 400,
      code: "INVALID_EMAIL",
    });
  }

  if (!displayName) {
    throw new ServiceError("Display name is required.", {
      statusCode: 400,
      code: "INVALID_DISPLAY_NAME",
    });
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    throw new ServiceError("An account with this email already exists.", {
      statusCode: 409,
      code: "EMAIL_ALREADY_EXISTS",
    });
  }

  const passwordHash = await hashPassword(input.password);
  const created = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        locale: input.locale ?? "en",
        timezone: input.timezone ?? "UTC",
        studyGoalMinutes: input.studyGoalMinutes ?? 20,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
      },
    });

    const workspace = await tx.studyWorkspace.create({
      data: {
        ownerId: user.id,
        name: "My Study Vault",
      },
      select: { id: true },
    });

    return { user, workspace };
  });

  const session = await createAuthSession({
    userId: created.user.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    user: {
      id: created.user.id,
      email: created.user.email,
      displayName: created.user.displayName,
      role: created.user.role,
    },
    sessionToken: session.token,
    sessionExpiresAt: session.expiresAt,
    defaultWorkspaceId: created.workspace.id,
  };
}

export async function loginUserWithPassword(
  input: LoginUserInput,
): Promise<AuthServiceResult> {
  const email = normalizeEmail(input.email);
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    throw new ServiceError("Invalid email or password.", {
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });
  }

  const validPassword = await verifyPassword(input.password, user.passwordHash);
  if (!validPassword) {
    throw new ServiceError("Invalid email or password.", {
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });
  }

  const session = await createAuthSession({
    userId: user.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
    sessionToken: session.token,
    sessionExpiresAt: session.expiresAt,
  };
}
