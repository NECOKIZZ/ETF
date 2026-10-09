import { Shell, PageHead, Container } from "@/web/components/Shell";
import { RoundResults } from "@/web/components/RoundResults";

export const metadata = { title: "Round results · Median Markets" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Shell>
      <PageHead label="Results" title={`Round ${id}`}>
        Final ranking and a settlement you can check yourself.
      </PageHead>
      <Container>
        <RoundResults id={id} />
      </Container>
    </Shell>
  );
}
