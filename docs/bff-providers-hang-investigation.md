# BFF `/providers` Hang Investigation

Date: 2026-05-30

## Summary

The instance hang is caused by two related problems in the BFF analytics read
model path:

1. `BFF_ANALYTICS_POSTGRES_MODE=live` runs two large live aggregation queries
   during BFF startup. On the real database, both the provider and customer live
   queries exceeded a 120 second statement timeout.
2. The generated provider catalog can contain extremely large `resources`
   arrays. In the current `latest` snapshot, one provider, `orbisapi.com`,
   accounts for about 17.7 MB of the 18.6 MB `/providers` response because it
   has 21,609 resources in the snapshot.

This makes `/providers` appear to trigger the hang, but the heavy work starts
before the request: `createBffHandler()` begins analytics preload at process
startup. Once the preload reaches `ready`, `/providers` serializes the full
provider catalog into one large JSON response, causing additional CPU and memory
pressure.

## Environment Observed

The `.env` loaded by the BFF reported:

- `BFF_ANALYTICS_SOURCE=postgres`
- `BFF_ANALYTICS_POSTGRES_MODE=live`
- `BFF_ANALYTICS_DATABASE_URL` was present

The database name in the provided URL did not exist. Using the same connection
credentials, the database server exposed `poc_data_test`, which contained all
tables used by the BFF live read model.

Relevant table estimates in `poc_data_test`:

| Table | Estimated rows | Size |
| --- | ---: | ---: |
| `goldsky_webhook_transfers_x402_paytos` | 2,731,721 | 3,644 MiB |
| `token_transfers` | 214,700 | 400 MiB |
| `x402_payment_options` | 34,164 | 38 MiB |
| `x402_resources` | 34,139 | 59 MiB |
| `pay_sh_providers` | 78 | less than 1 MiB |
| `pay_sh_payment_offers` | 178 | less than 1 MiB |
| `pay_sh_provider_resources` | 62 | less than 1 MiB |
| `bff_analytics_snapshots` | 1 | 42 MiB |

## Runtime Path

The BFF starts analytics preload when the handler is created:

```ts
// apps/bff/src/http.ts
export const createBffHandler = (...) => {
  let analyticsState: AnalyticsLoadState;

  const preloadAnalytics = (): Promise<BffAnalyticsDataSource> => {
    try {
      const resolved = dataSource ?? resolveAnalyticsDataSource();
      ...
    } catch (error) {
      ...
    }
  };

  void preloadAnalytics();

  return async (request: Request, server?: RequestTimeoutController) => {
    ...
  };
};
```

When the data source is ready, `/providers` returns the whole provider catalog:

```ts
// apps/bff/src/http.ts
switch (path) {
  case "/providers":
    return cachedJson(activeDataSource.providers);
  ...
}
```

`cachedJson()` still uses `Response.json()`, so the complete provider object is
serialized on every response:

```ts
// apps/bff/src/http/responses.ts
export const json = (body: JsonValue, init: ResponseInit = {}) =>
  Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init.headers ?? {}),
    },
  });

export const cachedJson = (body: JsonValue, init: ResponseInit = {}) =>
  json(body, {
    ...init,
    headers: {
      "cache-control": SNAPSHOT_CACHE_CONTROL,
      ...(init.headers ?? {}),
    },
  });
```

## Live Postgres Mode

In live mode, the BFF runs the provider and customer queries in parallel during
startup:

```ts
// apps/bff/src/data/postgres-live/source.ts
export const loadPostgresLiveAnalyticsPayload = async (
  client: PostgresAnalyticsClient,
): Promise<GeneratedReadModelFile> => {
  const [providerRows, customerRows] = await Promise.all([
    client.query(POSTGRES_LIVE_PROVIDER_QUERY),
    client.query(POSTGRES_LIVE_CUSTOMER_QUERY),
  ]);
  return buildPayload(providerRows.map(mapProviderRow), customerRows.map(mapCustomerRow));
};
```

On the real database:

- `POSTGRES_LIVE_PROVIDER_QUERY` exceeded `statement_timeout = 120000`.
- `POSTGRES_LIVE_CUSTOMER_QUERY` exceeded `statement_timeout = 120000`.

