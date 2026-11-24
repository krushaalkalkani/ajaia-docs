import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { publicUser } from "@/lib/documents";
import { route } from "@/lib/http";

export const GET = route(async () => {
  const user = await requireUser();
  return NextResponse.json({ user: publicUser(user) });
});

// Per-user data: never pre-render or cache.
export const dynamic = "force-dynamic";
