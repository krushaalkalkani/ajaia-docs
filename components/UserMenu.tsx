"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar } from "./Avatar";
import { api, errorMessage } from "@/lib/client";

export function UserMenu({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();

  async function signOut() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right leading-tight sm:block">
        <div className="text-sm font-medium">{user.name}</div>
        <div className="text-xs text-[var(--muted)]">{user.email}</div>
      </div>
      <Avatar name={user.name} size={32} />
      <div className="flex items-center gap-1 text-sm">
        <Link href="/login" className="rounded-md px-2 py-1 text-[var(--muted)] hover:bg-gray-100 hover:text-[var(--ink)]">
          Switch user
        </Link>
        <button onClick={signOut} className="rounded-md px-2 py-1 text-[var(--muted)] hover:bg-gray-100 hover:text-[var(--ink)]">
          Sign out
        </button>
      </div>
    </div>
  );
}
