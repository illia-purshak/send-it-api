import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const PASSWORD = 'Password123!';

async function main() {
  const adapter = new PrismaPg(process.env['DATABASE_URL']!);
  const db = new PrismaClient({ adapter });
  await db.$connect();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── Subscription plans ──────────────────────────────────────────────────────

  await db.subscriptionPlan.upsert({
    where: { level: 'FREE' },
    create: { level: 'FREE', name: 'Free', price: 0, maxOperators: 1 },
    update: {},
  });

  await db.subscriptionPlan.upsert({
    where: { level: 'PRO' },
    create: { level: 'PRO', name: 'Pro', price: 299, maxOperators: 5 },
    update: {},
  });

  await db.subscriptionPlan.upsert({
    where: { level: 'BUSINESS' },
    create: {
      level: 'BUSINESS',
      name: 'Business',
      price: 799,
      maxOperators: 20,
    },
    update: {},
  });

  const freePlan = await db.subscriptionPlan.findUniqueOrThrow({
    where: { level: 'FREE' },
  });

  // ── CLIENT ──────────────────────────────────────────────────────────────────

  const client = await db.user.upsert({
    where: { email: 'client@sendit.dev' },
    create: {
      email: 'client@sendit.dev',
      role: 'CLIENT',
      status: 'ACTIVE',
      profileCompleted: true,
    },
    update: {},
  });

  await db.userCredentials.upsert({
    where: { userId: client.id },
    create: { userId: client.id, passwordHash },
    update: {},
  });

  await db.userProfile.upsert({
    where: { userId: client.id },
    create: {
      userId: client.id,
      companyName: 'ТОВ «Тестова Компанія»',
      companyNameLat: 'Test Company LLC',
      edrpou: '12345678',
      legalAddress: 'м. Київ, вул. Хрещатик, 1',
      contactPersonName: 'Іван Іваненко',
    },
    update: {},
  });

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  await db.userSubscription.upsert({
    where: { userId: client.id },
    create: {
      userId: client.id,
      planId: freePlan.id,
      status: 'ACTIVE',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
    update: {},
  });

  // ── ADMIN ───────────────────────────────────────────────────────────────────

  const admin = await db.admin.upsert({
    where: { email: 'admin@sendit.dev' },
    create: {
      email: 'admin@sendit.dev',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    update: {},
  });

  await db.adminCredentials.upsert({
    where: { adminId: admin.id },
    create: { adminId: admin.id, passwordHash },
    update: {},
  });

  // ── SUPER_ADMIN ─────────────────────────────────────────────────────────────

  const superAdmin = await db.admin.upsert({
    where: { email: 'superadmin@sendit.dev' },
    create: {
      email: 'superadmin@sendit.dev',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
    update: {},
  });

  await db.adminCredentials.upsert({
    where: { adminId: superAdmin.id },
    create: { adminId: superAdmin.id, passwordHash },
    update: {},
  });

  await db.$disconnect();

  console.log('Seed complete');
  console.log(`  CLIENT      client@sendit.dev      / ${PASSWORD}`);
  console.log(`  ADMIN       admin@sendit.dev       / ${PASSWORD}`);
  console.log(`  SUPER_ADMIN superadmin@sendit.dev  / ${PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
