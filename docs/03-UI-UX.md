# UI / UX — Flovia Stellar

## 1. Principios de diseño

1. **Datos por encima de decoración.** Cada pantalla revela información on-chain real.
2. **Auditabilidad visible.** Cada número clave tiene su fuente clicable (link a Horizon, a contract, a explorer).
3. **Velocidad demo.** Cargas progresivas, esqueletos, nada de spinners eternos.
4. **Una sola intención por pantalla.** El usuario nunca se pregunta "¿y ahora qué hago?".

## 2. Sistema de diseño (propuesta inicial)

### 2.1 Paleta
```
Primary:    #0A0F1E   (deep space — fondo principal)
Surface:    #131A2C   (cards)
Border:     #1F2940
Accent:     #4FFFB0   (Stellar-ish verde-cyan, para CTAs)
Accent-2:   #7B9CFF   (azul links/data)
Warning:    #FFB454
Danger:     #FF5C7A
Text:       #E8ECF8
Text-muted: #8993B0
```

### 2.2 Tipografía
- **Display / titulares:** Inter Tight 600
- **Body:** Inter 400/500
- **Mono (addresses, hashes):** JetBrains Mono 500

### 2.3 Espaciado
Escala 4px: `4, 8, 12, 16, 24, 32, 48, 64`.

### 2.4 Componentes base (shadcn/ui)
- `Card`, `Badge`, `Button`, `Input`, `Tabs`, `Table`, `Tooltip`, `Sheet` (side drawer), `Skeleton`.
- Custom: `ScoreRing` (anillo radial 0-100), `AddressChip` (G... acortada con copy), `TxLink` (hash → explorer).

## 3. Mapa de pantallas

```
/                                Home / landing pública
/providers                       Catálogo
/providers/[id]                  Perfil 7-capas
/agents                          "Para desarrolladores" — docs del SDK + demo interactiva
/stats                           Métricas globales
/about                           Visión, equipo, roadmap (público SCF)
/playground                      Demo interactiva del agente (highlight para SCF)
```

## 4. Wireframes ASCII por pantalla

### 4.1 Home (`/`)

```
┌────────────────────────────────────────────────────────────────────┐
│  Flovia                              Providers  Agents  Stats  ⓘ  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│     Intelligence for the agentic payments economy on Stellar.     │
│                                                                    │
│     Discover, verify, and pay APIs autonomously — with on-chain   │
│     reputation built natively for Soroban.                        │
│                                                                    │
│     [  Open Catalog  ]   [  Try the Playground  ]                 │
│                                                                    │
│     ─────────────────────────────────────────────────────────     │
│                                                                    │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│     │   17     │  │  1,284   │  │  $4.2k   │  │   97%    │        │
│     │ providers│  │ payments │  │ volume   │  │ uptime   │        │
│     └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                    │
│     ─────────────────────────────────────────────────────────     │
│                                                                    │
│     ## The 7 layers                                                │
│     [ icons + one-liners ]                                         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Catálogo (`/providers`)

```
┌────────────────────────────────────────────────────────────────────┐
│  Filters: [ Category ▼ ] [ KYB ✓ ] [ Min Score: 60 ] [ Search... ] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ●● FX Rates Oracle           USDC 0.005/call   Trust 87 ⬤   │ │
│  │     fx.example.com           KYB ✓   24h vol: $124           │ │
│  │     "Real-time FX for 80 corridors. Verified anchor."        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ●● Sentiment API              USDC 0.01/call    Trust 72 ⬤   │ │
│  │     sentiment.ai/agent       KYB pending   24h vol: $42      │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ●● ... etc                                                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│                              [ Load more ]                         │
└────────────────────────────────────────────────────────────────────┘
```

### 4.3 Perfil de proveedor (`/providers/[id]`) — **la pantalla estrella**

```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back to catalog                                                 │
│                                                                    │
│  FX Rates Oracle                                       ╭───────╮   │
│  fx.example.com                                        │  87   │   │
│  GBFXP...ROVI (owner) [📋]   Contract: CFXR...[📋]    │ Trust │   │
│                                                        ╰───────╯   │
│                                                                    │
│  [ Discovery ] [ Identity ] [ Verify ] [ Finance ] [ Score ] [ AI ]│
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                                                            │    │
│  │  TAB: Discovery (capa 1)                                   │    │
│  │  • Endpoint:    fx.example.com/v1/rate                     │    │
│  │  • Method:      GET                                        │    │
│  │  • Price:       0.005 USDC per call                        │    │
│  │  • Protocol:    x402-stellar-1                             │    │
│  │  • Last seen:   2 min ago [view on Horizon →]              │    │
│  │                                                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ─── How to consume from your agent ───                            │
│  ```ts                                                             │
│  import { Flovia } from '@flovia/agent-sdk';                       │
│  const f = new Flovia({ secret: process.env.AGENT_SECRET });       │
│  const data = await f.call('fx-rates-oracle', { pair: 'EUR/USD' });│
│  ```                                                               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 4.4 Tab "Score" (desglose Trust Score)

