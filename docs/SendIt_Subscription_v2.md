# SendIt — Підписки v2

> Версія 2.0 · 2026
> Замінює SendIt_Subscription.md

---

## Зміст

1. [Модель плану підписки](#1-модель-плану-підписки)
2. [Feature Flags](#2-feature-flags)
3. [Onboarding Flow](#3-onboarding-flow)
4. [Пул підписок та черга](#4-пул-підписок-та-черга)
5. [Купівля підписки](#5-купівля-підписки)
6. [Переключення між підписками](#6-переключення-між-підписками)
7. [Автопродовження](#7-автопродовження)
8. [Вичерпання підписки та черга](#8-вичерпання-підписки-та-черга)
9. [Upgrade / Downgrade / Cancel](#9-upgrade--downgrade--cancel)
10. [Математика пауз і відновлення](#10-математика-пауз-і-відновлення)
11. [Річна підписка](#11-річна-підписка)
12. [Billing (мок)](#12-billing-мок)
13. [Адмін — управління підписками](#13-адмін--управління-підписками)
14. [Персональні підписки від адміна](#14-персональні-підписки-від-адміна)
15. [Admin Dashboard — метрики підписок](#15-admin-dashboard--метрики-підписок)
16. [Schema Changes](#16-schema-changes)
17. [Implementation Plan](#17-implementation-plan)

---

## 1. Модель плану підписки

SubscriptionPlan — загальний каталог планів. Містить feature flags і обмеження.

| Поле | Тип | Опис |
|------|-----|------|
| `id` | Int | |
| `name` | String | "Free", "Pro", "Business" або кастомна назва |
| `level` | Int | Числовий рівень: 0=FREE, 1=PRO, 2=BUSINESS, 3+=кастомні |
| `price` | Decimal | Місячна ціна (мок) |
| `priceYearly` | Decimal? | Річна ціна (мок). Null якщо річний план не доступний |
| `maxOperators` | Int | Максимальна кількість активних операторів |
| `hasAnalytics` | Boolean | Доступ до `/analytics` |
| `hasTemplates` | Boolean | Доступ до `/templates` |
| `hasRecipients` | Boolean | Доступ до `/recipients` |
| `hasSupport` | Boolean | Завжди true — підтримка не обмежується |
| `autoRenewDefault` | Boolean | Чи вмикати autoRenew за замовчуванням при купівлі |
| `isPublic` | Boolean | Відображається всім клієнтам |
| `isPersonal` | Boolean | Тільки для конкретного клієнта (призначає адмін) |
| `isActive` | Boolean | Чи доступний для нових купівель |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Стандартні плани (seed):**

| Рівень | Назва | maxOperators | hasAnalytics | hasTemplates | hasRecipients |
|--------|-------|-------------|--------------|--------------|---------------|
| 0 | Free | 1 | false | false | false |
| 1 | Pro | 999 | true | true | true |
| 2 | Business | 999 | true | true | true |

> FREE план: `isPublic=true`, `isActive=true`, `autoRenewDefault=true`, `price=0`.
> FREE не можна вручну "купити" через UI — він є дефолтним і завжди присутній як резервний.

---

## 2. Feature Flags

Feature flags визначаються на рівні `SubscriptionPlan` і застосовуються до активної підписки клієнта.

### 2.1 Що обмежується

| Flag | Що блокується |
|------|--------------|
| `hasAnalytics: false` | Сторінка `/analytics` недоступна. Показується заглушка з пропозицією upgrade. |
| `hasTemplates: false` | Сторінки `/templates`, `/templates/new` недоступні. Кнопка "Save as template" у формі прихована. |
| `hasRecipients: false` | Сторінка `/recipients` недоступна. Крок "Choose from address book" у формі прихований. |
| `maxOperators` | Кнопка "Connect" для нового оператора disabled якщо active connections >= maxOperators. |

### 2.2 Перевірка на бекенді

При кожному запиті до захищеного ресурсу (`/analytics`, `/templates`, `/recipients`) бекенд:
1. Визначає активну підписку клієнта
2. Перевіряє відповідний feature flag
3. Якщо `false` → повертає `403 FEATURE_NOT_AVAILABLE`

### 2.3 Передача плану у відповідях

При логіні та рефреші токену відповідь містить поточний план:

```json
{
  "accessToken": "...",
  "currentPlan": {
    "name": "Pro",
    "level": 1,
    "hasAnalytics": true,
    "hasTemplates": true,
    "hasRecipients": true,
    "maxOperators": 999
  },
  "scheduledPlan": {
    "name": "Business",
    "activatesAt": "2026-06-04T00:00:00Z"
  }
}
```

`scheduledPlan` — наступна запланована активація (якщо є). Null якщо немає.

---

## 3. Onboarding Flow

Залишається незмінним відносно v1. Гібрид contextual підказок і checklist.

### 3.1 Checklist на дашборді

```
☐  Заповніть профіль організації       → /profile
☐  Підключіть поштового оператора      → /profile (блок "Підключені оператори")
☐  Створіть перше відправлення         → /shipments/new
```

### 3.2 Contextual guards

- Без оператора → при спробі `/shipments/new` або `/templates/new` → редірект на `/profile` з toast
- FREE план → при спробі підключити другого оператора → Upsell модалка
- Feature flag false → при переході на заблоковану сторінку → заглушка з upgrade CTA

### 3.3 Upsell модалка

Відкривається при:
- Спробі підключити оператора понад ліміт плану
- Кліку на заблоковану feature (аналітика, шаблони, контакти)
- Кліку "Activate" на BLOCKED операторі

---

## 4. Пул підписок та черга

Кожен клієнт має **пул куплених підписок** — набір записів `UserSubscriptionBalance`, кожен з яких представляє оплачений пакет днів певного плану.

### 4.1 Структура балансу

| Поле | Опис |
|------|------|
| `id` | |
| `userId` | |
| `planId` | Який план |
| `periodType` | `MONTHLY` або `YEARLY` |
| `daysTotal` | Початкова кількість днів |
| `periodEnd` | Поточна дата закінчення (оновлюється при паузі/відновленні) |
| `pausedAt` | Коли поставлено на паузу (null якщо активна або вичерпана) |
| `status` | `ACTIVE` / `PAUSED` / `QUEUED` / `EXPIRED` |
| `autoRenew` | Чи продовжується автоматично |
| `position` | Порядок в черзі (1 = активна) |
| `createdAt` | |

**Статуси:**

| Статус | Опис |
|--------|------|
| `ACTIVE` | Поточна активна підписка. Дні рахуються. |
| `PAUSED` | На паузі — дні заморожені. Не рахуються. Зберігає `pausedAt`. |
| `QUEUED` | В черзі — чекає активації після завершення ACTIVE. |
| `EXPIRED` | Всі дні вичерпані. |

### 4.2 Правило: тільки одна ACTIVE

В будь-який момент клієнт має **рівно одну ACTIVE** підписку. Всі інші або QUEUED або PAUSED або EXPIRED.

### 4.3 Заборона FREE як активної при наявності платних

Якщо в пулі є хоч одна QUEUED або PAUSED платна підписка — FREE не може стати ACTIVE вручну. FREE активується автоматично тільки коли всі платні EXPIRED.

---

## 5. Купівля підписки

### 5.1 Флоу купівлі

```
Клієнт обирає план і period (MONTHLY / YEARLY)
        │
        ▼
Чи є вже ACTIVE підписка?
        │
   ні ──┴── так
   │              │
   ▼              ▼
Активувати     Показати вибір:
одразу         А) Активувати зараз (поточна → PAUSED, в кінець черги)
               Б) Додати в чергу (стане QUEUED, активується після поточної)
        │
        ▼
Створити UserSubscriptionBalance
periodEnd = завтра + daysTotal
status = ACTIVE або QUEUED
autoRenew = plan.autoRenewDefault
        │
        ▼
Якщо ACTIVE → застосувати feature flags та оновити maxOperators
Якщо нова maxOperators < попередньої → запустити operator blocking logic
Якщо нова maxOperators > попередньої → розблокувати оператори
        │
        ▼
Створити BillingHistory record
Створити SUBSCRIPTION notification
```

### 5.2 Докупівля того самого плану

Якщо в пулі вже є підписка того самого рівня (будь-який статус крім EXPIRED):
- **Підсумовуємо дні:** `periodEnd += daysTotal нової купівлі`
- Новий `BillingHistory` запис
- Не створюємо новий `UserSubscriptionBalance` запис

### 5.3 Варіант А — "Активувати зараз"

1. Поточна ACTIVE → `status = PAUSED`, `pausedAt = now()`
2. Нова підписка → `status = ACTIVE`, `periodEnd = tomorrow + daysTotal`
3. Попередня PAUSED стає в кінець черги (найбільший `position`)
4. Застосувати feature flags і оператори

### 5.4 Варіант Б — "Додати в чергу"

1. Нова підписка → `status = QUEUED`, `position = max(position) + 1`
2. Поточна ACTIVE продовжує працювати без змін
3. Коли поточна ACTIVE вичерпається → активується наступна в черзі (за правилами розділу 8)

---

## 6. Переключення між підписками

Клієнт може вручну переключитися між підписками в пулі. Переключення набуває чинності **о 00:00 наступного дня**.

### 6.1 Правила

- Ліміт: **одне заплановане переключення на день**
- Можна скасувати заплановане переключення до 00:00
- Не можна будувати ланцюжки (перемикнутись двічі за день)
- **Заборонено** переключатися на FREE вручну якщо є платні підписки в пулі
- Переключення між підписками одного рівня дозволено

### 6.2 Флоу переключення

```
Клієнт натискає "Switch" на підписці зі статусом PAUSED/QUEUED
        │
        ▼
Є вже заплановане переключення сьогодні?
        │
   так ─┴─ ні
   │              │
   ▼              ▼
403              Зберегти запланований перехід:
SWITCH_          scheduledSwitchTo = targetSubscriptionId
ALREADY_         scheduledSwitchAt = tomorrow 00:00
SCHEDULED
        │
        ▼
Показати ноут в UI:
"Switch to [Plan Name] will take effect at midnight"
[Cancel switch]
```

### 6.3 Активація переключення о 00:00 (cron)

```
1. Знайти всі UserSubscriptionBalance де scheduledSwitchAt <= now()
2. Для кожного:
   a. Поточна ACTIVE → status=PAUSED, pausedAt=now()
   b. Ціль переключення → status=ACTIVE, pausedAt=null
   c. Оновити оператори (block/unblock залежно від maxOperators)
   d. Очистити scheduledSwitchAt, scheduledSwitchTo
3. Оновити currentPlan в сесійному кеші
```

### 6.4 UI в профілі (блок підписки)

```
Активна підписка:
  ● Business Plan          31 days left    [autoRenew: ON]
    → Scheduled switch to PRO tomorrow at midnight  [Cancel]

В черзі:
  ○ Pro Plan               45 days         [Switch now]
  ○ Pro Plan               30 days         [Switch now]

Резервна:
  ○ Free Plan              ∞               (не можна активувати вручну)
```

---

## 7. Автопродовження

### 7.1 Поведінка

| `autoRenew` | Що відбувається коли `periodEnd` настає |
|-------------|----------------------------------------|
| `true` | Автоматично продовжується на той самий план (+30 або +365 днів). Створюється новий `BillingHistory`. |
| `false` | Підписка переходить в `EXPIRED`. Активується наступна в черзі. |

### 7.2 Автопродовження і черга

Якщо autoRenew=true і в черзі є QUEUED підписки:
- Поточна **продовжується** (autoRenew має пріоритет)
- QUEUED підписки залишаються в черзі
- Вони активуються тільки коли autoRenew вимкнено і поточна вичерпана

### 7.3 Вимкнення autoRenew

Клієнт може вимкнути autoRenew в будь-який момент. Тоді:
- Поточна діє до `periodEnd`
- Після `periodEnd` → переходить на наступну в черзі або FREE

---

## 8. Вичерпання підписки та черга

### 8.1 Черга активації

Коли ACTIVE підписка вичерпана (`periodEnd <= now()` і `autoRenew=false`):

```
1. Знайти всі QUEUED/PAUSED підписки для userId
2. Якщо є → обрати за пріоритетом:
   a. Найвищий рівень (level) — головний критерій
   б. Якщо рівні однакові → найбільше днів залишилось
   в. Якщо й дні однакові → найраніша дата купівлі (createdAt)
3. Обрана підписка → status=ACTIVE
   - Якщо була PAUSED → відновити periodEnd (формула з розділу 10)
   - Якщо була QUEUED → periodEnd = tomorrow + daysTotal
4. Застосувати feature flags і оператори
5. Якщо QUEUED/PAUSED немає → активувати FREE
```

### 8.2 FREE як резервна

FREE завжди присутня як резервна. Вона не має `periodEnd` (безстрокова) і не створює `BillingHistory`. Якщо всі платні вичерпані і черга порожня — клієнт автоматично переходить на FREE о 00:00.

---

## 9. Upgrade / Downgrade / Cancel

### 9.1 FREE → платний

Активується **одразу** без вибору. Немає поточної платної підписки → нема що ставити на паузу.

### 9.2 Платний → вищий рівень

Показується вибір (А або Б з розділу 5).

### 9.3 Платний → нижчий рівень

Аналогічно — вибір А або Б. При активації нижчого плану:
- Якщо нова `maxOperators` < поточної → запустити operator blocking logic
- Клієнт вибирає який оператор залишити активним (або автоматично — найстаріший)

### 9.4 Скасування (Cancel)

Клієнт може скасувати підписку в будь-який момент:
- `autoRenew` → `false`
- Поточна підписка діє до `periodEnd`
- Після закінчення → черга або FREE
- **Скасування підписки можна відновити** в будь-який момент до `periodEnd` (revert cancel = увімкнути autoRenew знову)
- Ліміту на кількість скасувань немає

### 9.5 Продовження вже скасованої підписки

Якщо підписка в стані "скасована але ще активна" (`autoRenew=false`, `periodEnd` в майбутньому):
- Клієнт натискає "Renew" → просто вмикає `autoRenew=true` знову
- Не потрібно робити новий downgrade→upgrade

---

## 10. Математика пауз і відновлення

При постановці на паузу зберігаємо `pausedAt`. При відновленні рахуємо скільки днів пройшло і додаємо до `periodEnd`.

### 10.1 Формула

```
залишок = periodEnd - pausedAt         // скільки днів було залишено
нова periodEnd = resumedAt + залишок
```

### 10.2 Приклад

```
periodEnd = 18 травня
pausedAt  = 10 травня
залишок   = 8 днів

resumedAt = 13 травня
нова periodEnd = 13 + 8 = 21 травня
```

### 10.3 Важливо

- Дні рахуються цілими (без годин і хвилин)
- `periodEnd` завжди встановлюється на 00:00 відповідного дня
- При купівлі: `periodEnd = tomorrow 00:00 + daysTotal`
  (сьогоднішній день не рахується — клієнт отримує повний перший день завтра)

---

## 11. Річна підписка

Річна підписка — це той самий `UserSubscriptionBalance` з `periodType = YEARLY` і `daysTotal = 365`.

### 11.1 Відмінності від місячної

| | MONTHLY | YEARLY |
|--|---------|--------|
| daysTotal | 30 | 365 |
| price | `plan.price` | `plan.priceYearly` |
| autoRenew | продовжується на 30д | продовжується на 365д |
| Переключення | так само | так само |
| Пауза/відновлення | так само | так само |

### 11.2 Змішування місячних і річних

Клієнт може мати одночасно місячну і річну підписку в пулі. Вони поводяться однаково — різниця тільки в кількості днів і ціні.

---

## 12. Billing (мок)

### 12.1 BillingHistory запис

Створюється при:
- Купівлі нової підписки
- Автопродовженні
- Докупівлі днів до існуючої підписки

| Поле | Значення |
|------|---------|
| `userId` | |
| `planId` | |
| `periodType` | MONTHLY / YEARLY |
| `amount` | `plan.price` або `plan.priceYearly` або `customAmount` (якщо є знижка) |
| `status` | `PAID` (мок — завжди успішно) |
| `periodStart` | Дата купівлі |
| `periodEnd` | periodStart + daysTotal |
| `paidAt` | now() |

### 12.2 Індивідуальна знижка від адміна

- `customAmount` + `discountType` (`ONE_TIME` / `PERMANENT`) на `UserSubscriptionBalance`
- `ONE_TIME`: застосовується один раз при наступному списанні, потім скидається
- `PERMANENT`: застосовується при кожному автопродовженні

### 12.3 Картка (мок)

- Зберігається тільки маска (`•••• •••• •••• 4242`) і термін дії
- Не обов'язкова для FREE плану
- Необхідна для купівлі платного плану

---

## 13. Адмін — управління підписками

### 13.1 Що може адмін

| Дія | Опис |
|-----|------|
| Переглянути всі підписки | Таблиця з фільтрами |
| Змінити план клієнта | Миттєво, без черги |
| Продовжити підписку | `periodEnd += N днів` |
| Скасувати підписку | `autoRenew=false` |
| Встановити знижку | `customAmount` + `discountType` |
| Призначити персональний план | Прив'язати `isPersonal` план до конкретного клієнта |

### 13.2 Endpoints

```
GET  /admin/subscriptions          — список всіх з фільтрами
GET  /admin/subscriptions/:id      — деталі конкретної
PUT  /admin/subscriptions/:id      — дія (action: changePlan|extend|cancel|setDiscount)
```

---

## 14. Персональні підписки від адміна

### 14.1 Що таке персональний план

Адмін створює кастомний `SubscriptionPlan` з `isPersonal=true` і призначає конкретному клієнту. Клієнт бачить його в своєму списку доступних планів.

### 14.2 Поля кастомного плану

```
name           — назва (наприклад "Special Trial")
price          — кастомна ціна
priceYearly    — кастомна річна ціна (optional)
maxOperators   — кількість операторів
hasAnalytics   — true/false
hasTemplates   — true/false
hasRecipients  — true/false
isPublic       — false (бачить тільки призначений клієнт)
isPersonal     — true
targetUserId   — клієнт якому призначено
```

### 14.3 Endpoints

```
GET  /admin/plans          — список всіх планів (публічні + персональні)
GET  /admin/plans/:id
POST /admin/plans          — створити план (публічний або персональний)
PUT  /admin/plans/:id      — оновити
DELETE /admin/plans/:id    — видалити (тільки якщо немає активних підписок на цей план)
```

---

## 15. Admin Dashboard — метрики підписок

Всі метрики рахуються з локальної БД (без звернень до операторів).

### 15.1 Фільтр по періоду

Глобальний фільтр для всього дашборду: **Цей місяць / Квартал / Рік**

### 15.2 Блок — Користувачі

| Метрика | Джерело |
|---------|---------|
| Загальна кількість акаунтів | `count(User)` |
| Нових за період | `count(User where createdAt >= periodStart)` |
| Розподіл по статусах | `count(User group by status)` — кругова діаграма |
| Конверсій FREE → платний за період | `count(BillingHistory where periodStart >= X AND amount > 0)` унікальних userId першого разу |
| Середня кількість підключених операторів | `avg(count(UserPostalConnection where status=ACTIVE) per user)` |
| Найпопулярніші оператори | `count(UserPostalConnection group by postalServiceId)` |
| INVALID з'єднань зараз | `count(UserPostalConnection where status=INVALID)` |

### 15.3 Блок — Підписки

| Метрика | Джерело |
|---------|---------|
| Загальна кількість активних підписок | `count(UserSubscriptionBalance where status=ACTIVE)` |
| Нових за період | `count(UserSubscriptionBalance where createdAt >= periodStart)` |
| Розподіл по планах | `count group by planId` — кругова діаграма |
| PENDING переключень зараз | `count(UserSubscriptionBalance where scheduledSwitchAt IS NOT NULL)` |
| Churn за місяць | `count(UserSubscriptionBalance where autoRenew set to false за період)` |
| Середній термін життя підписки | `avg(periodEnd - createdAt)` для EXPIRED |

### 15.4 Блок — Білінг (мок)

| Метрика | Джерело |
|---------|---------|
| "Дохід" за період | `sum(BillingHistory.amount where paidAt >= periodStart)` |
| По планах | `sum group by planId` |
| Динаміка по місяцях | `sum group by month(paidAt)` — лінійний графік |

### 15.5 Блок — Залученість

| Метрика | Джерело |
|---------|---------|
| Середня кількість шаблонів на користувача | `avg(count(ShipmentTemplate) per userId)` |
| Середня кількість контактів на користувача | `avg(count(Recipient) per userId)` |

### 15.6 Блок — Саппорт

| Метрика | Джерело |
|---------|---------|
| Відкритих тікетів зараз | `count(SupportTicket where status=OPEN)` |
| Закритих за місяць | `count(SupportTicket where closedAt >= periodStart)` |
| Середній час першої відповіді | `avg(firstAdminMessage.createdAt - ticket.createdAt)` |

---

## 16. Schema Changes

### 16.1 SubscriptionPlan — оновлення

```prisma
model SubscriptionPlan {
  id               Int      @id @default(autoincrement())
  name             String
  level            Int      // 0=FREE, 1=PRO, 2=BUSINESS, 3+=custom
  price            Decimal  @db.Decimal(10,2)
  priceYearly      Decimal? @db.Decimal(10,2)
  maxOperators     Int
  hasAnalytics     Boolean  @default(false)
  hasTemplates     Boolean  @default(false)
  hasRecipients    Boolean  @default(false)
  hasSupport       Boolean  @default(true)   // завжди true
  autoRenewDefault Boolean  @default(true)
  isPublic         Boolean  @default(true)
  isPersonal       Boolean  @default(false)
  targetUserId     Int?     // якщо isPersonal=true
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  balances UserSubscriptionBalance[]
  billing  BillingHistory[]
  targetUser User? @relation(fields: [targetUserId], references: [id])
}
```

### 16.2 UserSubscriptionBalance — нова таблиця (замінює UserSubscription)

```prisma
enum SubscriptionPeriodType {
  MONTHLY
  YEARLY
}

enum SubscriptionBalanceStatus {
  ACTIVE
  PAUSED
  QUEUED
  EXPIRED
}

model UserSubscriptionBalance {
  id                  Int                       @id @default(autoincrement())
  userId              Int
  planId              Int
  periodType          SubscriptionPeriodType    @default(MONTHLY)
  daysTotal           Int                       // 30 або 365
  periodEnd           DateTime                  // поточна дата закінчення
  pausedAt            DateTime?                 // коли поставлено на паузу
  status              SubscriptionBalanceStatus @default(ACTIVE)
  autoRenew           Boolean                   @default(true)
  position            Int                       @default(0) // 0 = активна, 1+ = черга
  scheduledSwitchTo   Int?                      // id цільової підписки для переключення
  scheduledSwitchAt   DateTime?                 // коли активувати переключення (00:00)
  customAmount        Decimal?                  @db.Decimal(10,2)
  discountType        DiscountType?
  createdAt           DateTime                  @default(now())
  updatedAt           DateTime                  @updatedAt

  user   User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan   SubscriptionPlan @relation(fields: [planId], references: [id])

  @@index([userId, status])
}

enum DiscountType {
  ONE_TIME
  PERMANENT
}
```

### 16.3 BillingHistory — оновлення

```prisma
model BillingHistory {
  id          Int                    @id @default(autoincrement())
  userId      Int
  planId      Int
  balanceId   Int                    // посилання на UserSubscriptionBalance
  periodType  SubscriptionPeriodType @default(MONTHLY)
  amount      Decimal                @db.Decimal(10,2)
  status      BillingStatus          @default(PAID)
  periodStart DateTime
  periodEnd   DateTime
  paidAt      DateTime?
  createdAt   DateTime               @default(now())

  user    User                    @relation(fields: [userId], references: [id])
  plan    SubscriptionPlan        @relation(fields: [planId], references: [id])
  balance UserSubscriptionBalance @relation(fields: [balanceId], references: [id])

  @@index([userId])
}
```

---

## 17. Implementation Plan

### 17.1 Cron jobs

| Job | Schedule | Логіка |
|-----|----------|--------|
| `processSubscriptionRenewals` | Щодня 00:00 | Знайти ACTIVE де `periodEnd <= now()` і `autoRenew=true` → продовжити `periodEnd += daysTotal`, створити BillingHistory |
| `expireSubscriptions` | Щодня 00:00 | Знайти ACTIVE де `periodEnd <= now()` і `autoRenew=false` → status=EXPIRED → активувати наступну з черги |
| `activateScheduledSwitches` | Щодня 00:00 | Знайти всі де `scheduledSwitchAt <= now()` → виконати переключення → оновити оператори |

### 17.2 Endpoints — Client

| Method | Endpoint | Опис |
|--------|----------|------|
| `GET` | `/subscriptions/plans` | Публічні плани + персональні для цього userId |
| `GET` | `/subscriptions/me` | Всі підписки в пулі (ACTIVE + PAUSED + QUEUED) |
| `POST` | `/subscriptions` | Купити підписку. IN: `{planId, periodType, activateNow?}` |
| `PUT` | `/subscriptions/:id` | Оновити: `{autoRenew?, scheduledSwitchTo?, cancelSwitch?}` |
| `DELETE` | `/subscriptions/:id` | Скасувати = `autoRenew=false` (не видаляє запис) |

### 17.3 Endpoints — Admin

| Method | Endpoint | Опис |
|--------|----------|------|
| `GET` | `/admin/plans` | Всі плани включно з персональними |
| `GET` | `/admin/plans/:id` | Деталі плану |
| `POST` | `/admin/plans` | Створити план |
| `PUT` | `/admin/plans/:id` | Оновити план |
| `DELETE` | `/admin/plans/:id` | Видалити (тільки якщо немає активних балансів) |
| `GET` | `/admin/subscriptions` | Всі підписки з фільтрами |
| `GET` | `/admin/subscriptions/:id` | Деталі |
| `PUT` | `/admin/subscriptions/:id` | Дія: `{action: changePlan\|extend\|cancel\|setDiscount, ...}` |

### 17.4 Feature flag guard (NestJS decorator)

```typescript
// Використання:
@RequireFeature('hasAnalytics')
@Get('/analytics')
getAnalytics() {}

// Guard логіка:
// 1. Знайти ACTIVE UserSubscriptionBalance для userId
// 2. Завантажити SubscriptionPlan
// 3. Перевірити plan[feature] === true
// 4. Якщо false → throw ForbiddenException('FEATURE_NOT_AVAILABLE')
```

### 17.5 Важливі зауваження

- `UserSubscription` (стара таблиця) — **замінити** на `UserSubscriptionBalance`. Написати міграцію.
- `SubscriptionLevel` enum (OLD: FREE/PRO/BUSINESS) — **замінити** на числове поле `level: Int`. Написати міграцію.
- При логіні і рефреші токену — завжди підвантажувати активний план і повертати feature flags у відповіді.
- Всі місця де перевіряється підписка — оновити на нову модель.

---

*— Кінець документу —*
