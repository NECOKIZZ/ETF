// Page frame: header, live ticker, content, footer.

import { SiteHeader, LandingHeader, AnnouncementBar } from "../../ui/components/SiteHeader";
import { SiteFooter } from "../../ui/components/SiteFooter";
import { LiveTicker } from "./LiveTicker";
import { BeginnerGuide } from "./BeginnerGuide";

/** `landing`: the info page, with a header that links to its sections and "Open app". */
export function Shell({ children, announce, landing = false }: { children: React.ReactNode; announce?: React.ReactNode; landing?: boolean }) {
  return (
    <>
      {announce && <AnnouncementBar>{announce}</AnnouncementBar>}
      {landing ? <LandingHeader /> : <SiteHeader />}
      <LiveTicker />
      <main className="min-h-[60vh]">{children}</main>
      {!landing && <BeginnerGuide />}
      <div className="mt-16">
        <SiteFooter />
      </div>
    </>
  );
}

export function PageHead({ label, title, children }: { label: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-12 md:px-6 md:pt-16">
      <div className="t-label text-muted">{label}</div>
      <h1 className="t-heading mt-3 text-[34px] md:text-[48px]">{title}</h1>
      {children && <div className="mt-4 max-w-[62ch] text-[16px] text-muted">{children}</div>}
    </div>
  );
}

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1280px] px-4 md:px-6 ${className}`}>{children}</div>;
}
