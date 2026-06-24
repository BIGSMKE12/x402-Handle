# BFF `/providers` ハング調査

調査日: 2026-05-30

## 要約

BFFインスタンスがハングする原因は、BFFのanalytics read model経路にある2つの問題です。

1. `BFF_ANALYTICS_POSTGRES_MODE=live`のとき、BFF起動時に大きなlive集計クエリが2本走ります。実DBではprovider queryとcustomer queryの両方が120秒のstatement timeoutを超えました。
2. 生成済みprovider catalogが巨大な`resources`配列を含みます。現在の`latest` snapshotでは、`/providers`レスポンス約18.6MBのうち約17.7MBを`orbisapi.com` 1件が占めています。このproviderはsnapshot内で21,609件のresourcesを持っています。

そのため、見かけ上は`/providers`がハングを引き起こしているように見えますが、重い処理はリクエスト前、つまりBFF起動時のanalytics preloadですでに始まっています。preloadが`ready`になった後に`/providers`を呼ぶと、BFFが巨大なprovider catalog全体をJSONシリアライズするため、CPUとメモリ使用量がさらに増えます。

## 観測した環境

`.env`でBFFに読み込まれていた設定は以下でした。

- `BFF_ANALYTICS_SOURCE=postgres`
- `BFF_ANALYTICS_POSTGRES_MODE=live`
- `BFF_ANALYTICS_DATABASE_URL`あり

ただし、指定されていたDB名は存在しませんでした。同じ接続情報で見えるDBのうち、BFFが利用する全テーブルを持っていたのは`poc_data_test`でした。そのため調査ではDB名のみ`poc_data_test`に差し替えてread-onlyで確認しました。

`poc_data_test`の関連テーブル規模は以下です。

| テーブル | 推定行数 | サイズ |
| --- | ---: | ---: |
| `goldsky_webhook_transfers_x402_paytos` | 2,731,721 | 3,644 MiB |
| `token_transfers` | 214,700 | 400 MiB |
| `x402_payment_options` | 34,164 | 38 MiB |
| `x402_resources` | 34,139 | 59 MiB |
| `pay_sh_providers` | 78 | 1 MiB未満 |
| `pay_sh_payment_offers` | 178 | 1 MiB未満 |
| `pay_sh_provider_resources` | 62 | 1 MiB未満 |
| `bff_analytics_snapshots` | 1 | 42 MiB |

## 実行経路

BFFはhandler生成時にanalytics preloadを開始します。

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

analytics data sourceがreadyになると、`/providers`はprovider catalog全体を返します。

```ts
// apps/bff/src/http.ts
switch (path) {
  case "/providers":
    return cachedJson(activeDataSource.providers);
  ...
}
```

`cachedJson()`はキャッシュヘッダを付けるだけで、実体は`Response.json()`です。そのためリクエストごとにprovider catalog全体がJSON化されます。

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

## Postgres live modeの問題

live modeでは、BFF起動時にprovider queryとcustomer queryを並列実行します。

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

実DBでの結果は以下です。

- `POSTGRES_LIVE_PROVIDER_QUERY`は`statement_timeout = 120000`を超過しました。
- `POSTGRES_LIVE_CUSTOMER_QUERY`も`statement_timeout = 120000`を超過しました。

provider queryのplanはtop-level推定costが`367230`で、provider/resource集計周辺に高コストなnested loopが含まれていました。

provider queryでは、providerに紐づくresourcesを上限なしで集約しています。

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

customer queryもtimeline eventsを上限なしで集約しています。

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

TypeScript側では後からtimelineを20件に切っていますが、その時点ではDBがすでに全件の`jsonb_agg`を構築し、BFFへ返しています。つまり、アプリ側のsliceはDB負荷と転送量を削減できていません。

## Payload builderによるCPU/メモリ増幅

SQLの結果が返った後、BFFはlive rowsからread model全体をメモリ上で構築します。wallet graph構築では、各providerごとに全customer-provider rowsをscanしています。

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

これは`O(providerRows * customerRows)`です。`customerProviderRows`を`(network, asset, payTo)`で一度index化すれば`O(providerRows + customerRows)`にできます。

