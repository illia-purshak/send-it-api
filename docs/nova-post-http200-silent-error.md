# Bug: Nova Post API повертає HTTP 200 при помилках

**Файл:** `src/module/user/postal-connections/nova-post/nova-post-api.client.ts`  
**Метод:** `NovaPostApiClient.request()`  
**Severity:** Medium — призводить до `500 Internal Server Error` замість чистого повідомлення про помилку з'єднання

---

## Суть проблеми

Nova Post (і класична Nova Poshta v2 JSON-RPC API) може повертати HTTP `200 OK` навіть при помилці на рівні застосунку:

```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": false,
  "errors": ["API key is invalid or expired"]
}
```

Поточний клієнт (`nova-post-api.client.ts`) перевіряє тільки HTTP-статус через `response.ok` (тобто `status >= 200 && status < 300`). Якщо прийшов `200` з `success: false` — він вважає відповідь успішною та намагається десеріалізувати тіло як очікуваний тип `T`.

---

## Де падає

### `fetchAllShipments` (`nova-post-shipments.service.ts:237`)

```typescript
const firstPage = await this.apiClient.request<NovaPostPaginatedResponse>(...);
const items = [...firstPage.items];
//                           ↑ undefined якщо response = { success: false, errors: [...] }
//                             → TypeError: undefined is not iterable → HTTP 500
```

### `fetchShipmentByNumber` (`nova-post-shipments.service.ts:277`)

```typescript
const item = response.items[0];
//                    ↑ TypeError: Cannot read properties of undefined
```

### `createShipment` (`nova-post-shipments.service.ts:120`)

```typescript
const body = await this.apiClient.request<NovaPostCreateResponse>(...);
const normalizedStatus = mapNovaPostStatus(body.status);
//                                              ↑ undefined → UNKNOWN статус без помилки
```

---

## Поточна поведінка vs. Очікувана

| Сценарій | Поточно | Очікувано |
|---|---|---|
| HTTP 401/403 | Retry + `markAsInvalid` + `422 CONNECTION_INVALID` | Правильно |
| HTTP 5xx | `503 OPERATOR_UNAVAILABLE` | Правильно |
| HTTP 200 + `{ success: false }` | `500 Internal Server Error` (TypeError) | `422 CONNECTION_INVALID` або `503 OPERATOR_ERROR` |
| HTTP 200 + `{ success: false, errors: ['Invalid key'] }` | `500 Internal Server Error` | `422 CONNECTION_INVALID` + маркування як `INVALID` |

---

## Пропозиції щодо виправлення

### Варіант A — Перевірка `success` поля одразу в `request()` (рекомендовано)

Додати перевірку тіла відповіді після `response.json()` безпосередньо в `NovaPostApiClient.request()`, щоб усі виклики через клієнт отримували захист автоматично.

```typescript
// nova-post-api.client.ts

if (!response.ok) {
  throw new ServiceUnavailableException({ code: 'OPERATOR_UNAVAILABLE', ... });
}

// ↓ додати після response.ok перевірки
const data = (await response.json()) as Record<string, unknown>;

if (data['success'] === false) {
  const errors = Array.isArray(data['errors']) ? (data['errors'] as string[]) : [];
  const firstError = errors[0] ?? 'Operator returned an application-level error';

  // Відрізнити помилку авторизації від загальної помилки оператора
  const isAuthError =
    firstError.toLowerCase().includes('invalid') ||
    firstError.toLowerCase().includes('key') ||
    firstError.toLowerCase().includes('unauthorized');

  if (isAuthError) {
    await this.postalConnectionsService.markAsInvalid(userId, postalServiceId);
    throw new UnprocessableEntityException({
      code: 'CONNECTION_INVALID',
      message: 'Your postal connection is no longer valid. Please reconnect.',
    });
  }

  throw new ServiceUnavailableException({
    code: 'OPERATOR_ERROR',
    message: firstError,
  });
}

return data as T;
```

**Переваги:** Одне місце — захищає всі методи (`getShipments`, `createShipment`, `deleteShipment`, `getDivisions`).  
**Недолік:** Потрібно розпарсити JSON до того як передати як `T`, але це фактично те, що робилося б і так.

---

### Варіант B — Тип-guard на рівні сервісу (не рекомендовано)

Перевіряти `success` у кожному методі `NovaPostShipmentsService` окремо:

```typescript
// nova-post-shipments.service.ts

const rawResponse = await this.apiClient.request<NovaPostPaginatedResponse | NovaPostErrorResponse>(...);

if ('success' in rawResponse && rawResponse.success === false) {
  throw new ServiceUnavailableException('Operator error');
}

const items = [...(rawResponse as NovaPostPaginatedResponse).items];
```

**Недолік:** Дублювання перевірки у кожному методі, легко забути в новому методі.

---

### Варіант C — Окремий `NovaPostErrorResponse` тип з discriminated union

```typescript
type NovaPostResponse<T> =
  | ({ success: true } & T)
  | { success: false; errors: string[] };

// В request():
const data = await response.json() as NovaPostResponse<T>;
if (data.success === false) { ... }
return data; // TypeScript тепер знає що це T & { success: true }
```

**Перевага:** TypeScript змушує обробляти обидва випадки.  
**Недолік:** Потребує зміни сигнатури `request<T>()` та всіх точок виклику; Nova Post може не завжди включати `success: true` у валідних відповідях.

---

## Рекомендований підхід

**Варіант A** — мінімальна зміна, максимальне покриття. Вся логіка залишається в одному місці (`NovaPostApiClient.request()`), жоден з сервісів не потребує змін.

Єдине що потрібно уточнити перед реалізацією: чи **завжди** Nova Post API включає `success: true` у валідних відповідях, чи поле `success` відсутнє при успіху. Перевірити на реальному запиті до `/shipments`. Якщо `success` не завжди присутній — перевіряти `data['success'] === false` (а не `!data['success']`), що вже і показано у Варіанті A.
