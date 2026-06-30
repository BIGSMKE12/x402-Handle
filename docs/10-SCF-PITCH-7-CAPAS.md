# SCF Pitch — Las 7 capas de Flovia

> Documento específico para Stellar Community Fund. Pensado para acompañar la aplicación SCF junto con el video de 3 min, el repo y el demo.

---

## TL;DR

Flovia es la **capa de inteligencia que falta en Stellar para que la economía agéntica funcione**. Stellar tiene la mejor primitiva de pago del mundo cripto (USDC nativo, fees ~0, 5s de finalidad). Lo que no tiene es la **infraestructura de decisión** que un agente autónomo necesita antes de mover dinero: catálogo, identidad, verificación, reputación. Flovia lo construye en 7 capas, todas Stellar-native, todas componibles, todas auditables.

**Lo que ya está deployado al cerrar el hackathon:**
- Contrato Soroban en testnet (`C...`)
- Middleware x402-Stellar protegiendo APIs reales
- 5 providers seedeados con datos verdaderos
- Dashboard público y playground end-to-end
- SDK para que cualquier agente lo consuma

---

## Por qué Stellar y nada más

Pudimos elegir cualquier cadena. Elegimos Stellar por **cinco razones técnicas concretas**, no por preferencia:

1. **USDC nativo emitido por Circle directo.** No es un wrapped, no es un bridge. Para un agente que cierra cuentas en dólares, esto es la diferencia entre "production-grade" y "experimento".
2. **Fees efectivamente cero.** Para que un micropago de $0.001 tenga sentido, el costo de la transacción no puede ser $0.50. En Ethereum ni en Solana saturada se sostiene. En Stellar sí.
3. **Finalidad en ~5 segundos.** UX agéntica fluida. Un humano espera 5s sin problema; un agente, todavía mejor.
4. **Anchors regulados** (SEP-10, SEP-12, SEP-24). Es el único ecosistema cripto que tiene KYB nativo en el stack. Para una capa de reputación, esto es oro.
5. **Soroban es joven y limpio.** Menos saturación de proyectos, menos noise, más diferenciación. Y un lenguaje (Rust) que da confianza para infraestructura financiera.

---

## Las 7 capas — detalle por capa

### Capa 1 — Descubrimiento de pagos

**Qué hace:** indexar todas las APIs que aceptan pagos vía x402-Stellar y exponerlas en un catálogo público y consumible por máquinas.

**Implementación hackathon:**
- Contrato Soroban con función `register_provider`.
- Indexer en Bun que lee eventos `provider_registered` y los persiste en Postgres.
- Endpoint `/providers` y página `/providers` en el frontend.
- 5 providers reales registrados con dominios y endpoints válidos.

**Por qué es importante:** sin discovery, los agentes operan a ciegas. Un catálogo on-chain es la fuente de verdad inmutable que permite componibilidad.

### Capa 2 — Identidad

**Qué hace:** resolver quién está detrás de cada cuenta Stellar y cada contrato. ¿Es una persona? ¿Una empresa? ¿Un agente? ¿Un anchor?

**Implementación hackathon:**
- Mapeo `account → owner_info` con fuentes:
  - Federación Stellar (SEP-2)
  - DNS TXT records (formato `stellar.org=<G...>`)
  - StellarExpert public profiles
  - Tabla de aliases conocidos (anchors, players grandes)
- En el hackathon, 80% real + 20% mock estructurado (con flag visible).

**Por qué es importante:** identidad es el prerequisito de cualquier evaluación. Sin saber quién es, ninguna otra capa tiene sentido.

### Capa 3 — Verificación (KYB / KYC)

**Qué hace:** marcar cada provider con un estado de verificación KYB legítimo, basado en evidencias.

**Implementación hackathon:**
- Stub estructurado con 3 estados (`verified`, `pending`, `none`) y campo `source` que documenta de dónde viene la verificación.
- Integración con un anchor SEP-12 de testnet (puede ser mock pero respeta el contrato del estándar).
- Roadmap real: integración con 2-3 anchors productivos en mainnet (mes 1-3).

**Por qué es importante:** para que agentes corporativos o regulados puedan operar, necesitan saber que el destino del pago pasó controles. Stellar es la única red donde esto es estructuralmente posible.

### Capa 4 — Inteligencia financiera

**Qué hace:** analizar la actividad económica de cada provider: volumen, frecuencia de cobros, pagadores únicos, paths de liquidez en Stellar, balances.

**Implementación hackathon:**
- Datos vivos de Horizon: `listPayments`, balances, last activity.
- Path finding API de Stellar para verificar cómo se mueven los fondos.
- Agregaciones en Postgres (volumen 24h / 30d / lifetime).
- Visualización en la tab `Finance` del perfil del provider.

**Por qué es importante:** los números on-chain son la única fuente confiable de tracción real. Esta capa convierte data en señal.

### Capa 5 — Reputación (Trust Score)

**Qué hace:** entregar un score 0-100 por provider, **auditablemente calculado** a partir de inputs verificables.

**Implementación hackathon:**
- Fórmula determinística (TRD § 7), 5 factores con pesos públicos.
- Cálculo en `packages/intelligence/trust.ts`, tests unitarios.
- UI muestra el desglose por factor con el peso y el valor crudo.
- Historia persistida en `trust_score_history` para tracking temporal.

