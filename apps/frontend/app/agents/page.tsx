import { AppShell } from "@/components/shell/AppShell";
import { SdkPreviewNoticeBar } from "@/components/shell/SdkPreviewNoticeBar";
import { getServerDashboardMode } from "@/lib/data-mode";
import { CopyableSnippet } from "./CopyableSnippet";

const INSTALL_SNIPPET = `bun add @flovia/agent-sdk`;

const QUICKSTART_SNIPPET = `import { Flovia } from "@flovia/agent-sdk";

const flovia = new Flovia({
  secret: process.env.AGENT_SECRET!, // Stellar seed (S...) del agente
  network: "testnet",
  bffUrl: "https://bff.flovia.dev", // o tu BFF local
});

// Descubre, recomienda, paga y consume — todo en una llamada.
const result = await flovia.discoverAndCall({
  need: "fx",
  maxPrice: 0.01,
  payload: { pair: "EUR/USD" },
});

console.log(result.data);          // respuesta del provider
console.log(result.payment.txHash); // tx Stellar que pagó la call`;

const STEP_BY_STEP_SNIPPET = `// Si preferís control fino sobre cada paso:
const providers = await flovia.discover();
const ranked = await flovia.recommend({ category: "fx", maxPriceUsdc: 0.01 });
const top = ranked[0];

const { data, txHash } = await flovia.pay(top.provider, { pair: "EUR/USD" });`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>{title}</h2>
      {children}
    </section>
  );
}

export default async function AgentsPage() {
  const dataMode = await getServerDashboardMode();

  return (
    <>
      <SdkPreviewNoticeBar />
      <AppShell activeProviderId={undefined} activeRoute={undefined} dataMode={dataMode}>
        <div className="scroll" style={{ background: "var(--bg-shell)" }}>
          <div className="page-pad page-pad--wide" style={{ maxWidth: 760 }}>
            <header style={{ marginBottom: 32 }}>
              <h1
                className="display"
                style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}
              >
                Para desarrolladores de agentes
              </h1>
              <p style={{ color: "var(--text-2)", fontSize: 14, marginTop: 8 }}>
                <code style={{ fontFamily: "var(--mono)" }}>@flovia/agent-sdk</code> descubre
                providers en el registry Stellar, los rankea con el Trust Score
                (determinístico, no IA) y paga + consume con x402-Stellar — firmando con
                el seed de tu propio agente, sin pasar el secret por el BFF.
              </p>
            </header>

            <Section title="1. Instalar">
              <CopyableSnippet code={INSTALL_SNIPPET} language="sh" />
            </Section>

            <Section title="2. Quickstart — discoverAndCall">
              <p style={{ color: "var(--text-2)", fontSize: 13, marginBottom: 12 }}>
                Una sola llamada hace discovery, recomendación, construcción y firma del pago,
                submit a Horizon, y consumo del recurso.
              </p>
              <CopyableSnippet code={QUICKSTART_SNIPPET} />
            </Section>

            <Section title="3. Paso a paso (control fino)">
              <p style={{ color: "var(--text-2)", fontSize: 13, marginBottom: 12 }}>
                Si tu agente necesita inspeccionar el ranking antes de pagar, o elegir un
                provider distinto al top, usá los métodos individuales.
              </p>
              <CopyableSnippet code={STEP_BY_STEP_SNIPPET} />
            </Section>

            <Section title="API">
              <div
                style={{
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--line)",
                  background: "var(--surface-card)",
                  padding: "4px 20px",
                }}
              >
                {[
                  ["new Flovia(opts)", "{ secret, network?, bffUrl?, maxAmountUsdc? }"],
                  ["flovia.discover()", "Promise<StellarProvider[]> — catálogo completo"],
                  [
                    "flovia.recommend(opts)",
                    "Promise<RankedStellarProvider[]> — { category?, maxPriceUsdc? }",
                  ],
                  ["flovia.pay(provider, payload?)", "Promise<{ txHash, amountUsdc, memo, data, elapsedMs }>"],
                  [
                    "flovia.discoverAndCall(opts)",
                    "Promise<DiscoverAndCallResult> — { need, maxPrice?, kybRequired?, payload? }",
                  ],
                ].map(([sig, desc]) => (
                  <div
                    key={sig}
                    style={{
                      padding: "14px 0",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>
                      {sig}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Probalo sin escribir código">
              <p style={{ color: "var(--text-2)", fontSize: 13 }}>
                El{" "}
                <a href="/playground" style={{ color: "var(--mesh-blue)" }}>
                  playground
                </a>{" "}
                corre el mismo flujo (discover → recommend → pay → consume) desde el
                navegador, con una transacción real en testnet.
              </p>
            </Section>
          </div>
        </div>
      </AppShell>
    </>
  );
}
