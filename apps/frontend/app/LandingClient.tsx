"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { StatsOverview } from "contracts";
import type { StellarHealth } from "@/lib/api/client";
import { LANDING_COPY, type Lang } from "./landing-copy";

const LANG_STORAGE_KEY = "handle:landing-lang";

const INTEGRATE_SNIPPET = `import { Flovia } from "@flovia/agent-sdk";

const handle = new Flovia({
  secret: process.env.AGENT_SECRET!,
  network: "testnet",
});

// Discover + rank providers from the Soroban registry
const ranked = await handle.recommend({
  category: "fx",
  maxPriceUsdc: 0.01,
});

// Pay the top-ranked provider over x402-Stellar
const { data, txHash } = await handle.pay(ranked[0].provider, {
  pair: "EUR/USD",
});`;

function formatUsdc(value: number, lang: Lang) {
  return `${value.toLocaleString(lang === "es" ? "es-AR" : "en-US", { maximumFractionDigits: 3 })} USDC`;
}

type LandingClientProps = {
  appHref: string;
  stats: StatsOverview | null;
  health: StellarHealth | null;
};

export function LandingClient({ appHref, stats, health }: LandingClientProps) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "en" || stored === "es") setLang(stored);
  }, []);

  const setLanguage = (next: Lang) => {
    setLang(next);
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
  };

  const t = LANDING_COPY[lang];
  const metricEntries: Array<{ key: keyof typeof t.metricLabels; value: string; accent?: boolean }> = stats
    ? [
        { key: "providerCount", value: String(stats.providerCount) },
        { key: "activeProviderCount", value: String(stats.activeProviderCount) },
        { key: "verifiedProviderCount", value: String(stats.verifiedProviderCount) },
        { key: "paymentCountLifetime", value: String(stats.paymentCountLifetime) },
        { key: "volumeLifetimeUsdc", value: formatUsdc(stats.volumeLifetimeUsdc, lang), accent: true },
        { key: "volume30dUsdc", value: formatUsdc(stats.volume30dUsdc, lang) },
      ]
    : (["providerCount", "activeProviderCount", "verifiedProviderCount", "paymentCountLifetime", "volumeLifetimeUsdc", "volume30dUsdc"] as const).map(
        (key) => ({ key, value: "—", accent: key === "volumeLifetimeUsdc" }),
      );

  return (
    <div className="landing">
      <header id="top" className="landing-header">
        <a href="#top" className="landing-brand">
          <Image src="/logo.png" alt="HANDLE" width={28} height={28} />
          <span>HANDLE</span>
        </a>
        <nav className="landing-nav">
          {t.nav.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="landing-lang-switch" role="group" aria-label="Language">
            <button
              type="button"
              className={lang === "en" ? "active" : ""}
              onClick={() => setLanguage("en")}
              aria-pressed={lang === "en"}
            >
              EN
            </button>
            <button
              type="button"
              className={lang === "es" ? "active" : ""}
              onClick={() => setLanguage("es")}
              aria-pressed={lang === "es"}
            >
              ES
            </button>
          </div>
          <Link href={appHref} className="landing-btn landing-btn--primary">
            {t.launchApp}
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-badge">{t.badge}</div>
        <h1>{t.heroTitle}</h1>
        <p>{t.heroBody}</p>
        <div className="landing-hero-actions">
          <Link href="/playground" className="landing-btn landing-btn--primary">
            {t.tryPlayground}
          </Link>
          <Link href={appHref} className="landing-btn landing-btn--ghost">
            {t.viewProviders}
          </Link>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-eyebrow">{t.problemEyebrow}</div>
        <h2>{t.problemTitle}</h2>
        <div className="landing-grid" style={{ marginTop: 40 }}>
          {t.problems.map((p) => (
            <div key={p.index} className="landing-card">
              <div className="landing-card-index">{p.index}</div>
              <div className="landing-card-title">{p.title}</div>
              <p className="landing-card-body">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="landing-section">
        <div className="landing-eyebrow">{t.pipelineEyebrow}</div>
        <h2>{t.pipelineTitle}</h2>
        <div className="landing-grid" style={{ marginTop: 40 }}>
          {t.pipeline.map((p) => (
            <div key={p.step} className="landing-card">
              <div className="landing-step-badge">{p.step}</div>
              <div className="landing-card-title">{p.title}</div>
              <p className="landing-card-body">{p.body}</p>
              <div className="landing-tag-row">
                {p.tags.map((tag) => (
                  <span key={tag} className="landing-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="metrics" className="landing-section">
        <div className="landing-eyebrow">{t.metricsEyebrow}</div>
        <h2>{t.metricsTitle}</h2>
        <p className="landing-metrics-status">
          {health?.status === "ok" ? t.systemOk(Boolean(health.registryContractId)) : t.systemUnavailable}
        </p>
        <div className="landing-grid">
          {metricEntries.map((m) => (
            <div key={m.key} className={`landing-metric-card${m.accent ? " landing-metric-card--accent" : ""}`}>
              <div className="landing-metric-label">{t.metricLabels[m.key]}</div>
              <div className={`landing-metric-value${m.accent ? " landing-metric-value--accent" : ""}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
        {stats && stats.categoryBreakdown.length > 0 && (
          <div className="landing-category-panel">
            <div className="landing-eyebrow" style={{ textAlign: "left", marginBottom: 16 }}>
              {t.categoryBreakdown}
            </div>
            {stats.categoryBreakdown.map((c) => {
              const pct = stats.providerCount > 0 ? (c.providerCount / stats.providerCount) * 100 : 0;
              return (
                <div key={c.category} className="landing-category-row">
                  <span className="landing-category-name">{c.category}</span>
                  <div className="landing-category-track">
                    <div className="landing-category-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="landing-category-count">{c.providerCount}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="landing-link-row">
          <Link href="/stats" className="landing-link">
            {t.viewStats}
          </Link>
        </div>
      </section>

      <section id="integrate" className="landing-section landing-section--narrow">
        <div className="landing-eyebrow">{t.integrateEyebrow}</div>
        <h2>{t.integrateTitle}</h2>
        <p className="landing-code-intro">
          <code>@flovia/agent-sdk</code>
          {t.integrateBody}
        </p>
        <pre className="landing-pre">
          <code>{INTEGRATE_SNIPPET}</code>
        </pre>
        <div className="landing-link-row">
          <Link href="/agents" className="landing-link">
            {t.viewSdkDocs}
          </Link>
        </div>
      </section>

      <section id="faq" className="landing-section landing-section--tight">
        <div className="landing-eyebrow">{t.faqEyebrow}</div>
        <h2>{t.faqTitle}</h2>
        <div className="landing-faq-list" style={{ marginTop: 32 }}>
          {t.faq.map((item) => (
            <details key={item.q} className="landing-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <span>{t.footer}</span>
        <a href="#top">{t.backToTop}</a>
      </footer>
    </div>
  );
}
