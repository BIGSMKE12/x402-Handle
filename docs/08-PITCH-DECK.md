# Pitch Deck — Flovia Stellar

> Formato: 10 slides. Cada `---` es un slide. Diseñado para 3 min de pitch o 5 min con Q&A.

---

## Slide 1 — Cover

# Flovia
### Intelligence for the agentic payments economy on Stellar

**Hackathon SCF — 2026**
By DonCervantes · github.com/DonCervantes/flovia-stellar

---

## Slide 2 — The shift

# Pagos están dejando de ser humanos.

- LLMs ejecutan acciones (function calling, MCP, Computer Use)
- Agentes consumen APIs y pagan por uso
- Stellar tiene la mejor primitiva de pago: **USDC nativo, $0 fees, finalidad 5s**

**Pero los agentes están ciegos.** No saben a quién pagarle, ni si es confiable.

---

## Slide 3 — The problem

# Un agente que paga en Stellar hoy no puede responder:

1. ¿Qué APIs existen para mi necesidad?
2. ¿Cuál es el precio justo?
3. ¿Esta cuenta destino es real? ¿Tiene KYB?
4. ¿Cumplió antes? ¿Tiene reputación?
5. ¿Cuál elijo entre 5 opciones equivalentes?

**Resultado:** ningún builder serio va a delegar dinero a un agente todavía.

---

## Slide 4 — The solution

# Flovia: 7 capas de inteligencia agéntica

| # | Capa |
|---|---|
| 1 | **Descubrimiento** — catálogo de APIs con pago x402 sobre Stellar |
| 2 | **Identidad** — quién está detrás de cada cuenta y contrato |
| 3 | **Verificación** — KYB/KYC vía anchors Stellar (SEP-12) |
| 4 | **Inteligencia financiera** — volumen, paths, FX, costos |
| 5 | **Reputación** — Trust Score on-chain, transparente |
| 6 | **IA** — recomendaciones accionables (Claude) |
| 7 | **Infra para agentes** — API + SDK: agentes consultan y deciden |

---

## Slide 5 — How it works (live demo)

```
Agente:  "EUR/USD rate, max $0.01, KYB required"
            ↓ 1
Flovia:  Top-3 providers + reasoning
            ↓ 2
Agente:  Paga 0.005 USDC vía x402-Stellar (5s ⛓)
            ↓ 3
Provider: Sirve la data
            ↓
[ tiempo end-to-end: 6.2 s ]
```

> Demo en vivo en flovia.app/playground

---

## Slide 6 — Why Stellar

| | Stellar | Otros |
|---|---|---|
| USDC nativo | ✅ Circle directo | Bridges, wrappers |
| Fees | ~$0.00001 | $0.001 - $5 |
| Finalidad | 5 s | 10s - 12min |
| KYB nativo (anchors) | ✅ regulados | ❌ |
| Soroban (smart contracts) | ✅ joven y limpio | Saturados |
| SCF + comunidad | ✅ enfocada | dispersa |

**Stellar es la única red diseñada para pagos reales.** Flovia es la inteligencia que le faltaba.

---

## Slide 7 — Traction (semana hackathon)

- ✅ Middleware x402-Stellar funcionando en testnet
- ✅ Contrato Soroban deployado: `C...`
- ✅ 5 providers reales registrados
- ✅ Dashboard + playground públicos
- ✅ SDK `@flovia/agent-sdk` publicado
- ✅ Demo end-to-end: < 7 segundos

Repo: github.com/DonCervantes/flovia-stellar (MIT)
Demo: flovia.app

---

## Slide 8 — Business model

| Capa | Quién paga | Cómo |
|---|---|---|
| Infra abierta | Nadie | Open source |
| Listing premium | Providers | $50-500/mes |
| API Pro | Builders de agentes | $0.001-0.01/req |
| Intelligence Enterprise | Anchors, exchanges | $2k-20k/mes |
| Insurance pool (24m) | Volumen asegurado | 0.5% |

**Año 1 target:** $50k MRR — breakeven con equipo de 3.

---

## Slide 9 — Ask & roadmap

### Pedido SCF: **$25k en XLM**

| Mes | Milestone |
|---|---|
| 1 | Mainnet + 10 providers + 1 anchor real |
| 3 | SDK publicado, 5 builders integrados |
| 6 | API Pro, 100k requests, $5k MRR |
| 9 | Trust Score 2.0 + dispute resolution |

### Por qué ahora
Los agentes con capacidad de pago están explotando. Quien construya la capa de inteligencia se vuelve infraestructura crítica antes que aparezcan competidores.

---

## Slide 10 — Closing

# La economía agéntica necesita Stellar.
# Stellar necesita Flovia.

**Demo:** flovia.app/playground
**Repo:** github.com/DonCervantes/flovia-stellar
**Contacto:** [email]

*Thank you.*

---

## Notas para el presentador

- **Tono:** confiado, no salesy. Cada claim respaldado con código o link.
- **Demo:** correr el playground EN VIVO. Tener un fallback en video por si testnet falla.
- **Cierre fuerte:** la última frase tiene que dejar al reviewer pensando.
- **Q&A esperado:**
  - ¿Por qué Stellar y no Solana / Base? → Slide 6. USDC nativo + anchors regulados.
  - ¿Cómo monetizan a corto plazo? → Slide 8, premium listing es cobrable desde mes 2.
  - ¿Y si Coinbase saca su propio x402 con scoring? → ellos resuelven el protocolo, nosotros la inteligencia + KYB nativo de Stellar.
  - ¿Cómo se calcula Trust Score? → fórmula transparente, ver `/providers/[id]` tab Score.
  - ¿Qué pasa si un provider miente sobre lo que sirve? → flag de incidente → impacto en Trust Score → roadmap con disputes.
