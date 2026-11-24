import { Logo } from "@/components/Logo";
import { SignInPicker } from "@/components/SignInPicker";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const [users, current] = await Promise.all([
    prisma.user.findMany({ orderBy: { email: "asc" }, select: { id: true, name: true, email: true } }),
    getCurrentUser(),
  ]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Sign in as…</h1>
          <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
            Authentication is mocked for this demo. Pick a test account — switch any time to see sharing from the
            other side.
          </p>
          <SignInPicker users={users} currentUserId={current?.id} />
        </div>
      </div>
    </main>
  );
}
