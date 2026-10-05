import Link from "next/link";
import { Logo } from "./Logo";
import { Button } from "./Button";

const links = [
  { href: "/league", label: "League" },
  { href: "/create", label: "Create" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/agents", label: "Agents" },
  { href: "/rules", label: "Rules" },
];

export function AnnouncementBar({ children }: { children: React.ReactNode }) {
  return <div className="bg-brand-ink py-2.5 text-center text-[13px] text-brand-paper/80">{children}</div>;
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-6">
        <Link href="/" aria-label="League of Stocks home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-[14px] md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink/80 transition hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] text-muted lg:inline-flex">
            <span className="size-2 rounded-full bg-brand-mint" /> BNB Chain
          </span>
          <Button size="sm">Connect</Button>
        </div>
      </div>
    </header>
  );
}
