# Business Plan — Flovia Stellar

## 1. Resumen ejecutivo

Flovia es la **capa de inteligencia y reputación para la economía de pagos agénticos** sobre Stellar. Resolvemos el problema de "cómo un agente autónomo elige y paga al mejor proveedor de servicios" en una red donde el pago es trivial pero la decisión informada todavía no.

Nuestro modelo combina **infraestructura abierta** (protocolo x402-Stellar, contrato Soroban) con **servicios premium** (API de recomendación, scoring avanzado, verificaciones KYB). En el corto plazo nos posicionamos como infraestructura crítica del ecosistema Stellar para pagos máquina-a-máquina; en el mediano plazo, somos el "Bloomberg + Moody's" de la economía agéntica.

## 2. Problema y oportunidad

### 2.1 La nueva economía de pagos
Tres tendencias se cruzan en 2025-2026:
1. **LLMs con capacidad de ejecutar acciones** (function calling, tool use, MCP, Computer Use).
2. **Infraestructura cripto que vuelve los pagos online sub-segundo y casi gratis** (USDC en redes de alta performance como Stellar).
3. **Aparición de APIs especializadas pequeñas** que se monetizan por uso, no por suscripción.

El resultado: agentes que necesitan **descubrir, evaluar y pagar** decenas de APIs distintas, automáticamente. Hoy, ningún producto cubre eso de punta a punta en ninguna cadena, y mucho menos en Stellar.

### 2.2 Tamaño del mercado (estimación)

| Capa de mercado | Tamaño | Plazo |
|---|---|---|
| **TAM** — Pagos B2B globales | $200T anual | 2030 |
| **SAM** — Pagos programáticos / API | $50B anual estimado | 2027 |
| **SOM (Stellar)** — Pagos agénticos sobre Stellar | $50-200M anual estimado | 2026-2027 |

Estimaciones propias basadas en el crecimiento de USDC en Stellar (Circle reporta volúmenes mensuales crecientes), la adopción de MCP entre desarrolladores, y comparables como Stripe (cobra ~3% sobre $1T procesados → $30B revenue).

## 3. Producto

(Ver detalle en `01-PRD.md`)

**Hoy (hackathon):** plataforma con catálogo, perfil 7 capas, motor de recomendación, middleware x402, contrato Soroban, SDK para agentes.

**12 meses:** mainnet, anchors integrados realmente, KYB tier 2-3 real, marketplace de providers con miles de APIs, embeddings para discovery semántico, modelo Trust Score basado en ML.

**24 meses:** dispute resolution on-chain, insurance pool para pagos fallidos, agentes federados firmando reputación mutua, integraciones con wallets agénticas.

## 4. Modelo de negocio

### 4.1 Capas de monetización

| Capa | Producto | Cliente | Precio |
|---|---|---|---|
| **Infra abierta** | Middleware x402, contrato Soroban, catálogo público | Providers, todos | Gratis (open source) |
| **Listing premium** | Verificación KYB acelerada, badge destacado | Providers | $50-500/mes (recurrente) |
| **API Pro** | `/api/recommend` sin rate limit, scoring extendido, SLA | Builders de agentes | Pay-per-call (USDC nativo): $0.001-0.01/req |
| **Intelligence Enterprise** | Insights agregados de mercado, alertas de fraude, exportación de datos | Anchors, exchanges, fondos | $2k-20k/mes |
| **Disputes & Insurance** (24m) | Resolución de disputas + pool de seguros | Providers + agentes | 0.5% sobre volumen asegurado |

### 4.2 Unit economics (proyección año 1, mainnet)

| Métrica | Valor base | Notas |
|---|---|---|
| Providers activos | 500 | 50 premium ($200/m promedio) → $10k MRR |
| Agentes consumiendo API Pro | 2,000 | 1M requests/mes × $0.003 = $3k MRR |
| Enterprise contracts | 5 | $8k promedio → $40k MRR |
| **MRR total año 1** | **$53k** | ARR ~ $640k |
| Costos infra + LLM | $4k/mes | escala con uso |
| Costo equipo (3 personas) | $25k/mes | dev + diseño + comercial |
| **Burn neto año 1** | ~$0 (ya breakeven a los 12 meses) | depende de crecimiento |

### 4.3 Por qué Stellar es el lugar correcto para construir esto
- **USDC nativo y de Circle directo** → confianza institucional.
- **Fees ~0** → micropagos viables ($0.001/call no se come por gas).
- **Finalidad 5 segundos** → UX agéntica fluida.
- **Anchors regulados** → único ecosistema cripto con KYB nativo de stack.
- **SCF activo** → financiamiento y comunidad para builders.
- **Soroban joven pero estable** → menos competencia, más diferenciación.

## 5. Go-to-market

