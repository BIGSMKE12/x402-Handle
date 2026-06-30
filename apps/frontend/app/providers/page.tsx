import { AppShell } from "@/components/shell/AppShell";
import { MobileMenuButton } from "@/components/shell/MobileMenuButton";
import { SdkPreviewNoticeBar } from "@/components/shell/SdkPreviewNoticeBar";
import { ProviderCard } from "@/components/stellar/ProviderCard";
import { getServerDashboardMode } from "@/lib/data-mode";
import { getStellarProviders } from "@/lib/api/client";

export default async function ProvidersIndexPage() {
  const [dataMode, providers] = await Promise.all([getServerDashboardMode(), getStellarProviders()]);

  return (
    <>
      <SdkPreviewNoticeBar />
      <AppShell activeProviderId={undefined} activeRoute={undefined} dataMode={dataMode}>
          <div className="scroll" style={{ background: "var(--bg-shell)" }}>
            <div className="page-pad page-pad--wide">
              <header className="providers-page-header">
                <MobileMenuButton />
                <div className="providers-page-header__body">
                  <h1
                    className="display"
                    style={{ fontSize: 30, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}
                  >
                    API Providers — registry Stellar
                  </h1>
                  <p
                    style={{
                      maxWidth: 820,
                      color: "var(--text-2)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      margin: "8px 0 0",
                    }}
                  >
                    Catálogo on-chain (Soroban testnet) de proveedores de servicios pagados por
                    USDC. {providers.length} provider{providers.length === 1 ? "" : "s"} registrados.
                  </p>
                </div>
                <img className="mobile-brand-logo" src="/logo.png" alt="HANDLE" />
              </header>
              <div className="providers-grid">
                {providers.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>
            </div>
          </div>
      </AppShell>
    </>
  );
}
