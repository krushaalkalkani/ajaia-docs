/**
 * Mocked authentication. There are no passwords: the sign-in page lets you pick
 * one of the seeded users, and we store their id in an httpOnly cookie.
 * The cookie value is HMAC-signed so it can't be edited client-side to
 * impersonate another user id.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { unauthorized } from "./http";

export const SESSION_COOKIE = "ajaia_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  return process.env.AUTH_SECRET || "dev-only-secret-change-me";
}

function hmac(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function signSession(userId: string): string {
  return `${userId}.${hmac(userId)}`;
}

export function verifySession(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(hmac(userId));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return userId;
}

export function setSessionCookie(userId: string) {
  cookies().set(SESSION_COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const userId = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

/** For API routes: returns the signed-in user or throws 401. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}
