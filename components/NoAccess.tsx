import Link from "next/link";
import { Logo } from "./Logo";

export function NoAccess({ userName }: { userName?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white p-8 shadow-sm">
          <h1 className="text-lg font-semibold">Document not found</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This document doesn&apos;t exist, or it hasn&apos;t been shared with
            {userName ? <> {userName}</> : " you"}. If someone shared it with you, check you&apos;re signed in as the right
            user.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Back to documents
            </Link>
            <Link href="/login" className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium hover:bg-gray-50">
              Switch user
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
