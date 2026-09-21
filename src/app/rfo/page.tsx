import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { RfoPanel } from "@/components/rfo/RfoPanel";
import { getNotifyEnvStatus } from "@/lib/rfo";
import { withOrgPage } from "@/lib/auth/with-org";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RFO · Kamo",
  description:
    "Reconnaissance → Fabrication → Orchestration — Monday Brief plus margin-risk triggers.",
};

export default async function RfoPage() {
  return withOrgPage(async () => {
  const envStatus = getNotifyEnvStatus();

  return (
    <AppShell
      title="R → F → O"
      current="rfo"
      subtitle="Private recon → trusted fabric → triggered action. Monday Brief is play #1; margin-risk is the O-path."
    >
      <RfoPanel envStatus={envStatus} />
    </AppShell>
  );
  });
}
