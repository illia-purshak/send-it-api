# SendIt — Підписки та Onboarding

> Версія 1.0 · 2026

---

## Зміст

1. [Плани підписок](#1-плани-підписок)
2. [Onboarding Flow](#2-onboarding-flow)
3. [Upgrade / Downgrade / Cancel логіка](#3-upgrade--downgrade--cancel-логіка)
4. [Downgrade і підключені оператори](#4-downgrade-і-підключені-оператори)
5. [Billing (мок)](#5-billing-мок)
6. [Адмін-дії з підписками](#6-адмін-дії-з-підписками)
7. [Implementation Plan](#7-implementation-plan)

---

## 1. Плани підписок

SendIt має три рівні підписки. Єдине обмеження між планами — **кількість підключених поштових операторів**. Всі інші функції (аналітика, шаблони, адресна книга, саппорт) доступні на будь-якому плані в повному обсязі.

| План       | Рівень | Оператори                        | Ціна         | Опис                                                                                                                                                               |
| ---------- | ------ | -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FREE`     | 0      | 1                                | безкоштовно  | Базовий план. Дозволяє підключити одного оператора і повноцінно користуватися платформою. Слугує як постійний безкоштовний рівень — окремого trial не передбачено. |
| `PRO`      | 1      | необмежено (до розумного ліміту) | платно (мок) | Розширений план для компаній що працюють з кількома операторами.                                                                                                   |
| `BUSINESS` | 2      | необмежено                       | платно (мок) | Максимальний план. Відрізняється від PRO ціною та позиціонуванням для великих організацій.                                                                         |

> **Примітка:** Оскільки проєкт є навчальним, реального списання коштів не відбувається. Вся білінг-логіка є моком.

---

## 2. Onboarding Flow

Onboarding реалізований як **гібрид contextual підказок і checklist**. Немає нав'язливого покрокового туру — система підказує в потрібний момент коли користувач сам намагається щось зробити. Це доречно для B2B аудиторії (організації), яка розбирається самостійно.

---

### 2.1 Checklist на дашборді

Після реєстрації на дашборді `/dashboard` відображається **checklist прогресу**. Він зникає повністю коли всі три пункти виконані.

```
☐  Заповніть профіль організації       → /profile
☐  Підключіть поштового оператора      → /profile (блок "Підключені оператори")
☐  Створіть перше відправлення         → /shipments/new
```

**Поведінка:**

- Кожен пункт позначається виконаним автоматично після відповідної дії
- Клік по пункту — перехід до відповідного розділу
- Checklist не блокує інтерфейс — користувач може ігнорувати і користуватися дашбордом

---

### 2.2 Banner на дашборді

Поки не підключено жодного оператора — над основним контентом дашборду відображається **інформаційний banner**:

```
"Підключіть поштового оператора щоб почати створювати відправлення"
[Підключити оператора]
```

Banner зникає після підключення першого оператора і більше не з'являється.

---

### 2.3 Guard при створенні відправлення або шаблону

Якщо користувач намагається перейти на `/shipments/new` або `/templates/new` без жодного підключеного оператора:

- Редірект на `/profile`
- Toast-повідомлення: _"Підключіть поштового оператора щоб створити відправлення"_
- Автоскрол / хайлайт блоку "Підключені оператори" в профілі

---

### 2.4 Upsell модалка при підключенні другого оператора

Якщо користувач на плані `FREE` намагається підключити другого оператора:

- З'являється модальне вікно з інформацією про плани
- Показує поточний план (`FREE`, 1 оператор) і доступні (`PRO`, `BUSINESS`)
- Кнопки: **"Перейти на PRO"** / **"Перейти на BUSINESS"** / **"Скасувати"**
- Клік на план → запускає Upgrade flow (див. розділ 3)

---

### 2.5 Схема onboarding flow

```
Реєстрація
    │
    ▼
Дашборд
    ├── Checklist (3 пункти, зникає після виконання)
    └── Banner (зникає після підключення оператора)
         │
         ▼
    Підключення оператора (профіль)
         │
         ├── FREE: 1 оператор → OK
         └── FREE + спроба 2-го → Upsell модалка
                   │
                   ├── Upgrade → Upgrade flow
                   └── Скасувати → залишається на FREE
         │
         ▼
    Створення відправлення
         │
         └── Без оператора → Guard → редірект на профіль
```

---

## 3. Upgrade / Downgrade / Cancel логіка

Зміна плану ніколи не відбувається **миттєво** — завжди з наступного розрахункового періоду. Це дозволяє уникнути складних перерахунків і забезпечує передбачуваність для клієнта.

---

### 3.1 Upgrade (перехід на вищий план)

**Тригер:** клієнт обирає план вищого рівня ніж поточний.

**Поведінка:**

- Поточна підписка продовжує діяти до кінця поточного місяця
- З наступного розрахункового списання автоматично активується новий план
- В профілі відображається: _"З [дата] ваш план зміниться на PRO"_
- `UserSubscription.status` → `PENDING_UPGRADE`
- `UserSubscription.nextPlanId` → id нового плану

**Скасування запланованого upgrade:**

- Клієнт може скасувати заплановану зміну до дати списання
- `UserSubscription.status` → `ACTIVE`, `nextPlanId` → `null`

---

### 3.2 Downgrade (перехід на нижчий план)

**Тригер:** клієнт обирає план нижчого рівня ніж поточний.

**Поведінка:**

- Поточна підписка продовжує діяти до кінця місяця
- З наступного списання активується нижчий план
- В профілі відображається: _"З [дата] ваш план зміниться на FREE"_
- `UserSubscription.status` → `PENDING_DOWNGRADE`
- `UserSubscription.nextPlanId` → id нижчого плану
- При активації downgrade → запускається логіка деактивації зайвих операторів (див. розділ 4)

---

### 3.3 Cancel (скасування платної підписки)

**Тригер:** клієнт скасовує поточну підписку.

**Поведінка:**

- Підписка діє до кінця поточного оплаченого місяця
- Після закінчення — автоматичний перехід на `FREE`
- `UserSubscription.status` → `CANCELLED`
- `UserSubscription.cancelledAt` → дата скасування
- Нового списання не відбувається
- При переході на FREE → запускається логіка деактивації зайвих операторів (розділ 4)

---

### 3.4 Таблиця статусів підписки

| Статус              | Опис                                          |
| ------------------- | --------------------------------------------- |
| `ACTIVE`            | Підписка активна, без змін                    |
| `PENDING_UPGRADE`   | Запланований перехід на вищий план            |
| `PENDING_DOWNGRADE` | Запланований перехід на нижчий план           |
| `CANCELLED`         | Скасована, діє до кінця місяця, далі → FREE   |
| `EXPIRED`           | Закінчилась (технічний статус після переходу) |

---

## 4. Downgrade і підключені оператори

При переході на план з меншим лімітом операторів (зокрема на `FREE` з лімітом 1) необхідно вирішити конфлікт зайвих підключень.

---

### 4.1 Логіка вирішення конфлікту

**Підключення НЕ видаляються** — вони деактивуються. Це дозволяє клієнту не переналаштовувати API ключі після повернення на вищий план.

**Флоу при активації downgrade:**

1. Система визначає що кількість активних підключень перевищує `maxOperators` нового плану
2. Клієнту показується модальне вікно **"Оберіть активного оператора"**:
   - Список всіх підключених операторів
   - Клієнт обирає **одного** (або відповідну кількість для нового плану) який залишиться активним
   - Інші позначаються як `isActive: false`
3. Після вибору — downgrade завершується

**Якщо клієнт не зробив вибір** (закрив модалку):

- Система автоматично залишає **перший підключений оператор** (за датою `connectedAt`) активним
- Решта деактивуються

---

### 4.2 Відновлення після upgrade

При поверненні на вищий план:

- Всі збережені підключення (`isActive: false`) відновлюються автоматично
- API ключі збережені — переналаштування не потрібне
- `UserPostalConnection.isActive` → `true` для всіх збережених підключень

---

### 4.3 Стан в профілі

В блоці "Підключені оператори" неактивні підключення відображаються окремо:

```
✅ Нова Пошта          [активний]     [Оновити ключ] [Відключити]
⛔ Укрпошта            [неактивний — потрібен вищий план]  [Активувати →]
⛔ Мост                [неактивний — потрібен вищий план]  [Активувати →]
```

Клік на **"Активувати →"** → Upsell модалка з планами.

---

## 5. Billing (мок)

Оскільки проєкт є навчальним, реального платіжного шлюзу немає. Вся білінг-логіка є **імітацією** для демонстрації функціоналу.

---

### 5.1 Що зберігається в BillingHistory

При кожному "списанні" (переході між розрахунковими періодами) створюється запис:

| Поле          | Значення                      |
| ------------- | ----------------------------- |
| `userId`      | id клієнта                    |
| `planId`      | id плану за який "списано"    |
| `amount`      | сума відповідно до плану      |
| `status`      | `PAID` (мок — завжди успішно) |
| `periodStart` | початок оплаченого місяця     |
| `periodEnd`   | кінець оплаченого місяця      |
| `paidAt`      | дата "оплати"                 |

---

### 5.2 Що бачить клієнт на /billing

Таблиця всіх списань з колонками:

```
Дата оплати | Період (з — до) | План | Сума | Статус
```

Пагінація. Найновіші записи зверху.

---

### 5.3 Платіжні дані картки

В профілі клієнта є блок з карткою (мок):

- Замаскований номер: `•••• •••• •••• 4242`
- Термін дії
- Кнопки: "Оновити картку" / "Видалити"
- Якщо картки немає і план FREE — підказка: _"Додайте картку щоб перейти на платний план"_

Картка не є обов'язковою для FREE плану.

---

## 6. Адмін-дії з підписками

Адмін через `/admin/subscriptions` та `/admin/users/:id` може вручну керувати підпискою конкретного клієнта.

---

### 6.1 Доступні дії

| Дія                      | Опис                                                                            |
| ------------------------ | ------------------------------------------------------------------------------- |
| **Змінити план**         | Переводить клієнта на будь-який план миттєво (без очікування наступного місяця) |
| **Скасувати підписку**   | Примусове скасування — клієнт переходить на FREE в кінці місяця                 |
| **Продовжити підписку**  | Продовжує поточний план на ще один місяць (зсуває `currentPeriodEnd`)           |
| **Індивідуальна знижка** | Встановлює кастомну суму наступного списання для конкретного клієнта            |

---

### 6.2 Індивідуальна знижка

Знижки є **індивідуальними** — глобальних промокодів не передбачено (можлива фіча на майбутнє).

**Як працює:**

- Адмін встановлює кастомну ціну для клієнта в `/admin/users/:id`
- Ця ціна застосовується замість стандартної ціни плану при наступному списанні
- В `BillingHistory` зберігається фактична сума (зі знижкою)
- Знижка може бути разовою або постійною (адмін вказує)

> **Примітка:** Оскільки білінг є моком, знижка також є імітацією і впливає лише на відображувані суми в інтерфейсі.

---

### 6.3 Хто має доступ

| Дія                             | ADMIN | SUPER_ADMIN |
| ------------------------------- | ----- | ----------- |
| Переглянути підписки            | ✅    | ✅          |
| Змінити план клієнта            | ✅    | ✅          |
| Скасувати підписку              | ✅    | ✅          |
| Продовжити підписку             | ✅    | ✅          |
| Встановити індивідуальну знижку | ✅    | ✅          |

---

---

## 7. Implementation Plan

### 7.1 Backend

#### 7.1.1 Database

- [ ] Add `customAmount` and `discountType` (`ONE_TIME` | `PERMANENT`) fields to `UserSubscription` model to support admin individual discounts
- [ ] Add `ShipmentDraft` model (referenced in `SendIt_Shipments.md`) — drafts are stored locally and linked to `userId` and nullable `postalServiceId`
- [ ] Seed `SubscriptionPlan` table with initial plans: `FREE`, `PRO`, `BUSINESS` (price, maxOperators, description)

---

#### 7.1.2 Subscription Module

**Endpoints — Client:**

| Method   | Endpoint                          | Description                                                          |
| -------- | --------------------------------- | -------------------------------------------------------------------- |
| `GET`    | `/subscriptions/plans`            | Get all active subscription plans                                    |
| `GET`    | `/subscriptions/me`               | Get current user's subscription with plan details                    |
| `POST`   | `/subscriptions/upgrade`          | Schedule upgrade to a higher plan                                    |
| `POST`   | `/subscriptions/downgrade`        | Schedule downgrade to a lower plan                                   |
| `POST`   | `/subscriptions/cancel`           | Cancel current paid subscription (transitions to FREE at period end) |
| `DELETE` | `/subscriptions/cancel-scheduled` | Cancel a pending upgrade or downgrade before it activates            |

**Endpoints — Admin:**

| Method  | Endpoint                                | Description                                                              |
| ------- | --------------------------------------- | ------------------------------------------------------------------------ |
| `GET`   | `/admin/subscriptions`                  | Get paginated list of all subscriptions with filters (plan, status)      |
| `PATCH` | `/admin/subscriptions/:userId/plan`     | Immediately change user's plan (bypasses next-period logic)              |
| `PATCH` | `/admin/subscriptions/:userId/extend`   | Extend current subscription by one month (`currentPeriodEnd += 1 month`) |
| `POST`  | `/admin/subscriptions/:userId/cancel`   | Force cancel user's subscription                                         |
| `PATCH` | `/admin/subscriptions/:userId/discount` | Set individual discount for next billing cycle                           |

---

#### 7.1.3 Billing Module

**Endpoints — Client:**

| Method   | Endpoint           | Description                                    |
| -------- | ------------------ | ---------------------------------------------- |
| `GET`    | `/billing/history` | Get paginated billing history for current user |
| `POST`   | `/billing/card`    | Save mock card data                            |
| `DELETE` | `/billing/card`    | Remove saved card                              |

**Mock billing logic:**

- On subscription activation or period renewal → automatically create a `BillingHistory` record with `status: PAID`
- If admin sets a discount → apply `customAmount` instead of plan price in the next `BillingHistory` record
- One-time discounts reset `customAmount` to `null` after use

---

#### 7.1.4 Scheduled Jobs (Cron)

| Job                            | Schedule       | Description                                                                                                                           |
| ------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `processSubscriptionRenewals`  | Daily at 00:00 | Find subscriptions where `currentPeriodEnd <= now`. Apply `nextPlanId` if set, or renew current plan. Create `BillingHistory` record. |
| `activatePendingPlans`         | Daily at 00:00 | Activate `PENDING_UPGRADE` / `PENDING_DOWNGRADE` subscriptions when period ends. Trigger operator deactivation logic on downgrade.    |
| `expireCancelledSubscriptions` | Daily at 00:00 | Transition `CANCELLED` subscriptions to `FREE` when `currentPeriodEnd` has passed.                                                    |

---

#### 7.1.5 Postal Connection Guard

Business logic to enforce `maxOperators` limit per plan:

- On `POST /postal-connections` (connect new operator):
  - Check current active connections count vs `plan.maxOperators`
  - If limit reached → return `403` with error code `OPERATOR_LIMIT_REACHED`
  - Frontend intercepts this code and opens the Upsell modal
- On downgrade activation:
  - Count active connections vs new plan's `maxOperators`
  - If exceeded → return list of active connections for user to choose which to keep
  - If user doesn't choose → auto-keep oldest connection by `connectedAt`, deactivate the rest
- On upgrade activation:
  - Set `isActive: true` for all previously deactivated connections

---

#### 7.1.6 Onboarding Checklist API

| Method | Endpoint                | Description                                        |
| ------ | ----------------------- | -------------------------------------------------- |
| `GET`  | `/onboarding/checklist` | Returns checklist state: which steps are completed |

**Checklist resolution logic (server-side):**

```typescript
{
  profileCompleted:    user.profileCompleted === true,
  operatorConnected:   activePostalConnections.count > 0,
  firstShipmentCreated: shipmentsOrDrafts.count > 0
}
```

---

### 7.2 Frontend

#### 7.2.1 Pages & Components

**`/dashboard`**

- [ ] `<OnboardingChecklist />` — fetches `/onboarding/checklist`, renders 3 steps, each item is a link to the relevant section. Disappears when all steps are completed. Stored as dismissed in `localStorage` if user manually closes it after completion.
- [ ] `<NoOperatorBanner />` — shown when no operator is connected. Disappears permanently after first operator is connected.

**`/profile` — Subscription block**

- [ ] Display current plan name, `currentPeriodStart`, `currentPeriodEnd`
- [ ] Show pending change notice: _"Starting [date] your plan will change to PRO"_ with cancel button
- [ ] `<ChangePlanModal />` — plan selector grid with current plan highlighted. Triggers upgrade/downgrade/cancel flow based on selection vs current plan.
- [ ] `<MockCardForm />` — masked card display, update and delete actions

**`/profile` — Postal operators block**

- [ ] Show inactive connections with "Upgrade to activate" label
- [ ] `<UpsellModal />` — triggered when user attempts to connect a second operator on FREE plan, or clicks "Activate" on an inactive connection. Displays plan comparison and upgrade CTA.
- [ ] `<ChooseActiveOperatorModal />` — triggered on downgrade when active connections exceed new plan's `maxOperators`. User picks which operator to keep active.

**`/billing`**

- [ ] Paginated billing history table: date, period (from–to), plan name, amount, status badge
- [ ] Empty state for users with no billing history (FREE plan, no charges)

**`/admin/subscriptions`**

- [ ] Paginated subscriptions table with filters: plan, status, search by company name
- [ ] Inline actions: change plan, extend, cancel, set discount

---

#### 7.2.2 Global Guards & Interceptors

- [ ] **Operator limit guard** — intercept `403 OPERATOR_LIMIT_REACHED` response from API → open `<UpsellModal />` automatically
- [ ] **No operator guard** — before navigating to `/shipments/new` or `/templates/new`, check if active connections exist. If not → redirect to `/profile` + toast + scroll to operators block.

---

#### 7.2.3 State Management

- [ ] `subscriptionStore` (or React Query) — cache current user subscription and plan details. Invalidate on any plan change action.
- [ ] `onboardingStore` — checklist state. Refetch on profile save, operator connect, and first shipment create.
- [ ] Plan limits accessible globally (e.g. via context or store) so any component can check `canAddOperator`, `currentPlan`, `maxOperators` without extra API calls.

---

#### 7.2.4 UX Details

- [ ] All plan change actions show a **confirmation step** before submitting: _"Are you sure you want to downgrade to FREE? Your plan will change on [date]."_
- [ ] Pending plan change is visible in profile with a distinct badge (e.g. yellow) and cancel option
- [ ] Toast notifications for all subscription actions: upgrade scheduled, downgrade scheduled, cancelled, admin override applied

---

_— End of document —_
