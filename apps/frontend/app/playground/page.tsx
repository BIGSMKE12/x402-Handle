import { AppShell } from "@/components/shell/AppShell";
import { SdkPreviewNoticeBar } from "@/components/shell/SdkPreviewNoticeBar";
import { getServerDashboardMode } from "@/lib/data-mode";
import { PlaygroundStepper } from "./PlaygroundStepper";

export default async function PlaygroundPage() {
  const dataMode = await getServerDashboardMode();
  return (
    <>
      <SdkPreviewNoticeBar />
      <AppShell activeProviderId={undefined} activeRoute={undefined} dataMode={dataMode}>
        <div className="scroll" style={{ background: "var(--bg-shell)" }}>
          <div className="page-pad page-pad--wide">
            <header style={{ marginBottom: 24 }}>
              <h1
                className="display"
                style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}
              >
                Playground — discover → recommend → pay → consume
              </h1>
              <p style={{ color: "var(--text-2)", fontSize: 14, marginTop: 8, maxWidth: 760 }}>
                El flujo completo que ejecuta un agente: descubre providers en el registry
                Soroban, los rankea con el Trust Score, paga con x402-Stellar (USDC real en
                testnet) y consume la respuesta.
              </p>
            </header>
            <PlaygroundStepper />
          </div>
        </div>
      </AppShell>
    </>
  );
}