The provider query plan had a top-level estimated cost of `367230` and includes
high-cost nested loops around provider/resource aggregation.

The provider query also aggregates all resources for matching pay-to rows with
no upper bound:

```sql
-- apps/bff/src/data/postgres-live/queries.ts
LEFT JOIN LATERAL (
  SELECT jsonb_agg(resource ORDER BY resource ->> 'resource') AS resources
  FROM (
    SELECT jsonb_build_object(
      'resource', r.resource_url,
      'network', po.chain,
      'asset', CASE
        WHEN lower(po.token_address) = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' THEN 'USDC'
        ELSE po.token_address
      END,
      'amountAtomic', po.amount_atomic::text,
      'description', r.raw ->> 'description',
      'method', r.raw #>> '{extensions,bazaar,info,input,method}',
      'inputSchema', r.raw #> '{extensions,bazaar,schema}',
      'lastUpdated', r.raw ->> 'lastUpdated',
      'x402Version', r.raw -> 'x402Version',
      'l30DaysTotalCalls', r.raw #> '{quality,l30DaysTotalCalls}',
      'l30DaysUniquePayers', r.raw #> '{quality,l30DaysUniquePayers}'
    ) AS resource
    FROM x402_payment_options po
    JOIN x402_resources r ON r.resource_id = po.resource_id
    WHERE ...
  ) resource_rows
) resources ON true
```

The customer query similarly aggregates all timeline events first:

```sql
-- apps/bff/src/data/postgres-live/queries.ts
jsonb_agg(
  jsonb_build_object(
    'at', to_timestamp(g.block_timestamp),
    'amountAtomic', g.amount::text,
    'transactionId', g.transaction_hash
  ) ORDER BY g.block_timestamp DESC, g.transaction_hash DESC
) AS timeline_events
```

Later, TypeScript slices timelines to 20 entries, but the database has already
built and returned the full `jsonb_agg`.

## Payload Builder CPU and Memory Amplification

After the SQL queries return, the live rows are converted into a full read model.
The wallet graph currently scans all customer-provider rows for each provider:

```ts
// apps/bff/src/data/postgres-live/payload-builder.ts
walletGraphProviders.map((provider) => ({
  ...
  payerWallets: customerProviderRows
    .filter(
      (customer) =>
        customer.payTo === provider.payTo &&
        customer.network === provider.network &&
        customer.asset === provider.asset,
    )
    .map((customer) => ({
      ...
    })),
  ...
}));
```

This is `O(providerRows * customerRows)`. It is avoidable because
`customerProviderRows` can be indexed by `(network, asset, payTo)` once.

The builder also creates every customer profile eagerly:

```ts
// apps/bff/src/data/postgres-live/payload-builder.ts
profilesByAddress: Object.fromEntries(
  customers.map((customer) => [
    customer.payer,
    {
      generatedAt: now,
      generatedFrom: "postgres-live-read-model",
      ...
      profile: {
        ...
        providers: customer.providers.map((provider) => ({
          ...
        })),
        timeline: timelineForCustomer(customer),
        ...
      },
    },
  ]),
),
```

Then the generic JSON read model loader validates and indexes the whole payload:

```ts
// apps/bff/src/data/json-read-model-source.ts
export const loadGeneratedAnalyticsDataSourceFromPayload = (
  payload: GeneratedReadModelFile,
): BffAnalyticsDataSource => {
  const customers = validatePhaseBCustomerListResponse(...);
  const profilesByAddress = Object.fromEntries(
    Object.entries(payload.profilesByAddress ?? {}).map(([address, profile]) => [
      normalizePaymentRecipientAddress(address),
      validatePhaseBCustomerProfileResponse(profile),
    ]),
  );
  ...
  const walletUsageGraph = validatePhaseBWalletUsageGraphResponse(...);
  const providers = validateProviderCatalogResponse(...);
  ...
};
```

## Snapshot Findings

The `latest` snapshot exists, but `payload` is stored as a JSON string inside a
`jsonb` column rather than as a JSON object. The BFF still handles this because
the snapshot loader parses strings:

