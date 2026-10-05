import { Shell } from "@/web/components/Shell";
import { EtfPage } from "@/web/components/EtfPage";

export const metadata = { title: "ETF · League of Stocks" };

export default async function Etf({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ round?: string }> }) {
  const { key } = await params;
  const { round } = await searchParams;
  return (
    <Shell>
      <EtfPage teamKey={key} roundId={round} />
    </Shell>
  );
}
