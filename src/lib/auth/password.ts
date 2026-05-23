import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { ServiceError } from "@/lib/services/service-error";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

function assertPasswordStrength(password: string) {
  if (password.length < 8) {
    throw new ServiceError("Password must be at least 8 characters long.", {
      statusCode: 400,
      code: "WEAK_PASSWORD",
    });
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordStrength(password);
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [salt, storedKeyHex] = passwordHash.split(":");
  if (!salt || !storedKeyHex) {
    return false;
  }

  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(storedKeyHex, "hex");
  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}