```ts
// apps/bff/src/data/postgres-source.ts
const rawPayload = rows[0]?.payload;
const payload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
```

Measured snapshot load behavior using `id = 'latest'`:

| Metric | Value |
| --- | ---: |
| DB fetch time | 23,843 ms |
| `JSON.parse` time | 209 ms |
| schema validation/load time | 636 ms |
| providers | 238 |
| customers | 9,662 |
| graph provider wallets | 238 |
| serialized providers response | 18,574,466 bytes |
| RSS delta during load | about 2,350 MiB |
| heap used after load | about 423 MiB |

Measured `/providers` response generation after loading the snapshot:

| Metric | Value |
| --- | ---: |
| response status | 200 |
| response bytes | 18,574,466 |
| response generation time | 34 ms |
| extra RSS delta | about 55 MiB |
| heap used after response | about 438 MiB |

The provider catalog is dominated by one row:

| Provider | Resources | Serialized row size |
| --- | ---: | ---: |
| `orbisapi.com` | 21,609 | 17,687,988 bytes |
| `api.nansen.ai` | 39 | 50,534 bytes |
| `silverback-x402.onrender.com` | 35 | 44,836 bytes |
| `agents.402box.io` | 103 | 39,988 bytes |
| `public.zapper.xyz` | 17 | 33,639 bytes |

The database resource distribution confirms this is not a serialization
artifact:

| Service | Active resources |
| --- | ---: |
| `orbisapi.com` | 21,614 |
| `lowpaymentfee.com` | 10,048 |
| `api.strale.io` | 270 |
| `api.the402.ai` | 96 |
| `api.carbon-cashmere.de` | 93 |

## Root Cause

The root cause is an unbounded read-model design being used in an online BFF
process.

Specifically:

- Startup preload runs live Postgres aggregations synchronously in the BFF
  process.
- The live SQL aggregates all resources and all timeline events without caps.
- The TypeScript builder eagerly builds provider catalog, customer list, wallet
  graph, service analytics, and all customer profiles.
- The wallet graph builder has an avoidable `O(P*C)` scan.
- `/providers` returns the full provider catalog including all nested
  `resources`.
- The real catalog contains providers with tens of thousands of resources.

This explains the observed timing:

1. BFF starts and begins analytics preload.
2. CPU and memory grow while live queries and read-model construction run.
3. Calling `/providers` after the model becomes ready forces serialization of a
   very large provider catalog.
4. On small instances, this can exhaust memory or make the event loop appear
   hung.

## Recommended Fixes

### 1. Do Not Serve Production Traffic From `live` Mode

Use snapshot or JSON mode for the BFF serving process. Live generation should be
an offline job with explicit resource limits.

Suggested operational default:

```env
BFF_ANALYTICS_SOURCE=postgres
BFF_ANALYTICS_POSTGRES_MODE=snapshot
BFF_ANALYTICS_SNAPSHOT_ID=latest
```

This is only safe after regenerating a bounded snapshot. The current snapshot is
still too large for `/providers`.

### 2. Make `/providers` a Summary Endpoint

`GET /providers` should not include full `resources`. It should return summary
metadata:

- `providerId`
- `name`
- `serviceId`
- `network`
- `asset`
- `payTo`
- `transactionCount`
- `uniqueSenderCount`
- `totalVolumeAtomic`
- `endpointCount`
- `resourceCount`
- optional small descriptive fields

Move resource details to a separate paginated endpoint:

```http
GET /providers/:providerId/resources?limit=100&cursor=...
```

This directly removes the 18.6 MB response and prevents one provider from
dominating the list endpoint.

### 3. Cap Resource Aggregation in Snapshot Generation

If provider summaries still need sample resources, cap them at generation time.
Preserve the real `resourceCount`, but include only the first N resources.

Example approach:

```sql
WITH ranked_resources AS (
  SELECT
    ...,
    row_number() OVER (
      PARTITION BY normalized_pay_to
      ORDER BY r.resource_url
    ) AS resource_rank,
    count(*) OVER (PARTITION BY normalized_pay_to) AS resource_count
  FROM ...
)
SELECT jsonb_agg(resource ORDER BY resource_url)
FROM ranked_resources
WHERE resource_rank <= 100;
```

