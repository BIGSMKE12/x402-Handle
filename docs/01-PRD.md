# PRD — Flovia Stellar

**Versión:** 0.1 (Hackathon SCF)
**Fecha:** Semana del hackathon
**Owner:** DonCervantes

---

## 1. Resumen ejecutivo

Flovia Stellar es una **plataforma de inteligencia para la economía de pagos agénticos** construida nativamente sobre la red Stellar. Resuelve un problema que está apareciendo *ahora*: cuando agentes autónomos (bots, LLMs con herramientas, workflows automatizados) necesitan pagar por servicios, no tienen forma de saber **quién es confiable, qué cobra, qué tan bueno es**, ni mucho menos de **descubrir y seleccionar el mejor proveedor automáticamente**.

Flovia es la capa que llena ese vacío: descubre proveedores, los verifica, los puntúa, y expone una API que los agentes consumen para tomar decisiones de pago en tiempo real.

## 2. Problema

### 2.1 El cambio de paradigma
Los pagos ya no son sólo humano→humano o humano→empresa. Empiezan a ser **agente→API**, **agente→agente**. Un LLM que necesita datos de mercado, un bot que reserva un vuelo, un workflow que compra cómputo — todos ellos necesitan pagar, y a menudo en montos micro y a frecuencia alta.

### 2.2 La fricción actual en Stellar
1. **No hay forma estándar de cobrar por API** de modo nativo en Stellar (no existe un x402 listo para usar).
2. **No hay forma de evaluar al proveedor** antes de pagarle. ¿Esa cuenta es real? ¿Cumplió antes? ¿Tiene KYB?
3. **No hay forma para el agente de descubrir** qué APIs existen, qué cobran, qué cubren.
4. **Los datos están dispersos:** Horizon, anchors, StellarExpert, contratos Soroban — nadie los une en una vista útil para decisión de pago.

### 2.3 ¿Por qué esto importa ahora?
La adopción de agentes IA con capacidad de ejecutar pagos está explotando (MCP, function calling, Computer Use). Stellar tiene la mejor primitiva de pago (USDC nativo, fees ~0, finalidad de 5 segundos) pero **le falta la capa de inteligencia que vuelva esos pagos seguros y selectivos**. Quien construya esa capa se vuelve infraestructura crítica del ecosistema.

## 3. Solución

Flovia entrega **siete capas** integradas. Cada capa es un módulo independiente con interfaces definidas:

| Capa | Función | Estado en hackathon |
|---|---|---|
| 1. Descubrimiento de pagos | Indexa APIs que aceptan pagos x402 sobre Stellar | **Real** |
| 2. Identidad | Resuelve quién está detrás de cada cuenta/contrato | **Stub estructurado** |
| 3. Verificación (KYB/KYC) | Marca proveedores como verificados vía SEP-12 / anchors | **Stub estructurado** |
| 4. Inteligencia financiera | Análisis de actividad, volumen, paths, FX, costos | **Real** |
| 5. Reputación | Trust Score on-chain transparente | **Real (versión simple)** |
| 6. IA | Recomendaciones accionables vía Claude | **Real** |
| 7. Infraestructura para agentes | API + SDK para que agentes consulten y decidan | **Real** |

(Detalle expandido en `10-SCF-PITCH-7-CAPAS.md`.)

## 4. Usuarios y stakeholders

### 4.1 Usuario primario: el **agente autónomo**
- Es código (LLM con herramientas, bot, workflow).
- Necesita ejecutar pagos en USDC-Stellar para consumir servicios.
- Su "decisión" es una llamada a la API de Flovia: "dame el mejor proveedor para X bajo restricciones Y".

### 4.2 Usuario secundario: el **desarrollador del agente**
- Persona humana que construye el agente.
- Usa el dashboard de Flovia para inspeccionar, debuggear, configurar políticas (max budget, KYB obligatorio, etc.).

### 4.3 Usuario terciario: el **proveedor de API**
- Quiere monetizar su servicio cobrando por uso.
- Se registra en Flovia, instala el middleware x402, aparece en el catálogo y empieza a recibir pagos.

### 4.4 Stakeholders externos
- **Stellar Development Foundation / SCF reviewers** — necesitan ver visión Stellar-native + tracción + viabilidad técnica.
- **Anchors y exchanges** — fuente de verificación KYB.
- **Operadores de wallets** — potenciales integradores.

## 5. Objetivos del hackathon

### 5.1 Objetivos primarios (must-have al cierre)
1. **Demo en vivo de un flujo end-to-end:** agente pregunta → Flovia recomienda → agente paga vía x402-Stellar → consume API. Todo en testnet, todo on-chain verificable.
2. **Contrato Soroban deployado en testnet** con registry + payment log funcionando.
3. **Dashboard web** mostrando proveedores con sus 7 capas de información.
4. **Documentación SCF-ready:** PRD, white paper resumido, video de 3 min, roadmap.

### 5.2 Objetivos secundarios (nice-to-have)
- SDK cliente para agentes (TypeScript) publicado en npm como `@flovia/agent-sdk`.
- Integración con un anchor real de Stellar (aunque sea mock) para mostrar el path de KYB.
- 3 proveedores demo reales mapeados en el catálogo.

