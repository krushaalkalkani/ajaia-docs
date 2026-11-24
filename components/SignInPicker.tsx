"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "./Avatar";
import { api, errorMessage } from "@/lib/client";

type U = { id: string; name: string; email: string };

export function SignInPicker({ users, currentUserId }: { users: U[]; currentUserId?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function signIn(email: string) {
    setPending(email);
    try {
      const { user } = await api<{ user: U }>("/api/auth/login", { method: "POST", json: { email } });
      toast.success(`Signed in as ${user.name}`);
      router.push("/");
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
      setPending(null);
    }
  }

  if (users.length === 0) {
    return (
      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
        No users found. Run <code className="font-mono">npm run db:seed</code> to create the test accounts.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {users.map((u) => (
        <li key={u.id}>
          <button
            onClick={() => signIn(u.email)}
            disabled={pending !== null}
            className="flex w-full items-center gap-3 rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-60"
          >
            <Avatar name={u.name} size={36} />
            <span className="flex-1">
              <span className="block font-medium">{u.name}</span>
              <span className="block text-sm text-[var(--muted)]">{u.email}</span>
            </span>
            {u.id === currentUserId && <span className="text-xs text-[var(--muted)]">current</span>}
            <span className="text-sm font-medium text-[var(--accent)]">
              {pending === u.email ? "Signing in…" : "Sign in →"}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