```
┌────────────────────────────────────────────────────────────────────┐
│  Trust Score 87 / 100                                              │
│                                                                    │
│  Age (15%)              ████████████████░░  84   (registered 76d)  │
│  Volume (30%)           ████████████░░░░░░  62   (log scale)       │
│  KYB (30%)              ████████████████████ 100  ✓ verified       │
│  Claims (15%)           ████████████████████ 100  0 disputes        │
│  Recency (10%)          ████████████████████ 100  active 3h ago    │
│                                                                    │
│  Formula: 0.15·84 + 0.30·62 + 0.30·100 + 0.15·100 + 0.10·100 = 87  │
│  [ View on-chain history → ]                                       │
└────────────────────────────────────────────────────────────────────┘
```

### 4.5 Tab "AI" (recomendación)

```
┌────────────────────────────────────────────────────────────────────┐
│  AI Insight  (powered by Claude)                                   │
│                                                                    │
│  ▸ Strengths                                                       │
│    – Highest update frequency among FX providers in catalog.       │
│    – Verified KYB through Anchor X (SEP-12 tier 2).                │
│    – Zero disputed payments in 47 days of activity.                │
│                                                                    │
│  ▸ Watch outs                                                      │
│    – Volume still below $1k/day → score grows with usage.          │
│    – Single owner account → no fallback if compromised.            │
│                                                                    │
│  ▸ Best fit for                                                    │
│    Agents doing low-latency conversion checks before settlement.   │
│                                                                    │
│  [ Regenerate ]                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 4.6 Playground (`/playground`) — **lo que va a venderlo a SCF**

```
┌────────────────────────────────────────────────────────────────────┐
│  Live agent demo                                                   │
│                                                                    │
│  Step 1 ─── Pose a need to the agent                               │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ "I need the EUR/USD rate, max $0.01, KYB required"          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  [ Run agent ]                                                     │
│                                                                    │
│  Step 2 ─── Flovia recommends                                      │
│  ✓ Picked: FX Rates Oracle  (Trust 87)                             │
│  Reasoning: best fit, KYB verified, price within budget.           │
│                                                                    │
│  Step 3 ─── Agent pays                                             │
│  • Built tx:    [hash...]                                          │
│  • Submitted:   ✓                                                  │
│  • Confirmed:   4.8s [view on Stellar Expert →]                    │
│                                                                    │
│  Step 4 ─── Provider serves data                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ { "pair":"EUR/USD", "rate":1.0843, "ts":"..." }              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  Total time end-to-end: 6.2s                                       │
└────────────────────────────────────────────────────────────────────┘
```

## 5. Estados y feedback

### 5.1 Loading
- Skeletons en cards y tablas (no spinners).
- Para acciones del playground: stepper que avanza paso a paso.

### 5.2 Empty states
- Catálogo vacío: "No providers yet. [Be the first to register →]"
- Sin pagos en historial: "This provider hasn't received payments yet."

### 5.3 Errores
- Banner inline rojo con CTA accionable. Nunca modales de error.
- Para playground: el step que falló se marca, los siguientes quedan deshabilitados, hay botón [Retry].

### 5.4 Confirmaciones positivas
- Toast con check verde, autodismiss 4s.

## 6. Responsive

- **Desktop (1280+):** layout completo de 2-3 columnas en perfil.
- **Tablet (768-1279):** tabs verticales pasan a horizontales con scroll.
- **Mobile (<768):** stack vertical. Playground en steps colapsables.

Para la demo asumimos desktop primario. Mobile es nice-to-have.

## 7. Accesibilidad mínima

- Contraste WCAG AA.
- `aria-label` en chips de address y botones icon-only.
- Navegación por teclado en tabs.
- `prefers-reduced-motion` respetado.

## 8. Componentes a construir (orden de prioridad)

1. `<ScoreRing value={87} />` — radial 0-100 con color según rango.
2. `<AddressChip account="G..." />` — short + copy + link a Stellar Expert.
3. `<TxLink hash="..." />` — hash corto + link.
4. `<ProviderCard provider={...} />` — para catálogo.
5. `<LayerTabs />` — tabs de las 7 capas en el perfil.
6. `<TrustScoreBreakdown score={...} />` — desglose con barras.
7. `<PlaygroundStepper />` — stepper animado del playground.
8. `<CodeBlock lang="ts" />` — para snippets del SDK.

## 9. Microcopy importante

| Contexto | Texto |
|---|---|
| CTA Home principal | "Open Catalog" |
| CTA Home secundario | "Try the Playground" |
| Empty catalog | "No providers yet. [Register the first →]" |
| Trust Score tooltip | "How is this calculated? [Open formula →]" |
| KYB pending badge | "Verification in progress" |
| Pago confirmado | "Settled on Stellar in 4.8s" |
| Error de pago | "Payment failed. [See on Horizon →]" |
