import { AppShell } from "@/components/AppShell";
import { ConnectionsPanel } from "@/components/settings/ConnectionsPanel";
import { listConnectionStatuses } from "@/lib/sync";
import { getNotifyEnvStatus } from "@/lib/rfo";
import { withOrgPage } from "@/lib/auth/with-org";

export const dynamic = "force-dynamic";

export default async function ConnectionsSettingsPage() {
  return withOrgPage(async (ctx) => {
    const statuses = await listConnectionStatuses(ctx.orgId);
    const notifyEnv = getNotifyEnvStatus();

    return (
      <AppShell
        title="Connections"
        subtitle="Harvest + QuickBooks Online — connect-only fabric for the Monday brief."
        current="connections"
      >
        <ConnectionsPanel
          dbAvailable={statuses.dbAvailable}
          harvest={statuses.harvest}
          qbo={statuses.qbo}
          notifyEnv={notifyEnv}
        />
        <p className="text-xs leading-relaxed text-zinc-500">
          OAuth apps: Harvest at id.getharvest.com/developers · Intuit QBO at
          developer.intuit.com. Redirect URIs must match .env.example. Tokens
          encrypted with AES-256-GCM (TOKEN_ENCRYPTION_KEY). Re-connect after
          Phase 1 if you used the old stub.
        </p>
      </AppShell>
    );
  });
}
