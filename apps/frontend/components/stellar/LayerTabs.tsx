"use client";

import { useState } from "react";

export type LayerTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type LayerTabsProps = {
  tabs: LayerTab[];
  defaultTabId?: string;
};

// "Las 7 capas" del perfil de provider (TRD §7): identidad, financiero, KYB,
// trust score, uso, reputación, riesgo. Cada caller decide cuántas pestañas
// monta según qué datos tiene disponibles.
export function LayerTabs({ tabs, defaultTabId }: LayerTabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div>
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--line)",
          marginBottom: 16,
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active?.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                borderBottom: isActive ? "2px solid var(--mesh-blue)" : "2px solid transparent",
                background: "transparent",
                color: isActive ? "var(--text-1)" : "var(--text-2)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div>{active?.content}</div>
    </div>
  );
}
