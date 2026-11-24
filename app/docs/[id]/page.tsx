import { redirect } from "next/navigation";
import { NoAccess } from "@/components/NoAccess";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { loadDocumentForUser } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { publicUser, serializeDocument } from "@/lib/documents";
import { HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let loaded;
  try {
    loaded = await loadDocumentForUser(params.id, user.id, "read");
  } catch (e) {
    if (e instanceof HttpError) return <NoAccess userName={user.name} />;
    throw e;
  }
  const { doc, role } = loaded;

  // Only the owner sees the share dialog, so only they need the user directory.
  const users =
    role === "owner"
      ? await prisma.user.findMany({ orderBy: { email: "asc" }, select: { id: true, name: true, email: true } })
      : [];

  return <DocumentEditor doc={serializeDocument(doc, role)} user={publicUser(user)} users={users} />;
}
