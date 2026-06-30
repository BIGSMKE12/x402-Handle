# Plan de implementación — 6 días + buffer

> Cada día tiene **una meta clara**, **tickets accionables**, y un **criterio de "listo"**. Si un día no se cumple, se sacrifica scope, no calidad.

---

## Día 0 (medio día, opcional) — Preparación

- [ ] **0.1** Crear repo limpio o branch `stellar-migration` sobre el fork actual.
- [ ] **0.2** Abrir el repo en Claude Code, importar todos los `.md` de este paquete en la raíz como `/docs/`.
- [ ] **0.3** Crear `.env.example` con las variables de TRD § 9.
- [ ] **0.4** Instalar `stellar-cli` localmente: `curl -L https://stellar-cli.installer.run | sh`
- [ ] **0.5** Crear cuentas testnet con friendbot, anotarlas en un `accounts.local.md` (gitignored).

**Listo cuando:** podés correr `stellar account fund <G>` y ves el balance en `horizon-testnet.stellar.org/accounts/<G>`.

---

## Día 1 — Fundación Stellar (capa `sources`)

**Meta:** reemplazar toda la capa `packages/sources` por la versión Stellar y tener funciones que devuelvan datos reales de testnet.

### Tickets
- [ ] **1.1** Borrar `packages/sources/{x402-discovery.ts,cdp-discovery.ts,bitquery.ts,zerion.ts,mpp-registry.ts}`. Conservar `transport.ts`.
- [ ] **1.2** Crear `packages/sources/stellar/horizon.ts` con: `getAccount(G)`, `listPayments(G, limit)`, `getTransaction(hash)`. Ver `11-MIGRACION-PACKAGES-SOURCES.md`.
- [ ] **1.3** Crear `packages/sources/stellar/soroban-rpc.ts` con: `simulate(contractId, fn, args)`, `getEvents(fromLedger)`.
- [ ] **1.4** Crear `packages/sources/stellar/usdc.ts` con constantes del asset (issuer testnet) y helpers.
- [ ] **1.5** Crear `packages/sources/stellar/stellar-expert.ts` (opcional, fallback a Horizon).
- [ ] **1.6** Test manual: script CLI que consulta una cuenta de prueba y printea sus pagos USDC.

**Listo cuando:** `bun run apps/cli/test-stellar.ts <G>` imprime balances + 5 últimos pagos. Sin errores.

---

## Día 2 — x402 sobre Stellar (el diferenciador #1)

**Meta:** middleware funcional + servidor demo protegido + cliente que paga.

### Tickets
- [ ] **2.1** Implementar `code/x402-stellar-middleware/src/server.ts` (skeleton ya provisto en este paquete) y publicarlo como paquete interno del monorepo `@flovia/x402-stellar`.
- [ ] **2.2** Implementar `code/x402-stellar-middleware/src/verify.ts` con `verifyUsdcPayment` (de TRD § 7.2).
- [ ] **2.3** Implementar `code/x402-stellar-middleware/src/client.ts` para el lado agente.
- [ ] **2.4** Crear `apps/demo-provider/index.ts` — servidor Hono con UN endpoint `/rate` protegido por el middleware.
- [ ] **2.5** Crear `apps/cli/scripts/demo-call.ts` que ejecuta el flujo: GET sin pago → 402 → pago → GET con `X-PAYMENT` → recibe data.
- [ ] **2.6** Edge cases: pago duplicado, memo inválido, underpayment. Cada uno con test.

**Listo cuando:** `bun apps/cli/scripts/demo-call.ts` completa el ciclo en <10s con la primera tx pagada de verdad en testnet (ver en Stellar Expert).

---

## Día 3 — Contrato Soroban + indexer

**Meta:** registry on-chain + indexer que lo refleja en Postgres.

### Tickets
- [ ] **3.1** Tomar el contrato `code/soroban-registry/src/lib.rs` (skeleton provisto), revisarlo y `stellar contract build`.
- [ ] **3.2** `stellar contract deploy` a testnet, guardar contract ID en `.env`.
- [ ] **3.3** Llamar `register_provider` 5 veces con datos demo realistas (script en `apps/cli/scripts/seed-providers.ts`).
- [ ] **3.4** Implementar `apps/cli/indexer.ts`:
  - Lee `last_ledger` de `indexer_state`.
  - Llama `soroban-rpc.getEvents` con ese cursor.
  - Para evento `provider_registered`: upsert en `providers`.
  - Para evento `payment_logged`: upsert en `payments`.
  - Actualiza `last_ledger`.
- [ ] **3.5** Tests Rust del contrato (`cargo test`).
- [ ] **3.6** Conectar middleware x402 al contrato: cada pago verificado opcionalmente llama `log_payment`.

**Listo cuando:** el indexer corriendo levanta los 5 providers + sus pagos del día 2, sin duplicados, con `last_ledger` avanzando.

---

## Día 4 — Inteligencia + Trust Score + IA

**Meta:** `packages/intelligence` completo + endpoints `/providers/:id/intelligence` y `/api/recommend`.

