export const dynamic = "force-dynamic";
import { AppShell } from "@/components/shell/AppShell";
import { SdkPreviewNoticeBar } from "@/components/shell/SdkPreviewNoticeBar";
import { getServerDashboardMode } from "@/lib/data-mode";
import { getStatsOverview } from "@/lib/api/client";

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--line)",
        background: "var(--surface-card)",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--text-3)" }}>{label}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          fontFamily: "var(--mono)",
          marginTop: 4,
          color: accent ? "var(--signal-priority)" : "var(--text-1)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatUsdc(value: number): string {
  return `${value.toFixed(value < 1 ? 4 : 2)} USDC`;
}

export default async function StatsPage() {
  const [dataMode, stats] = await Promise.all([getServerDashboardMode(), getStatsOverview()]);
  const maxCategoryCount = Math.max(1, ...stats.categoryBreakdown.map((c) => c.providerCount));

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
                Stats — métricas globales del registry
              </h1>
              <p style={{ color: "var(--text-2)", fontSize: 14, marginTop: 8, maxWidth: 760 }}>
                Agregado en vivo desde el registry Soroban y los pagos x402 indexados en
                Postgres. Generado: {new Date(stats.generatedAt).toLocaleString("es-AR")}.
              </p>
            </header>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
                marginBottom: 32,
              }}
            >
              <StatCard label="Providers registrados" value={String(stats.providerCount)} />
              <StatCard label="Providers activos" value={String(stats.activeProviderCount)} />
              <StatCard
                label="Providers verificados (KYB)"
                value={String(stats.verifiedProviderCount)}
                accent
              />
              <StatCard label="Pagos totales" value={String(stats.paymentCountLifetime)} />
              <StatCard label="Volumen total" value={formatUsdc(stats.volumeLifetimeUsdc)} accent />
              <StatCard label="Volumen (30d)" value={formatUsdc(stats.volume30dUsdc)} />
              <StatCard label="Pagos (30d)" value={String(stats.paymentCount30d)} />
              <StatCard label="Agentes únicos (30d)" value={String(stats.uniqueAgentCount30d)} />
            </section>

            <section
              style={{
                padding: 20,
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--line)",
                background: "var(--surface-card)",
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>
                Providers por categoría
              </h2>
              {stats.categoryBreakdown.length === 0 ? (
                <p style={{ color: "var(--text-3)", fontSize: 13 }}>Sin providers todavía.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {stats.categoryBreakdown.map((c) => (
                    <div key={c.category} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 110, fontSize: 13, color: "var(--text-2)" }}>
                        {c.category}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          height: 10,
                          borderRadius: 999,
                          background: "var(--surface-muted)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${(c.providerCount / maxCategoryCount) * 100}%`,
                            height: "100%",
                            background: "var(--mesh-blue)",
                          }}
                        />
                      </div>
                      <div style={{ width: 24, fontSize: 13, fontFamily: "var(--mono)", textAlign: "right" }}>
                        {c.providerCount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </AppShell>
    </>
  );
}