### 5.3 No-objetivos (explícitamente fuera de scope esta semana)
- Mainnet (todo en testnet).
- Soporte multi-chain.
- Sistema de pagos recurrentes / streaming (queda como roadmap).
- Marketplace bidireccional (un proveedor publicando precios dinámicos). Esta vez los precios son fijos en el registry.
- Auth de usuarios humanos en el dashboard (es lectura pública por ahora).

## 6. Requisitos funcionales (RF)

### RF-1 — Registro de proveedor
Como proveedor, quiero registrar mi servicio en el contrato Soroban con: nombre, URL, precio por call, cuenta de cobro, metadata.
- **Aceptación:** método `register_provider` del contrato emite evento `ProviderRegistered` y el indexer lo persiste en Postgres.

### RF-2 — Cobro x402
Como proveedor, quiero proteger un endpoint HTTP con el middleware x402-Stellar.
- **Aceptación:** request sin pago → respuesta 402 con challenge. Request con `X-PAYMENT` válido → verificación en Horizon → recurso servido. Pago inválido o insuficiente → 402 nuevamente.

### RF-3 — Catálogo público
Como visitante del dashboard, quiero ver la lista de proveedores con: nombre, precio, Trust Score, KYB flag, volumen últimas 24h.
- **Aceptación:** página `/providers` lista al menos 5 proveedores con datos reales.

### RF-4 — Perfil de proveedor
Como visitante, quiero entrar al detalle de un proveedor y ver las 7 capas de información.
- **Aceptación:** página `/providers/[id]` muestra secciones: Descubrimiento, Identidad, Verificación, Inteligencia financiera, Trust Score (con desglose), Recomendación IA, Cómo consumir desde un agente.

### RF-5 — Recomendación para agente
Como agente, quiero llamar a `GET /api/recommend?need=fx-rates&max_price=0.01&kyb_required=true` y recibir una lista ranqueada de proveedores con justificación.
- **Aceptación:** endpoint responde JSON estructurado, devuelve top 3, incluye campo `reasoning` generado por Claude.

### RF-6 — Trust Score transparente
Como visitante, quiero entender cómo se calcula el Trust Score.
- **Aceptación:** la UI muestra el desglose por factor (antigüedad, volumen, KYB, claims) con el peso y el valor de cada uno.

### RF-7 — Ejecución de pago desde agente
Como agente con el SDK, quiero llamar a `flovia.pay(providerId, callData)` y que el SDK construya, firme y envíe la transacción Stellar, y luego ejecute el call HTTP con el header `X-PAYMENT`.
- **Aceptación:** un script CLI de ejemplo ejecuta este flujo completo en menos de 10 segundos.

## 7. Requisitos no funcionales (RNF)

| ID | Requisito | Métrica |
|---|---|---|
| RNF-1 | Latencia de recomendación | < 2 s p95 |
| RNF-2 | Latencia de verificación x402 | < 6 s p95 (limitado por finalidad Stellar ~5s) |
| RNF-3 | Disponibilidad demo | 99% durante la semana de evaluación SCF |
| RNF-4 | Open source | Repo público en GitHub bajo MIT |
| RNF-5 | Reproducibilidad | `bun install && bun dev` levanta todo en local en < 2 min |
| RNF-6 | Seguridad | Sin private keys en código; usar `.env` con `.env.example` |

## 8. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Soroban testnet inestable durante demo | Media | Alto | Tener fallback grabado en video |
| Tiempo de aprendizaje SDK Stellar | Media | Medio | Día 1 dedicado a setup, ejemplos oficiales como referencia |
| Sobre-scope (querer construir las 7 capas reales) | Alta | Alto | Plan de día 6 estricto, stubs claramente marcados |
| Reviewer SCF no entiende x402 | Baja | Medio | Video explicativo + sección dedicada en pitch deck |

## 9. Métricas de éxito

### 9.1 Métricas del hackathon (corto plazo)
- ✅ Demo en vivo funciona sin caídas.
- ✅ Repo público con README claro.
- ✅ Aplicación a SCF enviada con todos los entregables.

### 9.2 Métricas post-hackathon (visión)
- N° de proveedores registrados en el contrato.
- USDC transado vía middleware x402 (volumen).
- N° de agentes únicos que consultan la API de recomendación.
- N° de integraciones con wallets/anchors.

## 10. Glosario

- **Agente:** programa autónomo (típicamente LLM-driven) que ejecuta acciones, incluidos pagos.
- **x402:** propuesta de protocolo que reutiliza HTTP 402 (Payment Required) para cobrar por recursos web. Es agnóstico de cadena; esta versión liquida sobre Stellar.
- **SEP:** Stellar Ecosystem Proposal. Estándares de Stellar (SEP-10 auth, SEP-12 KYC, SEP-31 cross-border, etc.).
- **Anchor:** entidad que conecta Stellar con el mundo fiat (on/off ramps), regulada y con KYB.
- **Soroban:** plataforma de smart contracts de Stellar.
- **Trust Score:** puntaje 0-100 calculado por Flovia para cada proveedor.
- **USDC en Stellar:** versión nativa de USDC emitida por Circle directamente en la red Stellar.
