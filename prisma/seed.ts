import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USERS = [
  { email: "alice@ajaia.test", name: "Alice Anderson" },
  { email: "bob@ajaia.test", name: "Bob Brown" },
  { email: "carol@ajaia.test", name: "Carol Chen" },
];

const SAMPLE_DOC_ID = "seed-welcome-doc";

const t = (text: string, marks?: string[]) => ({
  type: "text",
  text,
  ...(marks ? { marks: marks.map((type) => ({ type })) } : {}),
});
const p = (...content: object[]) => ({ type: "paragraph", content });
const h = (level: number, text: string) => ({ type: "heading", attrs: { level }, content: [t(text)] });
const li = (...content: object[]) => ({ type: "listItem", content: [p(...content)] });

const sampleContent = {
  type: "doc",
  content: [
    h(1, "Q3 Launch Plan"),
    p(
      t("This is a sample document owned by "),
      t("Alice", ["bold"]),
      t(" and shared with "),
      t("Bob", ["bold"]),
      t(" as an editor. Formatting like "),
      t("italic", ["italic"]),
      t(" and "),
      t("underline", ["underline"]),
      t(" is saved and restored when you reopen it."),
    ),
    h(2, "Goals"),
    {
      type: "bulletList",
      content: [li(t("Ship the editor MVP")), li(t("Onboard three pilot teams")), li(t("Collect feedback on sharing"))],
    },
    h(2, "Next steps"),
    {
      type: "orderedList",
      attrs: { start: 1 },
      content: [li(t("Finalize scope")), li(t("Write the launch email")), li(t("Schedule the demo"))],
    },
  ],
};

async function main() {
  const users = await Promise.all(
    USERS.map((u) =>
      prisma.user.upsert({ where: { email: u.email }, update: { name: u.name }, create: u }),
    ),
  );
  const [alice, bob] = users;

  await prisma.document.upsert({
    where: { id: SAMPLE_DOC_ID },
    update: {},
    create: { id: SAMPLE_DOC_ID, title: "Q3 Launch Plan", content: sampleContent, ownerId: alice.id },
  });

  await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: SAMPLE_DOC_ID, userId: bob.id } },
    update: { role: "editor" },
    create: { documentId: SAMPLE_DOC_ID, userId: bob.id, role: "editor" },
  });

  console.log(`Seeded ${users.length} users and 1 sample document (owned by Alice, shared with Bob as editor).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
