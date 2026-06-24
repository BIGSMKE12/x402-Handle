import {
  type AeoDiscovery,
  type AeoDiscoveryEndpoint,
  type FacilitatorDiscoveryRow,
  getAeoPayShText,
} from "@/lib/geo-spec/discovery";
import { networkLabels } from "@/lib/geo-spec/network-label";
import { formatAtomic, shortAddr } from "@/lib/format";
import type { GeoSpec, MppRegistryEndpoint } from "@/lib/geo-spec/source";

type Props = {
  providerId: string;
  spec: GeoSpec | null;
  discovery: AeoDiscovery | null;
};

export function GeoSpecScreen({ providerId, spec, discovery }: Props) {
  return (
    <div style={{ background: "var(--bg-shell)", minHeight: "100%" }}>
      <div style={{ padding: "32px 40px 80px", maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Agentic Engine Optimization
          </div>
          <h1
            className="display"
            style={{ fontSize: 30, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}
          >
            AEO{spec?.title ? ` · ${spec.title}` : ""}
          </h1>
        </header>

        {!spec ? (
          <EmptyState providerId={providerId} />
        ) : (
          <>
            <ProviderDetailsSection spec={spec} />
            <X402DiscoverySection discovery={discovery} />
            <MppOfficialRegistrySection spec={spec} />
            <PayShSection spec={spec} />
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ providerId }: { providerId: string }) {
  return (
    <article
      className="card"
      style={{ padding: 22, background: "var(--surface-card)", color: "var(--text-2)" }}
    >
      <p style={{ margin: 0 }}>
        No GEO data available for <code className="mono">{providerId}</code>. This provider may not
        be sourced from the Pay.sh catalog, or its catalog row could not be matched.
      </p>
    </article>
  );
}

// Top-level section divider for catalog-source groupings (Pay.sh / MPP).
// Visually heavier than `SectionHeading` so the page reads as two parent
// groups with sub-content beneath each.
function CatalogSectionHeader({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header
      style={{
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: "2px solid var(--text-1, #111)",
      }}
    >
      <div
        style={{
          display: "inline-block",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-1)",
          background: "var(--surface-muted, #f0f1f4)",
          padding: "3px 10px",
          borderRadius: 999,
          marginBottom: 10,
        }}
      >
        {badge}
      </div>
      <h2 className="display" style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>
        {title}
      </h2>
      {subtitle ? (
        <p style={{ color: "var(--text-mute)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

function ProviderDetailsSection({ spec }: { spec: GeoSpec }) {
  return (
    <section style={{ marginTop: 6 }}>
      <SectionHeading eyebrow="Provider details" title="Catalog metadata" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <MetaTile label="Service URL" value={spec.serviceUrl} mono />
        <MetaTile label="Category" value={spec.category} />
        <MetaTile
          label="Endpoints"
          value={spec.endpointCount !== null ? String(spec.endpointCount) : null}
          mono
        />
        <MetaTile
          label="Price range (USD)"
          value={
            spec.priceRangeUsd
              ? spec.priceRangeUsd.min === spec.priceRangeUsd.max
                ? `$${formatPrice(spec.priceRangeUsd.min)}`
                : `$${formatPrice(spec.priceRangeUsd.min)} – $${formatPrice(spec.priceRangeUsd.max)}`
              : null
          }
          mono
        />
      </div>
    </section>
  );
}

function X402DiscoverySection({ discovery }: { discovery: AeoDiscovery | null }) {
  if (!discovery) return null;

  return (
    <section style={{ marginTop: 36 }}>
      <CatalogSectionHeader badge="x402" title="x402 Discovery" subtitle={discovery.description} />

      <SectionHeading eyebrow="Coverage" title="Discovery footprint" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <MetaTile
          label="Registered facilitators"
          value={`${discovery.coverage.registered} / ${discovery.coverage.total}`}
          mono
        />
        <MetaTile label="Endpoints (unique)" value={String(discovery.totalEndpoints)} mono />
        <MetaTile
          label="Verification pass"
          value={`${Math.round(discovery.verificationPassRate * 100)}%`}
          mono
        />
      </div>

      <AeoChecklist items={discovery.checklist} />
      <FacilitatorDiscoveryTable facilitators={discovery.facilitators} />
      <X402EndpointCoverageTable endpoints={discovery.endpoints} note={discovery.endpointsNote} />
      <p style={{ color: "var(--text-mute)", fontSize: 12, margin: "12px 0 0" }}>
        Aggregated from CDP, Dexter, and PayAI discovery registries (snapshot {discovery.snapshotDate}).
      </p>
    </section>
  );
}

function AeoChecklist({ items }: { items: AeoDiscovery["checklist"] }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHeading eyebrow="AEO health" title="Discovery readiness" />
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((item) => (
          <article
            key={item.label}
            className="card"
            style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px" }}
          >
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                width: 20,
                height: 20,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                color: "#fff",
                background: item.ok ? "var(--teal, #2C7A7B)" : "var(--warn, #B45309)",
              }}
            >
              {item.ok ? "✓" : "!"}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-mute)", lineHeight: 1.5 }}>
                {item.hint}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function facilitatorQuality(row: FacilitatorDiscoveryRow): string {
  if (row.verificationTotal) {
    const quality = row.avgQualityScore !== undefined ? ` · q${row.avgQualityScore.toFixed(1)}` : "";
    return `verified ${row.verificationPass ?? 0}/${row.verificationTotal}${quality}`;
  }
  if (row.avgQualityScore !== undefined) return `q${row.avgQualityScore.toFixed(1)}`;
  return "—";
}

function FacilitatorDiscoveryTable({
  facilitators,
}: {
  facilitators: FacilitatorDiscoveryRow[];
}) {
  return (
    <div>
      <SectionHeading eyebrow="By facilitator" title="Registry footprint" />
      <article className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={tableHeadRowStyle}>
              <th style={thStyle}>Facilitator</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Endpoints</th>
              <th style={thStyle}>Networks</th>
              <th style={thStyle}>Scheme</th>
              <th style={thStyle}>Price (USD)</th>
              <th style={thStyle}>Quality</th>
              <th style={thStyle}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {facilitators.map((row) =>
              row.registered ? (
                <tr key={row.facilitator} style={tableRowStyle}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{row.facilitator}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }} className="mono">
                    {row.endpoints}
                  </td>
                  <td style={tdStyle}>{networkLabels(row.networks).join(", ") || "—"}</td>
                  <td style={tdStyle}>{row.schemes.join(", ") || "—"}</td>
                  <td style={tdStyle} className="mono">
                    {row.priceUsd
                      ? row.priceUsd.min === row.priceUsd.max
                        ? `$${formatPrice(row.priceUsd.min)}`
                        : `$${formatPrice(row.priceUsd.min)} – $${formatPrice(row.priceUsd.max)}`
                      : "—"}
                  </td>
                  <td style={tdStyle}>{facilitatorQuality(row)}</td>
                  <td style={tdStyle} className="mono">
                    {row.lastUpdated ?? "—"}
                  </td>
                </tr>
              ) : (
                <tr key={row.facilitator} style={tableRowStyle}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{row.facilitator}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-mute)" }}>—</td>
                  <td style={{ ...tdStyle, color: "var(--text-mute)" }}>—</td>
                  <td style={{ ...tdStyle, color: "var(--text-mute)" }}>—</td>
                  <td style={{ ...tdStyle, color: "var(--text-mute)" }}>—</td>
                  <td style={{ ...tdStyle, color: "var(--warn, #B45309)", fontWeight: 600 }}>
                    Not registered · improvement area
                  </td>
                  <td style={{ ...tdStyle, color: "var(--text-mute)" }}>—</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </article>
    </div>
  );
}

function FacilitatorCoverageChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10.5,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 999,
        marginRight: 5,
        border: "1px solid",
        borderColor: active ? "var(--mesh-blue, #2F5D9A)" : "var(--border-subtle, #e5e7eb)",
        background: active ? "var(--mesh-blue-soft, rgba(47,93,154,0.10))" : "transparent",
        color: active ? "var(--mesh-blue, #2F5D9A)" : "var(--text-mute)",
        opacity: active ? 1 : 0.55,
      }}
    >
      {label}
    </span>
  );
}

function X402EndpointCoverageTable({
  endpoints,
  note,
}: {
  endpoints: AeoDiscoveryEndpoint[];
  note?: string;
}) {
  const rows = [...endpoints].sort((a, b) => (b.qualityScore ?? -1) - (a.qualityScore ?? -1));

  return (
    <section style={{ marginTop: 24 }}>
      <SectionHeading
        eyebrow="By endpoint"
        title="Per-endpoint coverage"
        note={
          note ??
          "Which facilitator registries list each path, with its price plus CDP's rolling 30-day call volume and unique payer count."
        }
      />
      <article className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={tableHeadRowStyle}>
              <th style={thStyle}>Endpoint</th>
              <th style={thStyle}>Facilitators</th>
              <th style={thStyle}>Networks</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Price (USD)</th>
              <th style={{ ...thStyle, textAlign: "right" }}>30d calls (CDP)</th>
              <th style={{ ...thStyle, textAlign: "right" }}>30d unique payers (CDP)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((endpoint) => (
              <tr key={endpoint.path} style={tableRowStyle}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>{endpoint.name}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--text-mute)" }}>
                    {endpoint.path}
                  </div>
                </td>
                <td style={tdStyle}>
                  <FacilitatorCoverageChip label="CDP" active={endpoint.onCdp} />
                  <FacilitatorCoverageChip label="Dexter" active={endpoint.onDexter} />
                  <FacilitatorCoverageChip label="PayAI" active={endpoint.onPayai} />
                </td>
                <td style={tdStyle}>{networkLabels(endpoint.networks).join(", ")}</td>
                <td className="mono" style={{ ...tdStyle, textAlign: "right" }}>
                  ${formatPrice(endpoint.priceUsd)}
                </td>
                <td className="mono" style={{ ...tdStyle, textAlign: "right" }}>
                  {endpoint.cdpL30DaysTotalCalls !== undefined
                    ? endpoint.cdpL30DaysTotalCalls.toLocaleString()
                    : "—"}
                </td>
                <td className="mono" style={{ ...tdStyle, textAlign: "right" }}>
                  {endpoint.cdpL30DaysUniquePayers !== undefined
                    ? endpoint.cdpL30DaysUniquePayers.toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

function PayShSection({ spec }: { spec: GeoSpec }) {
  // Curated AEO text overrides the baked atlas description/use case when present.
  const payShText = getAeoPayShText(spec);
  const description = payShText?.description ?? spec.description;
  const useCase = payShText?.useCase ?? spec.useCase;
  const hasDescription = !!(description || useCase);
  const hasOffers = spec.offers.length > 0;
  const hasObservedEndpoints = spec.observedEndpoints.length > 0;
  // Hide the entire section when the active provider has no Pay.sh data at all.
  if (!hasDescription && !hasOffers && !hasObservedEndpoints) return null;

  return (
    <section style={{ marginTop: 36 }}>
      <CatalogSectionHeader
        badge="Pay.sh"
        title="Pay.sh"
        subtitle="Description, supported chains, and observed API paths from the Pay.sh atlas."
      />
      {hasDescription ? (
        <div style={{ marginBottom: 24 }}>
          <SectionHeading eyebrow="Description" title="What this provider tells AI agents" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 14,
            }}
          >
            {description ? <DefinitionCard label="Description" body={description} /> : null}
            {useCase ? <DefinitionCard label="Use case" body={useCase} /> : null}
          </div>
        </div>
      ) : null}
      {hasOffers ? <PayShOffersTable spec={spec} /> : null}
      {hasObservedEndpoints ? <PayShObservedEndpointsTable spec={spec} /> : null}
    </section>
  );
}

function MppOfficialRegistrySection({ spec }: { spec: GeoSpec }) {
  const hasDescription = !!spec.mppDescription;
  const hasMppEndpoints = spec.mppEndpoints.length > 0;
  if (!hasDescription && !hasMppEndpoints) return null;

  return (
    <section style={{ marginTop: 36 }}>
      <CatalogSectionHeader
        badge="MPP official"
        title="MPP Official Registry"
        subtitle="Description and per-path pricing as published in the MPP services registry (mpp.dev)."
      />
      {hasDescription ? (
        <div style={{ marginBottom: 24 }}>
          <SectionHeading eyebrow="Description" title="Registry description" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <DefinitionCard label="Description" body={spec.mppDescription} />
          </div>
        </div>
      ) : null}
      {hasMppEndpoints ? <MppEndpointsTable spec={spec} /> : null}
    </section>
  );
}

function PayShOffersTable({ spec }: { spec: GeoSpec }) {
  return (
    <section style={{ marginTop: 24 }}>
      <SectionHeading
        eyebrow="Supported chains, assets, and probe price"
        title="Pay.sh offers"
        note="Each row is one (chain × asset × payTo) combination Pay.sh published. Probe price is the per-call USD amount Pay.sh observed from a probe; individual endpoint prices are not separately published."
      />
      <article className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={tableHeadRowStyle}>
              <th style={thStyle}>Protocol</th>
              <th style={thStyle}>Chain</th>
              <th style={thStyle}>Asset</th>
              <th style={thStyle}>payTo</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Probe price (USD)</th>
            </tr>
          </thead>
          <tbody>
            {spec.offers.map((o, i) => (
              <tr key={`${o.protocol}-${o.chain}-${o.asset}-${o.payTo}-${i}`} style={tableRowStyle}>
                <td style={tdStyle}>{o.protocol}</td>
                <td style={tdStyle}>{o.chain}</td>
                <td style={tdStyle}>{o.asset}</td>
                <td style={{ ...tdStyle, fontFamily: "var(--mono)", fontSize: 12 }}>
                  {shortAddr(o.payTo)}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                  }}
                >
                  ${formatPrice(o.probePriceUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

function PayShObservedEndpointsTable({ spec }: { spec: GeoSpec }) {
  return (
    <section style={{ marginTop: 24 }}>
      <SectionHeading
        eyebrow="API paths observed"
        title="Endpoints called against this provider"
        note="Per-endpoint USD price is not separately published in the Pay.sh catalog — only the per-offer probe price above. Observed spend is the total paid amount seen in the current fixture, formatted as USDC where applicable, not a posted price."
      />
      <article className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: 90 }} />
            <col />
            <col style={{ width: 140 }} />
            <col />
            <col style={{ width: 90 }} />
            <col style={{ width: 140 }} />
          </colgroup>
          <thead>
            <tr style={tableHeadRowStyle}>
              <th style={thStyle}>Resource (path)</th>
              <th style={thStyle}>Method</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Chains</th>
              <th style={thStyle}>Assets</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Tx count</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Observed spend (USDC)</th>
            </tr>
          </thead>
          <tbody>
            {spec.observedEndpoints.map((e) => (
              <tr key={e.resource} style={tableRowStyle}>
                <td
                  style={{
                    ...tdStyle,
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    wordBreak: "break-all",
                  }}
                  title={e.resource}
                >
                  {pathOf(e.resource)}
                </td>
                <td style={{ ...tdStyle, fontFamily: "var(--mono)", fontSize: 12 }}>
                  {e.method ?? "—"}
                </td>
                <td style={{ ...tdStyle, overflowWrap: "anywhere" }}>{e.description ?? "—"}</td>
                <td style={{ ...tdStyle, overflowWrap: "anywhere" }}>
                  {networkLabels(e.networks).join(", ") || "—"}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    overflowWrap: "anywhere",
                    wordBreak: "break-all",
                  }}
                  title={e.assets.join(", ")}
                >
                  {e.assets.join(", ") || "—"}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--mono)" }}>
                  {e.transactionCount.toLocaleString()}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--mono)" }}>
                  {formatAtomic(e.totalAmountAtomic)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {eyebrow}
      </div>
      <h2 className="display" style={{ fontSize: 20, fontWeight: 650, margin: "0 0 6px" }}>
        {title}
      </h2>
      {note ? (
        <p style={{ color: "var(--text-mute)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

function DefinitionCard({ label, body }: { label: string; body: string | null }) {
  return (
    <article className="card" style={{ padding: 18, background: "var(--surface-card)" }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {label}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.6,
          color: body ? "var(--text-1)" : "var(--text-mute)",
        }}
      >
        {body || "—"}
      </p>
    </article>
  );
}

function MetaTile({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="card" style={{ padding: "12px 14px", background: "#fff" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div
        className={mono ? "mono" : undefined}
        style={{
          fontSize: 14,
          fontWeight: 600,
          wordBreak: "break-all",
          color: value ? "var(--text-1)" : "var(--text-mute)",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function pathOf(resource: string): string {
  try {
    const u = new URL(resource);
    return u.pathname + (u.search || "");
  } catch {
    return resource;
  }
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value === 0) return "0";
  if (value < 0.01) return value.toFixed(4);
  if (value < 1) return value.toFixed(3);
  if (value < 100) return value.toFixed(2);
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const tableHeadRowStyle: React.CSSProperties = {
  background: "var(--surface-muted, #f6f7f9)",
  borderBottom: "1px solid var(--border-subtle, #e5e7eb)",
};

const tableRowStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--border-subtle, #eef0f3)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--text-mute)",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  color: "var(--text-1)",
};

// Render the registry-declared paid endpoints exposed by MPP services. Mirrors
// the layout of `PayShObservedEndpointsTable` so the user can compare
// path-by-path price tables across both catalog sources.
function MppEndpointsTable({ spec }: { spec: GeoSpec }) {
  const sessionPresent = spec.mppEndpoints.some((e) => e.intent === "session");
  const dynamicPresent = spec.mppEndpoints.some((e) => e.dynamic === true);
  const noteParts: string[] = [
    "Prices are published in the MPP services registry. `charge` = per-call fixed price.",
  ];
  if (sessionPresent) {
    noteParts.push(
      "`session` = per-session billing; the listed unit (e.g. per request) is the billable increment when known.",
    );
  }
  if (dynamicPresent) {
    noteParts.push(
      "`dynamic` rows quote no fixed price — the runtime price depends on input/output (e.g. tokens, MB).",
    );
  }

  return (
    <section style={{ marginTop: 24 }}>
      <SectionHeading
        eyebrow="API paths · MPP registry"
        title="Endpoints declared by the MPP services registry"
        note={noteParts.join(" ")}
      />
      <article className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: 90 }} />
            <col />
            <col style={{ width: 110 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 140 }} />
          </colgroup>
          <thead>
            <tr style={tableHeadRowStyle}>
              <th style={thStyle}>Resource (path)</th>
              <th style={thStyle}>Method</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Intent</th>
              <th style={thStyle}>Unit</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {spec.mppEndpoints.map((e, i) => (
              <tr key={`${e.method ?? "GET"}-${e.resource}-${i}`} style={tableRowStyle}>
                <td
                  style={{
                    ...tdStyle,
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    wordBreak: "break-all",
                  }}
                  title={e.resource}
                >
                  {pathOf(e.resource)}
                </td>
                <td style={{ ...tdStyle, fontFamily: "var(--mono)", fontSize: 12 }}>
                  {e.method ?? "—"}
                </td>
                <td style={{ ...tdStyle, overflowWrap: "anywhere" }}>{e.description ?? "—"}</td>
                <td style={tdStyle}>{e.intent ?? "—"}</td>
                <td style={tdStyle}>{formatUnit(e)}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--mono)" }}>
                  {formatRegistryPrice(e)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

function formatUnit(e: MppRegistryEndpoint): string {
  if (e.intent === "session") {
    return e.unitType ? `per ${e.unitType}` : "per session";
  }
  if (e.intent === "charge") {
    return e.unitType ? `per ${e.unitType}` : "per call";
  }
  return e.unitType ? `per ${e.unitType}` : "—";
}

function formatRegistryPrice(e: MppRegistryEndpoint): string {
  if (e.dynamic) return "dynamic";
  if (!e.amountAtomic) return "—";
  if (e.decimals === undefined) return `${e.amountAtomic} atomic`;
  // Use parseFloat after manual scaling so trailing zeros collapse cleanly.
  const denom = 10 ** e.decimals;
  const value = Number(e.amountAtomic) / denom;
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "$0.00";
  if (value < 0.01) {
    // For sub-cent prices show 4 decimals so $0.0001 is readable.
    return `$${value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}`;
  }
  return `$${value.toFixed(2)}`;
}
