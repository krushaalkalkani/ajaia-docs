"use client";

import type { Editor } from "@tiptap/react";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl+";

function Btn({
  onClick,
  active,
  disabled,
  label,
  shortcut,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  shortcut?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Keep focus (and the selection) in the editor while clicking.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm transition disabled:opacity-35 ${
        active ? "bg-blue-100 text-blue-800" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-[var(--line)]" aria-hidden />;

const ListIcon = ({ ordered }: { ordered?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M10 6h10M10 12h10M10 18h10" strokeLinecap="round" />
    {ordered ? (
      <text x="2" y="9" fontSize="7" fill="currentColor" stroke="none" fontWeight="700">
        1
      </text>
    ) : (
      <circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none" />
    )}
    {ordered ? (
      <text x="2" y="21" fontSize="7" fill="currentColor" stroke="none" fontWeight="700">
        2
      </text>
    ) : (
      <>
        <circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none" />
      </>
    )}
  </svg>
);

const UndoIcon = ({ redo }: { redo?: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden style={redo ? { transform: "scaleX(-1)" } : undefined}>
    <path d="M9 14L4 9l5-5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" strokeLinecap="round" />
  </svg>
);

export function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return <div className="h-10" />;
  const chain = () => editor.chain().focus();

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5">
      <Btn label="Undo" shortcut={`${mod}Z`} onClick={() => chain().undo().run()} disabled={!editor.can().undo()}>
        <UndoIcon />
      </Btn>
      <Btn label="Redo" shortcut={`${mod}Shift+Z`} onClick={() => chain().redo().run()} disabled={!editor.can().redo()}>
        <UndoIcon redo />
      </Btn>
      <Sep />
      <Btn label="Normal text" active={editor.isActive("paragraph")} onClick={() => chain().setParagraph().run()}>
        <span className="px-0.5 text-[13px]">Text</span>
      </Btn>
      <Btn label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => chain().toggleHeading({ level: 1 }).run()}>
        <span className="font-semibold">H1</span>
      </Btn>
      <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <span className="font-semibold">H2</span>
      </Btn>
      <Sep />
      <Btn label="Bold" shortcut={`${mod}B`} active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
        <span className="font-bold">B</span>
      </Btn>
      <Btn label="Italic" shortcut={`${mod}I`} active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
        <span className="font-serif italic">I</span>
      </Btn>
      <Btn label="Underline" shortcut={`${mod}U`} active={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()}>
        <span className="underline underline-offset-2">U</span>
      </Btn>
      <Sep />
      <Btn label="Bulleted list" shortcut={`${mod}Shift+8`} active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
        <ListIcon />
      </Btn>
      <Btn label="Numbered list" shortcut={`${mod}Shift+7`} active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
        <ListIcon ordered />
      </Btn>
    </div>
  );
}
