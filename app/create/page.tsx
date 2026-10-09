import { Shell, PageHead, Container } from "@/web/components/Shell";
import { CreateFlow } from "@/web/components/CreateFlow";

export const metadata = { title: "Create an ETF · Median Markets" };

export default function Create() {
  return (
    <Shell>
      <PageHead label="Create" title="Build your ETF">
        Pick at least 3 stocks (add up to 20% in BNB, BTC or ETH if you like), set the weights, buy them, then lock the basket with a $5 ticket. The basket comes back to you when the round ends.
      </PageHead>
      <Container>
        <CreateFlow />
      </Container>
    </Shell>
  );
}
