"use client";

import { useState } from "react";
import { ScoreRing } from "@/components/stellar/ScoreRing";
import { TxLink } from "@/components/stellar/TxLink";
import {
  getStellarProviders,
  recommendStellarProviders,
  runPlaygroundPayment,
  type PlaygroundPayResult,
  type RankedStellarProvider,
} from "@/lib/api/client";
import type { StellarProvider } from "contracts";

type StepId = "discover" | "recommend" | "pay" | "consume";

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "discover", label: "1. Discover" },
  { id: "recommend", label: "2. Recommend" },
  { id: "pay", label: "3. Pay" },
  { id: "consume", label: "4. Consume" },
];

function Stepper({ current }: { current: StepId }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
      {STEPS.map((step, i) => (
        <div
          key={step.id}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--line)",
            background: i <= currentIndex ? "var(--surface-selected)" : "var(--surface-card)",
            color: i <= currentIndex ? "var(--text-1)" : "var(--text-3)",
            fontSize: 13,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {step.label}
        </div>
      ))}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--line)",
        background: "var(--surface-card)",
        minHeight: 160,
      }}
    >
      {children}
    </div>
  );
}

export function PlaygroundStepper() {
  const [step, setStep] = useState<StepId>("discover");
  const [providers, setProviders] = useState<StellarProvider[] | null>(null);
  const [ranked, setRanked] = useState<RankedStellarProvider[] | null>(null);
  const [selected, setSelected] = useState<RankedStellarProvider | null>(null);
  const [payResult, setPayResult] = useState<PlaygroundPayResult | null>(null);
  const [budget, setBudget] = useState("0.01");
  const [category, setCategory] = useState("fx");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runDiscover() {
    setLoading(true);
    setError(null);
    try {
      const list = await getStellarProviders();
      setProviders(list);
      setStep("recommend");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function runRecommend() {
    setLoading(true);
    setError(null);
    try {
      const result = await recommendStellarProviders({
        category: category || undefined,
        maxPriceUsdc: budget ? Number(budget) : undefined,
      });
      setRanked(result);
      setSelected(result[0] ?? null);
      setStep("pay");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function runPay() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setPayResult(null);
    try {
      const result = await runPlaygroundPayment(selected.provider.id);
      setPayResult(result);
      if (result.ok) setStep("consume");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("discover");
    setProviders(null);
    setRanked(null);
    setSelected(null);
    setPayResult(null);
    setError(null);
  }

  return (
    <div>
      <Stepper current={step} />

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: "var(--radius)",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {step === "discover" && (
        <Panel>
          <p style={{ color: "var(--text-2)", fontSize: 13, marginBottom: 16 }}>
            Lee el catálogo de providers directo del registry Soroban (vía el indexer en
            Postgres).
          </p>
          <button type="button" onClick={runDiscover} disabled={loading} style={primaryButtonStyle}>
            {loading ? "Buscando…" : "Descubrir providers"}
          </button>
        </Panel>
      )}

      {step === "recommend" && providers && (
        <Panel>
          <p style={{ color: "var(--text-2)", fontSize: 13, marginBottom: 12 }}>
            {providers.length} providers encontrados. Elegí categoría y presupuesto para rankear
            (Trust Score + precio + categoría — fórmula determinística, no IA).
          </p>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <label style={fieldLabelStyle}>
              Categoría
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={inputStyle}
                placeholder="fx, data, fintech…"
              />
            </label>
            <label style={fieldLabelStyle}>
              Presupuesto (USDC/call)
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
          <button type="button" onClick={runRecommend} disabled={loading} style={primaryButtonStyle}>
            {loading ? "Rankeando…" : "Recomendar"}
          </button>
        </Panel>
      )}

      {step === "pay" && ranked && (
        <Panel>
          <p style={{ color: "var(--text-2)", fontSize: 13, marginBottom: 12 }}>
            Ranking determinístico. Elegí un provider para pagar y consumir.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {ranked.map((r) => (
              <button
                key={r.provider.id}
                type="button"
                onClick={() => setSelected(r)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "var(--radius)",
                  border:
                    selected?.provider.id === r.provider.id
                      ? "1px solid var(--mesh-blue)"
                      : "1px solid var(--line)",
                  background: "var(--surface-card)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.provider.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                    match {(r.matchScore * 100).toFixed(0)}% · {r.reasons.join(", ") || "sin señales"}
                  </div>
                </div>
                <ScoreRing score={r.trustScore} size={40} />
              </button>
            ))}
          </div>
          <button type="button" onClick={runPay} disabled={loading || !selected} style={primaryButtonStyle}>
            {loading ? "Pagando…" : `Pagar y consumir (${selected?.provider.priceUsdc} USDC)`}
          </button>
          {payResult && !payResult.ok && (
            <p style={{ color: "var(--signal-attention)", fontSize: 13, marginTop: 12 }}>
              {payResult.message}
            </p>
          )}
        </Panel>
      )}

      {step === "consume" && payResult?.ok && (
        <Panel>
          <p style={{ color: "var(--signal-priority)", fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
            Pago confirmado en {payResult.elapsedMs}ms.
          </p>
          <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 8, fontSize: 13 }}>
            <dt style={{ color: "var(--text-3)" }}>Tx hash</dt>
            <dd>
              <TxLink hash={payResult.txHash} />
            </dd>
            <dt style={{ color: "var(--text-3)" }}>Monto</dt>
            <dd>{payResult.amountUsdc} USDC</dd>
            <dt style={{ color: "var(--text-3)" }}>Memo</dt>
            <dd style={{ fontFamily: "var(--mono)" }}>{payResult.memo}</dd>
            <dt style={{ color: "var(--text-3)" }}>Respuesta del provider</dt>
            <dd>
              <pre
                style={{
                  fontSize: 12,
                  background: "var(--surface-muted)",
                  padding: 10,
                  borderRadius: "var(--radius)",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(payResult.data, null, 2)}
              </pre>
            </dd>
          </dl>
          <button type="button" onClick={reset} style={{ ...primaryButtonStyle, marginTop: 16 }}>
            Correr de nuevo
          </button>
        </Panel>
      )}
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: "var(--radius)",
  background: "var(--mesh-blue)",
  color: "white",
  fontWeight: 600,
  fontSize: 14,
  border: "none",
  cursor: "pointer",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  color: "var(--text-2)",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--bg-shell)",
  color: "var(--text-1)",
  fontSize: 13,
};