### 5.1 Fase 0 (hackathon SCF, mes 0)
- Demo público funcional.
- 5 providers seedeados.
- Aplicación SCF para grant Build (típicamente $15k-50k).
- Comunidad: post de lanzamiento en X / Stellar Discord / dev.to.

### 5.2 Fase 1 (meses 1-3) — Tracción técnica
- Migrar a mainnet con 20 providers reales.
- Integrar 1-2 anchors verdaderos (Stellar Anchor Directory).
- Publicar SDK en npm.
- Lograr 10 builders externos usando la API.
- KPI: 100k requests procesadas, 50 wallets de agentes únicas.

### 5.3 Fase 2 (meses 4-9) — Producto comercial
- Lanzar tier Premium para providers.
- Lanzar tier API Pro con pagos USDC en mainnet.
- Conseguir 3 clientes Enterprise (anchors, fintechs, wallets).
- Hire: 1 developer fullstack, 1 BD.
- KPI: $20k MRR.

### 5.4 Fase 3 (meses 10-18) — Expansión
- Verificaciones tier 3 (institucional).
- Disputes & insurance pool.
- Conferencias: Meridian, ETHGlobal stops.
- Levantar pre-seed / seed ($1-3M).
- KPI: $100k MRR.

## 6. Competencia

| Competidor | Cadena | Qué hace | Por qué no compite directo |
|---|---|---|---|
| **Coinbase x402** | Multi (EVM) | Protocolo x402 spec | Es el protocolo, no la inteligencia. Podemos ser amigos. |
| **HitPay MPP** | Multi | Machine Payments Protocol | Distinto enfoque (B2B billing). No Stellar nativo. |
| **Bitquery / Dune** | Multi | Indexing on-chain | Datos crudos. No verticalizado a agentes. |
| **Soroswap, otros DEX en Stellar** | Stellar | Trading | Producto distinto, no overlapping. |
| **Chainalysis** | Multi | Compliance / KYB | Enterprise tradicional, no agent-centric. |
| **Nadie** | **Stellar** | **Agent intelligence + payments** | **Nuestro hueco.** |

## 7. Equipo

(Sección para llenar con datos reales del solicitante. Sugerencia para SCF:)

- **Founder técnico:** DonCervantes — experiencia previa en POC de inteligencia de pagos agénticos (repo público), background X.
- **Asesores potenciales:** sumar 1-2 advisors del ecosistema Stellar (devs experimentados en Soroban, o gente de un anchor).
- **Roadmap de hires:** mes 4 — fullstack senior; mes 8 — BD/partnerships; mes 12 — designer.

## 8. Pedido SCF

### 8.1 Programa apuntado
**SCF Build** — para proyectos con demo funcional buscando construir a producción.

### 8.2 Monto solicitado (orientativo)
**$25,000 USD en XLM**, distribuidos en milestones:

| Milestone | Entregable | % del grant |
|---|---|---|
| M1 (mes 1) | Mainnet deploy con 10 providers reales y 1 anchor integrado | 25% |
| M2 (mes 3) | SDK publicado + 5 builders externos integrados | 25% |
| M3 (mes 6) | API Pro con 100k requests procesadas, $5k MRR | 25% |
| M4 (mes 9) | Modelo Trust Score 2.0 + dispute resolution v1 | 25% |

### 8.3 Uso de fondos
- 60% desarrollo (contractors específicos: auditor Soroban, designer)
- 20% infra y servicios (Anthropic, hosting, audits)
- 15% community / contenido (docs, tutoriales, video series)
- 5% legal (entidad, tos)

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Adopción lenta de pagos agénticos | Cabeza de playa: integrar primero con builders existentes que YA pagan por APIs (no esperar a que el mundo cambie). |
| x402 no se estandariza | Implementación es agnóstica; podemos pivotar a otro estándar con el mismo backend. |
| Competencia de Coinbase / big players | Nuestra ventaja es ser Stellar-nativo + reputación + KYB. Si entra Coinbase, los integramos. |
| Regulación | Sólo procesamos USDC (Circle), no custodiamos. Trabajamos con anchors regulados. |
| Equipo solo | SCF + advisors + comunidad Stellar. Open source acelera contribuciones. |

## 10. Métricas clave (north stars)

- **Volumen USDC procesado vía x402-Stellar** (mensual)
- **N° de agentes únicos** que consumen la API
- **% de providers con KYB verified**
- **Trust Score promedio del catálogo** (calidad del marketplace)
- **MRR** (sustentabilidad)

## 11. Visión a 5 años

Flovia es el estándar de hecho para que **cualquier agente autónomo opere económicamente** en internet. Cuando un LLM en 2030 necesite pagar por algo, la pregunta no será "¿cómo pago?" sino "¿qué provider de Flovia uso?" — del mismo modo que hoy un humano no se pregunta cómo enviar un email, se pregunta a quién escribir.

Stellar se vuelve, gracias a Flovia y a la primitiva USDC, **la red de settlement por defecto para la economía agéntica global**.
