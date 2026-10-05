import Link from "next/link";
import { Logo } from "@/ui/components/Logo";

// Temporary home until the landing page is built (docs/UI.md §4.1).
export default function Home() {
  return (
    <main className="grid min-h-screen place-items-center p-8 text-center">
      <div>
        <Logo className="justify-center" />
        <p className="mt-6 text-muted">The landing page is next. For now, see the UI kit.</p>
        <Link href="/ui" className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-5 font-medium text-bg">
          Open the UI kit →
        </Link>
      </div>
    </main>
  );
}
