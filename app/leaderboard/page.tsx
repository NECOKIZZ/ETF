import { Shell, PageHead, Container } from "@/web/components/Shell";
import { Leaderboard } from "@/web/components/Leaderboard";

export const metadata = { title: "Leaderboard · Median Markets" };

export default function Page() {
  return (
    <Shell>
      <PageHead label="Season" title="Leaderboard">
        Creators and backers across every settled round, from the published settlement inputs.
      </PageHead>
      <Container>
        <Leaderboard />
      </Container>
    </Shell>
  );
}