This must be applied in both raw x402 and Pay.sh resource paths.

### 4. Cap Timeline Aggregation in SQL

Do not aggregate every transaction into `timeline_events` and then slice in
TypeScript. Rank events first and aggregate only the latest N.

Example approach:

```sql
WITH ranked_events AS (
  SELECT
    ...,
    row_number() OVER (
      PARTITION BY payer, pay_to, service_id
      ORDER BY block_timestamp DESC, transaction_hash DESC
    ) AS event_rank
  FROM ...
)
SELECT jsonb_agg(...) AS timeline_events
FROM ranked_events
WHERE event_rank <= 20
GROUP BY ...
```

### 5. Replace Provider-by-Customer Scans With an Index

Build a map once:

```ts
const customerRowsByProviderKey = new Map<string, CustomerRow[]>();
for (const row of customerProviderRows) {
  const key = `${row.network}\0${row.asset}\0${row.payTo}`;
  const rows = customerRowsByProviderKey.get(key) ?? [];
  rows.push(row);
  customerRowsByProviderKey.set(key, rows);
}
```

Then read rows by key inside `walletGraphProviders.map(...)`. This changes the
hot path from `O(P*C)` to `O(P+C)`.

### 6. Store Snapshots as JSON Objects, Not JSON Strings

The current `bff_analytics_snapshots.payload` rows are `jsonb` strings
containing escaped JSON. Store them as actual JSON objects so database-side
inspection and indexing remain usable.

The current write path is:

```ts
// apps/bff/src/data/postgres-source.ts
await client.query(
  `INSERT INTO bff_analytics_snapshots (id, payload)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (id) DO UPDATE
     SET payload = EXCLUDED.payload,
         updated_at = now()`,
  [snapshotId, JSON.stringify(payload)],
);
```

Adjust the Bun SQL client path so the second parameter is inserted as a JSON
object, not as a JSON string value. Add a regression test that checks
`jsonb_typeof(payload) = 'object'`.

### 7. Add Guardrails

Add hard limits so a bad snapshot cannot take down the process:

- Maximum provider row bytes.
- Maximum `/providers` response bytes.
- Maximum resources per provider row.
- Maximum timeline events per customer-provider row.
- Startup logging for provider count, resource count, response bytes, heap, and
  RSS.
- Readiness failure when limits are exceeded.

## Suggested Implementation Plan

1. Add tests first.
   - `/providers` does not include full `resources` by default.
   - provider rows keep `resourceCount` and optionally `sampleResources`.
   - SQL row mappers/builders cap resources and timelines.
   - `buildPayload` uses an indexed customer lookup and still returns the same
     graph shape for small fixtures.
   - snapshot persistence stores JSON objects, not JSON strings.

2. Implement the summary provider response.
   - Keep the existing contract for internal read model if needed.
   - Add a response adapter for public `/providers`.
   - Add a paginated resources route only if the frontend needs full resources.

3. Refactor live SQL generation.
   - Limit resource arrays and timelines before `jsonb_agg`.
   - Keep counts as separate fields.
   - Re-run `EXPLAIN (ANALYZE, BUFFERS)` against the real DB after limits.

4. Refactor `buildPayload`.
   - Build `customerRowsByProviderKey`.
   - Use the map in `walletUsageGraph`.
   - Avoid repeated `apiPathsForProvider(provider)` calls.

5. Regenerate `latest` snapshot.
   - Verify `/providers` is small enough for the target instance.
   - Verify BFF `ready` time, RSS, heap, and `/providers` response size.

## Acceptance Criteria

- `GET /providers` response size is below a configured threshold, preferably
  less than 1 MB for the current dataset.
- BFF startup in snapshot mode stays comfortably below the instance memory
  limit.
- BFF serving process does not run `POSTGRES_LIVE_PROVIDER_QUERY` or
  `POSTGRES_LIVE_CUSTOMER_QUERY`.
- Live snapshot generation is an explicit offline command with statement
  timeout and output-size limits.
- A provider with tens of thousands of resources cannot make the list endpoint
  return tens of MB.
