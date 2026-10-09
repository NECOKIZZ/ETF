import { Shell, PageHead, Container } from "@/web/components/Shell";
import { LeaguePage } from "@/web/components/LeaguePage";

export const metadata = { title: "League · Median Markets" };

export default function League() {
  return (
    <Shell>
      <PageHead label="This round" title="The league">
        Every ETF in the round, ranked by return so far. The top half wins the bottom half&rsquo;s tickets. Click an ETF to back it or buy it.
      </PageHead>
      <Container>
        <LeaguePage />
      </Container>
    </Shell>
  );
}