また、すべてのcustomer profileも起動時にeagerに生成されます。

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

その後、汎用のJSON read model loaderがpayload全体をvalidationし、lookup用のindexも構築します。

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

## Snapshotで確認した問題

`latest` snapshotは存在しますが、`payload`は`jsonb` column内にJSON objectとしてではなく、JSON文字列として保存されています。BFF側は文字列の場合に`JSON.parse`するため動作はします。

```ts
// apps/bff/src/data/postgres-source.ts
const rawPayload = rows[0]?.payload;
const payload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
```

`id = 'latest'`のsnapshot load実測値は以下です。

| 指標 | 値 |
| --- | ---: |
| DB fetch time | 23,843 ms |
| `JSON.parse` time | 209 ms |
| schema validation/load time | 636 ms |
| providers | 238 |
| customers | 9,662 |
| graph provider wallets | 238 |
| serialized providers response | 18,574,466 bytes |
| load中のRSS増加 | 約2,350 MiB |
| load後のheap used | 約423 MiB |

snapshot load後に`/providers`相当のresponseを生成した実測値は以下です。

| 指標 | 値 |
| --- | ---: |
| response status | 200 |
| response bytes | 18,574,466 |
| response generation time | 34 ms |
| 追加RSS増加 | 約55 MiB |
| response後のheap used | 約438 MiB |

provider catalogは1件のproviderに支配されています。

| Provider | Resources | Serialized row size |
| --- | ---: | ---: |
| `orbisapi.com` | 21,609 | 17,687,988 bytes |
| `api.nansen.ai` | 39 | 50,534 bytes |
| `silverback-x402.onrender.com` | 35 | 44,836 bytes |
| `agents.402box.io` | 103 | 39,988 bytes |
| `public.zapper.xyz` | 17 | 33,639 bytes |

DB上のactive resources分布でも同じ傾向が確認できました。

| Service | Active resources |
| --- | ---: |
| `orbisapi.com` | 21,614 |
| `lowpaymentfee.com` | 10,048 |
| `api.strale.io` | 270 |
| `api.the402.ai` | 96 |
| `api.carbon-cashmere.de` | 93 |

## 根本原因

根本原因は、上限のないread-model生成をonline BFF processで実行していることです。

具体的には以下です。

- BFF起動時preloadでlive Postgres集計を同期的に開始している。
- live SQLがresourcesとtimeline eventsを上限なしで集約している。
- TypeScript builderがprovider catalog、customer list、wallet graph、service analytics、全customer profilesを一括生成している。
- wallet graph生成に回避可能な`O(P*C)` scanがある。
- `/providers`が全provider catalogを返し、その中に全`resources`配列も含まれる。
- 実データには数万件のresourcesを持つproviderが存在する。

そのため、発生順序は以下になります。

1. BFFが起動し、analytics preloadを始める。
2. live queryとread model構築でCPU/メモリが増える。
3. read modelがreadyになった後に`/providers`を呼ぶと、巨大なprovider catalog全体をJSONシリアライズする。
4. 小さいインスタンスではメモリ枯渇、またはevent loopが固まったような状態になる。

## 修正案

### 1. 配信BFFで`live` modeを使わない

BFF serving processではsnapshotまたはJSON modeを使うべきです。live generationは明示的なoffline jobとして分離します。

運用上の推奨設定:

```env
BFF_ANALYTICS_SOURCE=postgres
BFF_ANALYTICS_POSTGRES_MODE=snapshot
BFF_ANALYTICS_SNAPSHOT_ID=latest
```

ただし、現在のsnapshotも`/providers`が巨大なので、bounded snapshotを再生成してから使う必要があります。

### 2. `/providers`をsummary endpointにする

`GET /providers`はfull `resources`を含めないべきです。provider一覧として必要なsummary metadataだけ返します。

返す候補:

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
- 必要最小限の説明フィールド

resources詳細は別のページングAPIに分離します。

```http
GET /providers/:providerId/resources?limit=100&cursor=...
```

これにより、現在18.6MBある`/providers` responseと、1 providerが一覧APIを支配する問題を直接解消できます。