**Por qué es importante:** la confianza en pagos automáticos sólo escala si la base es transparente. Una "caja negra de reputación" no es aceptable; una fórmula auditable sí.

### Capa 6 — IA

**Qué hace:** responder preguntas complejas y generar recomendaciones accionables. Por ejemplo: "dada esta necesidad, ¿cuál es el mejor provider?", o "explicáme por qué este provider tiene Trust Score 87".

**Implementación hackathon:**
- Llamadas a Claude (Anthropic API) desde el BFF con prompts estructurados.
- Salida forzada a JSON validado con Zod.
- Cache de 1 hora para evitar costos repetidos.
- Endpoints: insight (en perfil), recomendación (en `/api/recommend`).

**Por qué es importante:** la IA aquí no es decoración — es lo que vuelve la plataforma usable por otros agentes (LLMs) sin necesidad de programar lógica de matching custom para cada consumer.

### Capa 7 — Infraestructura para agentes

**Qué hace:** permitir que agentes autónomos consulten la plataforma vía API y, opcionalmente, ejecuten el ciclo completo de pago/consumo.

**Implementación hackathon:**
- API REST documentada (endpoints listados en `05-BACKEND-ESQUEMATICO.md`).
- SDK `@flovia/agent-sdk` con métodos `discover`, `recommend`, `pay`, `discoverAndCall`.
- Playground en `/playground` que muestra el ciclo completo paso a paso.
- Roadmap: MCP server para que LLMs lo carguen como tool nativo.

**Por qué es importante:** todas las otras capas son inútiles si el agente no puede consumirlas en una sola llamada simple. Esta capa es el contrato API de Flovia con el mundo agéntico.

---

## Composabilidad: por qué las 7 capas juntas valen más que la suma

Cada capa puede existir como producto separado. La novedad de Flovia es que **están integradas**, de modo que:

- El **Trust Score (capa 5)** depende de **KYB (capa 3)** y de **inteligencia financiera (capa 4)**.
- La **recomendación de IA (capa 6)** consume **Trust Score (5)** + **identidad (2)** + **descubrimiento (1)**.
- El **SDK (capa 7)** orquesta todo en un solo método.

Cuando un agente llama `flovia.discoverAndCall({...})`, las 7 capas se ejecutan en secuencia. **Esa composición es el producto.**

---

## Alineación con los principios de Stellar

| Principio Stellar | Cómo Flovia lo encarna |
|---|---|
| Inclusión financiera | Bajamos la barrera para que cualquier developer construya un agente económico, sin necesidad de armar su propio stack de reputación. |
| Pagos accesibles | Habilitamos micropagos económicos vía x402-Stellar. |
| Apertura | Todo el código es MIT. El registry está en Soroban público. La fórmula del Trust Score es pública. |
| Interoperabilidad | Compatible con SEPs (SEP-10, SEP-12), con anchors, con StellarExpert. |
| Sostenibilidad | Modelo de negocio realista no extractivo: monetizamos servicios premium, no la infra básica. |

---

## Pedido SCF concreto

**Programa:** SCF Build
**Monto:** $25,000 USD en XLM
**Plazo:** 9 meses, 4 milestones (ver `07-BUSINESS-PLAN.md` § 8)

**Por qué confiar en este equipo:**
- Repo público con POC previo trabajando en pagos agénticos (la auditoría que originó este proyecto).
- Decisión consciente de focalizar 100% en Stellar (no multi-chain dispersa).
- Plan de implementación detallado, día por día, con criterios de éxito.
- Open source desde día 1.

**Compromiso de retorno a la comunidad Stellar:**
- Especificación abierta de x402-Stellar (lista para presentar como propuesta SEP si hay interés).
- SDK público en npm.
- Documentación + tutoriales sobre cómo monetizar APIs en Stellar.
- Contribuciones eventuales al ecosistema de tools de Soroban.

---

## Anexo — Visualización rápida

```
┌────────────────────────────────────────────────────────────┐
│         AGENTE AUTÓNOMO (LLM, bot, workflow)               │
└───────────────────────────┬────────────────────────────────┘
                            │
                            ▼ "necesito X bajo restricciones Y"
              ┌──────────────────────────┐
              │   FLOVIA / 7 LAYERS      │
              │                          │
              │ 7. Agent Infra (API/SDK) │  ← interfaz del agente
              │ 6. AI Recommendations    │  ← Claude
              │ 5. Trust Score           │  ← fórmula pública
              │ 4. Financial Intel       │  ← Horizon data
              │ 3. KYB Verification      │  ← Anchors (SEP-12)
              │ 2. Identity              │  ← Federation, DNS, StellarExpert
              │ 1. Payment Discovery     │  ← Soroban registry
              └─────────────┬────────────┘
                            │
                            ▼ "paga 0.005 USDC a G..."
              ┌──────────────────────────┐
              │   STELLAR NETWORK        │
              │   USDC nativo • 5s • $0  │
              └──────────────────────────┘
```

---

**Flovia hace agéntico el dinero que Stellar ya hizo digital.**
