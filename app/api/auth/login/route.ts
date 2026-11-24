import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { publicUser } from "@/lib/documents";
import { notFound, readJson, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

/** Mock sign-in: pick a seeded user by email. No password by design (see ARCHITECTURE.md). */
export const POST = route(async (req) => {
  const { email } = loginSchema.parse(await readJson(req));
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw notFound("No account with that email. Use one of the seeded test users.");
  setSessionCookie(user.id);
  return NextResponse.json({ user: publicUser(user) });
});