### 3. Snapshot生成時にresources集約へ上限を入れる

provider summaryでsample resourcesが必要な場合でも、生成時に件数を制限します。実際の`resourceCount`は保持し、responseに含めるresourcesは先頭N件だけにします。

方針例:

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

raw x402由来とPay.sh由来の両方のresource pathに適用する必要があります。

### 4. Timeline集約をSQL側で制限する

全transactionを`timeline_events`へ集約してからTypeScriptでsliceしてはいけません。SQL側でrankを付け、最新N件だけを`jsonb_agg`します。

方針例:

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

### 5. Providerごとのcustomer scanをindex化する

現在はproviderごとに全customer rowsをfilterしています。これを事前index化します。

```ts
const customerRowsByProviderKey = new Map<string, CustomerRow[]>();
for (const row of customerProviderRows) {
  const key = `${row.network}\0${row.asset}\0${row.payTo}`;
  const rows = customerRowsByProviderKey.get(key) ?? [];
  rows.push(row);
  customerRowsByProviderKey.set(key, rows);
}
```

`walletGraphProviders.map(...)`内ではkeyで取得するだけにします。これでhot pathは`O(P*C)`から`O(P+C)`になります。

### 6. SnapshotをJSON文字列ではなくJSON objectとして保存する

現在の`bff_analytics_snapshots.payload`は`jsonb`内にescaped JSON stringとして入っています。DB側での検査やindex化を可能にするため、JSON objectとして保存します。

現在のwrite path:

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

Bun SQL client経路で、2番目のparameterがJSON string valueではなくJSON objectとしてinsertされるよう修正します。あわせて`jsonb_typeof(payload) = 'object'`を確認するregression testを追加します。

### 7. Guardrailsを追加する

悪いsnapshotや想定外のproviderがprocessを落とさないよう、hard limitを入れます。

- provider row bytesの上限
- `/providers` response bytesの上限
- providerあたりresources数の上限
- customer-provider rowあたりtimeline events数の上限
- 起動時にprovider count、resource count、response bytes、heap、RSSをlog出力
- limit超過時はreadiness failureにする

## 推奨実装順序

1. 先にテストを追加する。
   - `/providers`がdefaultではfull `resources`を含まないこと。
   - provider rowsが`resourceCount`を保持すること。
   - SQL row mapper/builderがresourcesとtimelinesを制限すること。
   - `buildPayload`がindexed customer lookupを使っても小さいfixtureでは同じgraph shapeを返すこと。
   - snapshot persistenceがJSON文字列ではなくJSON objectを保存すること。

2. provider summary responseを実装する。
   - 内部read model contractは必要なら維持する。
   - public `/providers`用のresponse adapterを追加する。
   - frontendがfull resourcesを必要とする場合のみ、paginated resources routeを追加する。

3. live SQL generationを修正する。
   - `jsonb_agg`前にresourcesとtimelinesを制限する。
   - 実件数は別countとして残す。
   - 修正後に実DBで`EXPLAIN (ANALYZE, BUFFERS)`を実行する。

4. `buildPayload`をrefactorする。
   - `customerRowsByProviderKey`を作る。
   - `walletUsageGraph`生成でmapを使う。
   - `apiPathsForProvider(provider)`の重複呼び出しも避ける。

5. `latest` snapshotを再生成する。
   - `/providers`がtarget instanceで安全なサイズになったことを確認する。
   - BFFの`ready`時間、RSS、heap、`/providers` response sizeを確認する。

## 完了条件

- `GET /providers` response sizeが設定した閾値以下になる。現在のdatasetではできれば1MB未満。
- snapshot modeでのBFF起動がtarget instanceのmemory limitを十分下回る。
- BFF serving processが`POSTGRES_LIVE_PROVIDER_QUERY`や`POSTGRES_LIVE_CUSTOMER_QUERY`を実行しない。
- live snapshot generationが、statement timeoutとoutput-size limitを持つ明示的なoffline commandになる。
- resourcesを数万件持つproviderが存在しても、一覧APIが数十MBを返さない。
