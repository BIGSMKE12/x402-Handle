"use client";

import { useState } from "react";

export function CopyableSnippet({ code, language = "ts" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API no disponible (http no seguro, permisos) — fallback silencioso
    }
  }

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--line)",
        background: "var(--surface-muted)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={copy}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          padding: "4px 10px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: "var(--radius)",
          border: "1px solid var(--line)",
          background: "var(--surface-card)",
          color: "var(--text-2)",
          cursor: "pointer",
        }}
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
      <pre
        style={{
          margin: 0,
          padding: "16px 18px",
          fontSize: 13,
          lineHeight: 1.6,
          overflowX: "auto",
          fontFamily: "var(--mono)",
        }}
        data-language={language}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
