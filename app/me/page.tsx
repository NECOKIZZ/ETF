import { Shell, PageHead, Container } from "@/web/components/Shell";
import { MePage } from "@/web/components/MePage";

export const metadata = { title: "My entries · League of Stocks" };

export default function Me() {
  return (
    <Shell>
      <PageHead label="Portfolio" title="My entries">
        Your ETFs and tickets in recent rounds. When a round is settled, claim your payout here: it also returns a creator&rsquo;s locked stocks.
      </PageHead>
      <Container>
        <MePage />
      </Container>
    </Shell>
  );
}
