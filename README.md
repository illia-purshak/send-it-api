# SendIt — Технічна документація

> Версія 1.0 · 2026

**Легенда статусів:**
| Символ | Значення |
|--------|----------|
| ✅ | Погоджено |
| ⚠️ | Потребує доробки |
| 🔶 | Потребує обговорення |
| 🔒 | Тільки SUPER_ADMIN |

---

# Частина 1. Карта маршрутів сайту (Sitemap)

## 1.1 Ролі користувачів

Система SendIt є **B2B платформою**. Реєстрація доступна лише для організацій. Жодних ролей `OPERATOR` чи `COURIER` не існує — вся логістика зберігається на боці зовнішніх операторів (НП, Укрпошта тощо).

| Роль          | Опис та права                                                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLIENT`      | Зареєстрований B2B користувач. Тільки організації (`ORGANIZATION`). Має доступ до клієнтської частини: відправлення, шаблони, аналітика, профіль, підписка, саппорт.                    |
| `ADMIN`       | Адміністратор платформи. Запрошується `SUPER_ADMIN`, не може зареєструватися самостійно. Управління користувачами, підписками, саппортом, сервісами та налаштуваннями. Обов'язкова 2FA. |
| `SUPER_ADMIN` | Розширений адміністратор. Успадковує всі права `ADMIN`. Додатково: запрошення, деактивація та видалення адмінів. Єдина роль що може створювати інших адмінів. 2FA не потрібна.          |

---

## 1.2 Клієнтське дерево (CLIENT)

Доступно для ролі `CLIENT`. Тільки організації (B2B). SendIt є агрегатором — власних відправлень не зберігає, підтягує дані з API зовнішніх операторів через збережені API ключі клієнта.

| Маршрут          | Опис та наповнення                                                                                                                                                                                                                                                                                                                                                                                                                            | Статус                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `/dashboard`     | Головна сторінка клієнта після входу. Кількість активних відправлень, останні 5 відправлень зі статусом, швидкі дії: «Створити відправлення», «Мої шаблони», превью аналітики.                                                                                                                                                                                                                                                                | ✅                      |
| `/shipments`     | Таблиця всіх відправлень клієнта. Фільтри: оператор, статус, TTN, діапазон дат і вартості. Дії: деталі (модалка), редагувати, скасувати (тільки `PREPARING`), клонувати. Пагінація. Архівування — тільки для НП ⚠️                                                                                                                                                                                                                            | ⚠️ Потребує доробки     |
| `/shipments/:id` | Деталі відправлення. Обговорюється: можливо достатньо модального вікна замість окремої сторінки.                                                                                                                                                                                                                                                                                                                                              | 🔶 Потребує обговорення |
| `/shipments/new` | Створення відправлення — степер. Guard: без підключеного оператора → редірект на `/profile` з toast. Крок 1: вибір оператора (тільки підключені). Крок 1.5: вибір шаблону (опційно, автозаповнює форму). Крок 2: дані отримувача (з адресної книги або вручну). Крок 3: параметри посилки (динамічні поля під оператора). Крок 4: підтвердження і Preview. Збереження чернетки (draft) при незавершеній формі.                                | ✅                      |
| `/templates`     | Список збережених шаблонів. Колонки: назва, бейдж оператора, дата. Дії: Редагувати, Видалити, Використати (редірект на `/shipments/new` з передзаповненими полями).                                                                                                                                                                                                                                                                           | ✅                      |
| `/templates/new` | Створення шаблону — та сама степер-форма що `/shipments/new`. Замість «Створити» — «Зберегти шаблон» + поле «Назва шаблону».                                                                                                                                                                                                                                                                                                                  | ✅                      |
| `/recipients`    | Адресна книга отримувачів. Колонки: ім'я, телефон, адреса/відділення, дата. Дії: Редагувати, Видалити. Інтеграція з `/shipments/new` — вибір зі списку на кроці «Дані отримувача».                                                                                                                                                                                                                                                            | ✅                      |
| `/analytics`     | Статистика відправлень. По операторах, статусах, фінансах (загальна сума, середня вартість). Графік по місяцях. Фільтр: тиждень / місяць / рік / довільний діапазон.                                                                                                                                                                                                                                                                          | ✅                      |
| `/billing`       | Історія списань за підписку. Колонки: дата, період (з — до), план, сума, статус. Пагінація. Оплата — мок (навчальний проект).                                                                                                                                                                                                                                                                                                                 | ✅                      |
| `/notifications` | Сповіщення клієнта. Зміна статусів відправлень, нагадування про підписку, системні. Прочитано / непрочитано, фільтр по типу.                                                                                                                                                                                                                                                                                                                  | ✅                      |
| `/support`       | Саппорт — листування з адміном. Список звернень: тема, дата, статус. Кнопка «Нове звернення». Активний чат: можна писати; закритий: read-only. Контакти (email, соцмережі) як альтернатива.                                                                                                                                                                                                                                                   | ✅                      |
| `/settings`      | Налаштування інтерфейсу. Мова, часовий пояс, налаштування сповіщень (які отримувати, яким способом: email / in-app).                                                                                                                                                                                                                                                                                                                          | ✅                      |
| `/profile`       | Профіль клієнта. **Блок 1** — Дані організації: назва, ЄДРПОУ, ІПН, юр. адреса, контактна особа, email, телефон. **Блок 2** — Підписка: поточний план (FREE/PRO/BUSINESS), дати, Upgrade/Downgrade (зміна з наступного місяця), платіжні дані картки (мок). **Блок 3** — Безпека: зміна пароля, 2FA через TOTP (опційно для клієнта). **Блок 4** — Підключені оператори: замаскований API ключ, статус, дата підключення, оновити/відключити. | ✅                      |

---

## 1.3 Адмінське дерево (ADMIN / SUPER_ADMIN)

Адміни не реєструються самостійно — їх запрошує `SUPER_ADMIN` через email-invite. Адмін має спрощений профіль без підписки та платіжних даних. `ADMIN` — обов'язкова 2FA. `SUPER_ADMIN` — 2FA не потрібна.

| Маршрут                | Опис та наповнення                                                                                                                                                                                                          | Статус                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `/admin/dashboard`     | Метрики платформи. Блок користувачів: всього, нових за місяць, по планах, конверсія з FREE на платний. Блок підписок: активні, зміни планів, скасування. Блок операторів: підключень по кожному оператору, розподіл 1/2/3+. | ✅                      |
| `/admin/users`         | Список клієнтів. Фільтри: план, статус, дата реєстрації. Колонки: компанія, email, план, статус, дата. Клік → `/admin/users/:id`.                                                                                           | ✅                      |
| `/admin/users/:id`     | Деталі клієнта. Профіль організації, підписка, підключені оператори. Зміна статусу: Активний / Заблокований / Тимчасово заблокований. Історія звернень у саппорт.                                                           | ✅                      |
| `/admin/subscriptions` | Всі підписки платформи. Фільтри: план, статус. Колонки: клієнт, план, дата початку, дата наступного списання, статус. Пагінація.                                                                                            | ✅                      |
| `/admin/support`       | Саппорт — відповіді клієнтам. Список клієнтів → всі їх чати (від найновішого) → переписка. Кнопка «Закрити звернення» → чат стає read-only для обох сторін. Фільтр: активні / закриті.                                      | ✅                      |
| `/admin/services`      | Довідник поштових операторів в системі. Статус: активний / деактивований. Кнопки: «Додати сервіс», «Деактивувати». Визначає що доступно клієнтам для підключення.                                                           | ✅                      |
| `/admin/billing`       | Фінансова аналітика платформи. Загальний дохід по місяцях/роках, розподіл по планах. Обговорюється: можливо дублює `/admin/dashboard`.                                                                                      | 🔶 Потребує обговорення |
| `/admin/settings`      | Налаштування платформи. Системні параметри, конфігурація сповіщень.                                                                                                                                                         | ✅                      |
| `/admin/profile`       | Профіль адміна — без підписки і платіжних даних. Ім'я, email, зміна пароля, 2FA (обов'язкова для `ADMIN`).                                                                                                                  | ✅                      |
| `/admin/admins`        | Управління адмінами. Список адмінів, кнопка «Запросити адміна» (email-invite). Дії: Деактивувати, Видалити. Адміни не можуть самостійно зареєструватися.                                                                    | 🔒 Тільки SUPER_ADMIN   |

---

# Частина 2. Структура бази даних

База даних — **PostgreSQL**. ORM — **Prisma**. Всього **21 модель**, **9 enum**. Відправлення та посилки не зберігаються локально — SendIt агрегує дані з API зовнішніх операторів.

---

## 2.1 Переліки (Enums)

| Enum                  | Значення                                                                     |
| --------------------- | ---------------------------------------------------------------------------- |
| `UserRole`            | `CLIENT`                                                                     |
| `UserStatus`          | `ACTIVE` · `INACTIVE` · `BANNED` · `DELETED`                                 |
| `AdminRole`           | `ADMIN` · `SUPER_ADMIN`                                                      |
| `AdminStatus`         | `ACTIVE` · `INACTIVE` · `DELETED`                                            |
| `SubscriptionLevel`   | `FREE` · `PRO` · `BUSINESS`                                                  |
| `SubscriptionStatus`  | `ACTIVE` · `CANCELLED` · `PENDING_UPGRADE` · `PENDING_DOWNGRADE` · `EXPIRED` |
| `BillingStatus`       | `PAID` · `FAILED` · `REFUNDED`                                               |
| `NotificationType`    | `SHIPMENT_STATUS` · `SUBSCRIPTION` · `SYSTEM`                                |
| `SupportTicketStatus` | `OPEN` · `CLOSED`                                                            |

---

## 2.2 Моделі (таблиці)

### Auth & Користувач (CLIENT)

| Модель               | Призначення                                                                                   | Зв'язки                                                                                                                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`               | Базова сутність клієнта. Email, телефон, роль `CLIENT`, статус, прапорець `profileCompleted`. | → `UserProfile` (1:1), `UserCredentials` (1:1), `RefreshToken` (1:N), `ResetPasswordToken` (1:N), `TwoFactorAuth` (1:1), `UserPostalConnection` (1:N), `UserSubscription` (1:1), `BillingHistory` (1:N), `ShipmentTemplate` (1:N), `Recipient` (1:N), `Notification` (1:N), `SupportTicket` (1:N) |
| `UserProfile`        | Профіль організації (B2B). Компанія, ЄДРПОУ, ІПН, юр. адреса, контактна особа.                | → `User` (1:1)                                                                                                                                                                                                                                                                                    |
| `UserCredentials`    | Хеш пароля клієнта.                                                                           | → `User` (1:1)                                                                                                                                                                                                                                                                                    |
| `RefreshToken`       | Токени сесій клієнта (JWT refresh). Підтримує revoke через `revokedAt`.                       | → `User` (1:N)                                                                                                                                                                                                                                                                                    |
| `ResetPasswordToken` | Токени скидання пароля з TTL та прапорцем `usedAt`.                                           | → `User` (1:N)                                                                                                                                                                                                                                                                                    |
| `TwoFactorAuth`      | TOTP налаштування для клієнта. Secret зашифрований. **Опційна** для клієнта.                  | → `User` (1:1)                                                                                                                                                                                                                                                                                    |

