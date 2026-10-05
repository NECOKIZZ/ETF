// Page frame: header, live ticker, content, footer.

import { SiteHeader, AnnouncementBar } from "../../ui/components/SiteHeader";
import { SiteFooter } from "../../ui/components/SiteFooter";
import { LiveTicker } from "./LiveTicker";

export function Shell({ children, announce }: { children: React.ReactNode; announce?: React.ReactNode }) {
  return (
    <>
      {announce && <AnnouncementBar>{announce}</AnnouncementBar>}
      <SiteHeader />
      <LiveTicker />
      <main className="min-h-[60vh]">{children}</main>
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
