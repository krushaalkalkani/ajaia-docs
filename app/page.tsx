import { redirect } from "next/navigation";
import { DashboardActions } from "@/components/DashboardActions";
import { DocumentList } from "@/components/DocumentList";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { getCurrentUser } from "@/lib/auth";
import { listDocumentsForUser } from "@/lib/documents";
import { SUPPORTED_TYPES_LABEL } from "@/lib/upload-constants";

export const dynamic = "force-dynamic";

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
        <span className="rounded-full bg-gray-200/70 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-gray-700">
          {count}
        </span>
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] bg-white/60 px-4 py-8 text-center text-sm text-[var(--muted)]">
      {children}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { owned, shared } = await listDocumentsForUser(user.id);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Logo />
          <UserMenu user={user} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Create a document, or upload {SUPPORTED_TYPES_LABEL} to turn a file into an editable doc.
            </p>
          </div>
          <DashboardActions />
        </div>

        <Section title="My documents" count={owned.length}>
          {owned.length ? (
            <DocumentList items={owned} kind="owned" />
          ) : (
            <Empty>You haven&apos;t created any documents yet. Click “New document” to start.</Empty>
          )}
        </Section>

        <Section title="Shared with me" count={shared.length}>
          {shared.length ? (
            <DocumentList items={shared} kind="shared" />
          ) : (
            <Empty>Nothing has been shared with you yet. Documents others share with you will appear here.</Empty>
          )}
        </Section>
      </main>
    </>
  );
}
