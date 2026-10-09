import Link from "next/link";
import { Logo } from "./Logo";
import { ChainChip, ConnectButton } from "../../web/components/ConnectButton";

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

function MobileNav() {
  return (
    <nav className="flex gap-5 overflow-x-auto px-4 pb-3 text-[14px] md:hidden">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="shrink-0 text-ink/80">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

// Landing page: links to its own sections only. The app is one click away.
const sections = [
  { href: "#how", label: "How it works" },
  { href: "#round", label: "A round" },
  { href: "#back", label: "Back a creator" },
  { href: "#stocks", label: "Stocks" },
  { href: "#agents", label: "Agents" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-6">
        <Link href="/" aria-label="Median Markets home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-[14px] lg:flex">
          {sections.map((l) => (
            <a key={l.href} href={l.href} className="text-ink/80 transition hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/rules" className="hidden h-9 items-center rounded-full bg-ink px-4 text-[13px] font-medium text-bg transition hover:opacity-90 sm:inline-flex">
            Read the rules
          </Link>
          <Link href="/league" className="inline-flex h-9 items-center gap-1 rounded-full bg-up-bg px-4 text-[13px] font-medium text-up transition hover:brightness-95">
            Open app <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
      <nav className="flex gap-5 overflow-x-auto px-4 pb-3 text-[14px] lg:hidden">
        {sections.map((l) => (
          <a key={l.href} href={l.href} className="shrink-0 text-ink/80">
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-6">
        <Link href="/" aria-label="Median Markets home">
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
          <ChainChip />
          <ConnectButton />
        </div>
      </div>
      <MobileNav />
    </header>
  );
}
