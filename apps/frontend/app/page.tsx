import { getStatsOverview, getStellarHealth } from "@/lib/api/client";
import { resolveRootRedirectPath } from "./root-redirect";
import { LandingClient } from "./LandingClient";

export default async function LandingPage() {
  const appHref = resolveRootRedirectPath();
  const [stats, health] = await Promise.all([
    getStatsOverview().catch(() => null),
    getStellarHealth().catch(() => null),
  ]);

  return <LandingClient appHref={appHref} stats={stats} health={health} />;
}
