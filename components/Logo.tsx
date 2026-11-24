import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-[15px]">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="1.5" width="18" height="21" rx="3" fill="#1a56db" />
        <rect x="7" y="7" width="10" height="1.8" rx=".9" fill="#fff" />
        <rect x="7" y="11" width="10" height="1.8" rx=".9" fill="#fff" />
        <rect x="7" y="15" width="6.5" height="1.8" rx=".9" fill="#fff" />
      </svg>
      Ajaia Docs
    </Link>
  );
}