### Адміністратори

| Модель               | Призначення                                                                                                                       | Зв'язки                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Admin`              | Окрема таблиця для `ADMIN` та `SUPER_ADMIN`. Не змішується з `User`. `invitedById` — хто запросив (null для першого SUPER_ADMIN). | → `Admin` self (invitedBy), `AdminCredentials` (1:1), `AdminRefreshToken` (1:N), `AdminTwoFactorAuth` (1:1), `AdminInvite` (1:N), `SupportMessage` (1:N) |
| `AdminCredentials`   | Хеш пароля адміна.                                                                                                                | → `Admin` (1:1)                                                                                                                                          |
| `AdminRefreshToken`  | Токени сесій адміна.                                                                                                              | → `Admin` (1:N)                                                                                                                                          |
| `AdminTwoFactorAuth` | TOTP для `ADMIN` (**обов'язкова**). `SUPER_ADMIN` не потребує.                                                                    | → `Admin` (1:1)                                                                                                                                          |
| `AdminInvite`        | Email-запрошення для нових адмінів. Тільки `SUPER_ADMIN` може створювати. Має TTL і прапорець `usedAt`.                           | → `Admin` (invitedBy, 1:N)                                                                                                                               |

### Поштові оператори

| Модель                 | Призначення                                                                                                  | Зв'язки                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `PostalService`        | Довідник операторів в системі (НП, Укрпошта, Мост тощо). Керується адміном через `/admin/services`.          | → `UserPostalConnection` (1:N), `ShipmentTemplate` (1:N) |
| `UserPostalConnection` | Підключення клієнта до оператора. Зберігає зашифрований API ключ. Унікальна пара `userId + postalServiceId`. | → `User` (N:1), `PostalService` (N:1)                    |

### Підписки та білінг

| Модель             | Призначення                                                                                                | Зв'язки                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `SubscriptionPlan` | Довідник планів: `FREE` (рівень 0, 1 оператор), `PRO` (1), `BUSINESS` (2). Містить ціну та `maxOperators`. | → `UserSubscription` (1:N), `BillingHistory` (1:N) |
| `UserSubscription` | Поточна підписка клієнта. Підтримує заплановані зміни (`nextPlanId`), скасування до кінця місяця.          | → `User` (1:1), `SubscriptionPlan` (N:1)           |
| `BillingHistory`   | Історія списань за підписку. Зберігає суму, період та статус оплати (мок).                                 | → `User` (N:1), `SubscriptionPlan` (N:1)           |

### Функціонал клієнта

| Модель             | Призначення                                                                                                   | Зв'язки                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `ShipmentTemplate` | Збережений шаблон форми відправлення. `templateData` — `Json` з динамічними полями під конкретного оператора. | → `User` (N:1), `PostalService` (N:1) |
| `Recipient`        | Адресна книга отримувачів клієнта. Ім'я, телефон, адреса/відділення.                                          | → `User` (N:1)                        |
| `Notification`     | Сповіщення для клієнта. Типи: `SHIPMENT_STATUS`, `SUBSCRIPTION`, `SYSTEM`. Прапорець `isRead`.                | → `User` (N:1)                        |

### Саппорт

| Модель           | Призначення                                                                            | Зв'язки                                                                  |
| ---------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `SupportTicket`  | Звернення клієнта. Статус: `OPEN` (активний) або `CLOSED` (read-only для обох сторін). | → `User` (N:1), `SupportMessage` (1:N)                                   |
| `SupportMessage` | Повідомлення в межах звернення. Автор — або клієнт (`userId`) або адмін (`adminId`).   | → `SupportTicket` (N:1), `User` (N:1, nullable), `Admin` (N:1, nullable) |

---

## 2.3 Prisma Schema

```prisma
generator client {
  provider     = "prisma-client-js"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// ENUMS
// ============================================================

enum UserRole {
  CLIENT
}

enum UserStatus {
  ACTIVE
  INACTIVE
  BANNED
  DELETED
}

enum AdminRole {
  ADMIN
  SUPER_ADMIN
}

enum AdminStatus {
  ACTIVE
  INACTIVE
  DELETED
}

enum SubscriptionLevel {
  FREE     // Рівень 0 — 1 оператор, без переваг
  PRO      // Рівень 1 — платний
  BUSINESS // Рівень 2 — максимальний
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED         // Скасована, діє до кінця місяця
  PENDING_UPGRADE   // Запланований перехід вище з наступного місяця
  PENDING_DOWNGRADE // Запланований перехід нижче з наступного місяця
  EXPIRED
}

enum BillingStatus {
  PAID
  FAILED
  REFUNDED
}

enum NotificationType {
  SHIPMENT_STATUS // Зміна статусу відправлення
  SUBSCRIPTION    // Нагадування про підписку
  SYSTEM          // Системне сповіщення
}

enum SupportTicketStatus {
  OPEN
  CLOSED
}

// ============================================================
// USER (CLIENT)
// ============================================================

model User {
  id               Int        @id @default(autoincrement())
  email            String?    @unique
  phoneNumber      String?    @unique
  role             UserRole   @default(CLIENT)
  status           UserStatus @default(INACTIVE)
  profileCompleted Boolean    @default(false)
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  // Relations
  credentials         UserCredentials?
  refreshTokens       RefreshToken[]
  resetPasswordTokens ResetPasswordToken[]
  profile             UserProfile?
  twoFactorAuth       TwoFactorAuth?
  postalConnections   UserPostalConnection[]
  subscription        UserSubscription?
  billingHistory      BillingHistory[]
  shipmentTemplates   ShipmentTemplate[]
  recipients          Recipient[]
  notifications       Notification[]
  supportTickets      SupportTicket[]
  supportMessages     SupportMessage[]
}

// ============================================================
// USER PROFILE (Organization only — B2B)
// ============================================================

model UserProfile {
  userId            Int     @id
  companyName       String
  companyNameLat    String?
  edrpou            String  @unique
  taxNumber         String?
  legalAddress      String
  contactPersonName String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ============================================================
// AUTH — CREDENTIALS, TOKENS
// ============================================================

model UserCredentials {
  userId       Int      @id
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model RefreshToken {
  id        Int       @id @default(autoincrement())
  userId    Int
  tokenHash String
  revokedAt DateTime?
  expiresAt DateTime
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, revokedAt])
}

model ResetPasswordToken {
  id              Int       @id @default(autoincrement())
  userId          Int
  tokenHash       String
  tokenLookupHash String    @unique
  usedAt          DateTime?
  expiresAt       DateTime
  createdAt       DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ============================================================
// TWO FACTOR AUTH
// ============================================================

model TwoFactorAuth {
  userId    Int      @id
  secret    String   // TOTP secret (зашифрований)
  isEnabled Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ============================================================
// ADMIN
// ============================================================

model Admin {
  id          Int         @id @default(autoincrement())
  email       String      @unique
  firstName   String
  lastName    String
  role        AdminRole   @default(ADMIN)
  status      AdminStatus @default(INACTIVE)
  invitedById Int?        // null для першого SUPER_ADMIN
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // Relations
  invitedBy       Admin?             @relation("AdminInvitedBy", fields: [invitedById], references: [id])
  invitedAdmins   Admin[]            @relation("AdminInvitedBy")
  credentials     AdminCredentials?
  refreshTokens   AdminRefreshToken[]
  adminInvites    AdminInvite[]      @relation("InvitedBy")
  twoFactorAuth   AdminTwoFactorAuth?
  supportMessages SupportMessage[]

  @@index([email])
}

model AdminCredentials {
  adminId      Int      @id
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  admin Admin @relation(fields: [adminId], references: [id], onDelete: Cascade)
}

model AdminRefreshToken {
  id        Int       @id @default(autoincrement())
  adminId   Int
  tokenHash String
  revokedAt DateTime?
  expiresAt DateTime
  createdAt DateTime  @default(now())

  admin Admin @relation(fields: [adminId], references: [id], onDelete: Cascade)

  @@index([adminId, revokedAt])
}

// 2FA для ADMIN (обов'язкова, SUPER_ADMIN не потребує)
model AdminTwoFactorAuth {
  adminId   Int      @id
  secret    String   // TOTP secret (зашифрований)
  isEnabled Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  admin Admin @relation(fields: [adminId], references: [id], onDelete: Cascade)
}

// Запрошення адмінів — тільки SUPER_ADMIN може запрошувати
model AdminInvite {
  id          Int       @id @default(autoincrement())
  email       String
  token       String    @unique // invite токен (надсилається на email)
  invitedById Int
  usedAt      DateTime?
  expiresAt   DateTime
  createdAt   DateTime  @default(now())

  invitedBy Admin @relation("InvitedBy", fields: [invitedById], references: [id])

  @@index([email])
}

// ============================================================
// POSTAL SERVICES
// ============================================================

model PostalService {
  id        Int      @id @default(autoincrement())
  name      String   @unique // "Нова Пошта", "Укрпошта", "Мост"
  slug      String   @unique // "nova-poshta", "ukrposhta", "mist"
  logoUrl   String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userConnections   UserPostalConnection[]
  shipmentTemplates ShipmentTemplate[]
}

model UserPostalConnection {
  id              Int      @id @default(autoincrement())
  userId          Int
  postalServiceId Int
  apiKey          String   // зашифрований API ключ
  isActive        Boolean  @default(true)
  connectedAt     DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  postalService PostalService @relation(fields: [postalServiceId], references: [id])

  @@unique([userId, postalServiceId])
  @@index([userId])
}

// ============================================================
// SUBSCRIPTION & BILLING
// ============================================================

model SubscriptionPlan {
  id           Int               @id @default(autoincrement())
  level        SubscriptionLevel @unique
  name         String
  price        Decimal           @db.Decimal(10, 2)
  maxOperators Int
  description  String?
  isActive     Boolean           @default(true)
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  subscriptions  UserSubscription[]
  billingHistory BillingHistory[]
}

model UserSubscription {
  id                 Int                @id @default(autoincrement())
  userId             Int                @unique
  planId             Int
  status             SubscriptionStatus @default(ACTIVE)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  nextPlanId         Int?               // запланована зміна плану
  cancelledAt        DateTime?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  user User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan SubscriptionPlan @relation(fields: [planId], references: [id])

  @@index([userId])
}

model BillingHistory {
  id          Int           @id @default(autoincrement())
  userId      Int
  planId      Int
  amount      Decimal       @db.Decimal(10, 2)
  status      BillingStatus @default(PAID)
  periodStart DateTime
  periodEnd   DateTime
  paidAt      DateTime?
  createdAt   DateTime      @default(now())

  user User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan SubscriptionPlan @relation(fields: [planId], references: [id])

  @@index([userId])
}

// ============================================================
// SHIPMENT TEMPLATES
// ============================================================

model ShipmentTemplate {
  id              Int      @id @default(autoincrement())
  userId          Int
  postalServiceId Int
  name            String
  templateData    Json     // динамічні поля форми залежно від оператора
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  postalService PostalService @relation(fields: [postalServiceId], references: [id])

  @@index([userId])
}

// ============================================================
// RECIPIENTS
// ============================================================

model Recipient {
  id        Int      @id @default(autoincrement())
  userId    Int
  firstName String
  lastName  String
  phone     String
  email     String?
  address   String?
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// ============================================================
// NOTIFICATIONS
// ============================================================

model Notification {
  id        Int              @id @default(autoincrement())
  userId    Int
  type      NotificationType
  title     String
  body      String
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
}

// ============================================================
// SUPPORT
// ============================================================

model SupportTicket {
  id        Int                 @id @default(autoincrement())
  userId    Int
  subject   String
  status    SupportTicketStatus @default(OPEN)
  closedAt  DateTime?
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt

  user     User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages SupportMessage[]

  @@index([userId, status])
}

model SupportMessage {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  userId    Int?     // якщо пише клієнт
  adminId   Int?     // якщо пише адмін
  body      String
  createdAt DateTime @default(now())

  ticket SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user   User?         @relation(fields: [userId], references: [id])
  admin  Admin?        @relation(fields: [adminId], references: [id])

  @@index([ticketId])
}
```

---

_— Кінець документу —_
