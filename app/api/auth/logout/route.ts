import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { route } from "@/lib/http";

export const POST = route(async () => {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
});