### Tickets
- [ ] **4.1** Implementar `packages/intelligence/trust.ts` con la fórmula de TRD § 7. Tests unitarios con casos borde.
- [ ] **4.2** Implementar `packages/intelligence/ranker.ts`.
- [ ] **4.3** Implementar `packages/intelligence/ai.ts` con cliente Anthropic + Zod parsing de la respuesta.
- [ ] **4.4** Construir `apps/bff/routes/providers.ts` con `GET /providers`, `GET /providers/:id`, `GET /providers/:id/intelligence`.
- [ ] **4.5** Construir `apps/bff/routes/recommend.ts` con `GET /api/recommend`.
- [ ] **4.6** Cache de AI con tabla `ai_recommendations` (TTL 1h).
- [ ] **4.7** Mock KYB en `packages/sources/kyb/mock.ts`: tabla local con 3 providers verified, 1 pending, 1 none.
- [ ] **4.8** Endpoint `/health` con checks de Horizon, Soroban RPC, DB.

**Listo cuando:** `curl /providers/<id>/intelligence` devuelve un JSON completo con las 7 capas, incluyendo Trust Score correcto y reasoning de Claude.

---

## Día 5 — Frontend + Playground + SDK del agente

**Meta:** dashboard navegable + playground funcional + SDK publicable.

### Tickets
- [ ] **5.1** Setup Next.js 14 si no está; instalar shadcn/ui, tailwind.
- [ ] **5.2** Componentes base: `ScoreRing`, `AddressChip`, `TxLink`, `ProviderCard`, `LayerTabs`, `TrustScoreBreakdown`.
- [ ] **5.3** Página `/` con hero + stats vivos.
- [ ] **5.4** Página `/providers` (catálogo) con filtros.
- [ ] **5.5** Página `/providers/[id]` con tabs de las 7 capas.
- [ ] **5.6** Página `/playground` con stepper end-to-end. **Ésta es la página que va a vender el proyecto.**
- [ ] **5.7** Página `/stats` con métricas globales.
- [ ] **5.8** SDK `@flovia/agent-sdk` (`code/agent-sdk/`): clase `Flovia` con `discoverAndCall`, `recommend`, `pay`.
- [ ] **5.9** Página `/agents` con docs del SDK + snippet copiable.

**Listo cuando:** el playground se puede correr 5 veces seguidas sin errores y cualquier reviewer puede entender qué pasó en cada paso.

---

## Día 6 — Pulido, deploy, materiales SCF

**Meta:** todo deployado, video grabado, aplicación SCF enviada.

### Tickets
- [ ] **6.1** Deploy frontend a Vercel.
- [ ] **6.2** Deploy BFF + indexer a Railway/Fly.io. Variables de entorno cargadas.
- [ ] **6.3** Verificar `/health` en producción.
- [ ] **6.4** Grabar video de 3 min:
  - 30s: el problema (pagos agénticos sin inteligencia)
  - 60s: tour por el dashboard (catálogo → perfil → score)
  - 60s: playground en vivo (recomendar → pagar → consumir)
  - 30s: visión 7 capas + cierre
- [ ] **6.5** README del repo principal con: setup, demo, screenshots, links a docs.
- [ ] **6.6** Pulir `08-PITCH-DECK.md` y `10-SCF-PITCH-7-CAPAS.md` con números reales.
- [ ] **6.7** Aplicar a SCF: completar formulario, adjuntar video, link al repo y al demo.
- [ ] **6.8** Smoke test final: ejecutar `apps/cli/scripts/demo.ts` 3 veces, todas exitosas.

**Listo cuando:** la aplicación a SCF está enviada y el demo público funciona desde un device limpio.

---

## Día 7 — Buffer

Sin tickets fijos. Reservado para:
- Bugs detectados durante el día 6.
- Mejorar el video si el primer corte no convence.
- Agregar 1 feature "wow" si quedó tiempo (sugerencia: integración real con un anchor testnet, o un segundo provider category).
- Descansar antes de la presentación.

---

## Reglas no negociables

1. **Test antes de demo.** Cada vez que se va a mostrar el playground, correr el smoke test primero.
2. **No mainnet esta semana.** Testnet es suficiente y más seguro.
3. **Nada se mergea sin lint pasando.**
4. **Si algo está mockeado, el código lo dice explícitamente** (`// MOCK_KYB:` comment + log en runtime).
5. **El video pesa más que cualquier código.** Si hay que elegir entre pulir un componente o re-grabar el video, gana el video.

## Gestión de scope en caliente

Si al día 4 vas atrasado, sacrificás en este orden:
1. **Primero:** página `/stats` (es nice-to-have).
2. **Segundo:** SDK `@flovia/agent-sdk` (el playground puede llamar al BFF directo).
3. **Tercero:** AI insight en el perfil (el ranker sí queda).
4. **Cuarto (si todo se cae):** registro de proveedor desde UI — los seedeás vía CLI.

Lo que **nunca** se sacrifica: playground, contrato Soroban deployado, middleware x402 real, Trust Score con desglose.
