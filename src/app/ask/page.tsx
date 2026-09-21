import { AppShell } from "@/components/AppShell";
import { AskPanel } from "@/components/ask/AskPanel";
import { withOrgPage } from "@/lib/auth/with-org";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  return withOrgPage(async () => (
    <AppShell title="Ask Kamo" current="ask" subtitle="A question in words, executed as a constrained query over reconciled records.">
      <AskPanel />
    </AppShell>
  ));
}
