import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const PASSWORD = 'Password123!';

async function upsertPlan(
  db: PrismaClient,
  level: number,
  data: Parameters<PrismaClient['subscriptionPlan']['create']>[0]['data'],
) {
  const existing = await db.subscriptionPlan.findFirst({ where: { level } });
  if (existing) return existing;
  return db.subscriptionPlan.create({ data });
}

async function main() {
  const adapter = new PrismaPg(process.env['DATABASE_URL']!);
  const db = new PrismaClient({ adapter });
  await db.$connect();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const freePlan = await upsertPlan(db, 0, {
    level: 0,
    name: 'Free',
    price: 0,
    maxOperators: 1,
    hasAnalytics: false,
    hasTemplates: false,
    hasRecipients: false,
    hasSupport: true,
    autoRenewDefault: true,
    isPublic: true,
    isPersonal: false,
    isActive: true,
  });

  await upsertPlan(db, 1, {
    level: 1,
    name: 'Pro',
    price: 299,
    priceYearly: 2990,
    maxOperators: 999,
    hasAnalytics: true,
    hasTemplates: true,
    hasRecipients: true,
    hasSupport: true,
    autoRenewDefault: true,
    isPublic: true,
    isPersonal: false,
    isActive: true,
  });

  await upsertPlan(db, 2, {
    level: 2,
    name: 'Business',
    price: 799,
    priceYearly: 7990,
    maxOperators: 999,
    hasAnalytics: true,
    hasTemplates: true,
    hasRecipients: true,
    hasSupport: true,
    autoRenewDefault: true,
    isPublic: true,
    isPersonal: false,
    isActive: true,
  });

  await db.postalService.upsert({
    where: { slug: 'nova-post' },
    create: { slug: 'nova-post', name: 'Нова пошта', isActive: true },
    update: { name: 'Нова пошта', isActive: true },
  });

  await db.postalService.upsert({
    where: { slug: 'ukrposhta' },
    create: { slug: 'ukrposhta', name: 'Укрпошта', isActive: true },
    update: { name: 'Укрпошта', isActive: true },
  });

  await db.postalService.upsert({
    where: { slug: 'meest' },
    create: { slug: 'meest', name: 'Міст', isActive: true },
    update: { name: 'Міст', isActive: true },
  });

  const client = await db.user.upsert({
    where: { email: 'client@sendit.dev' },
    create: {
      email: 'client@sendit.dev',
      role: 'CLIENT',
      status: 'ACTIVE',
      profileCompleted: true,
    },
    update: { role: 'CLIENT', status: 'ACTIVE', profileCompleted: true },
  });

  await db.userCredentials.upsert({
    where: { userId: client.id },
    create: { userId: client.id, passwordHash },
    update: { passwordHash },
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

  // Seed FREE balance for client user if none exists
  const existingBalance = await db.userSubscriptionBalance.findFirst({
    where: { userId: client.id, status: 'ACTIVE' },
  });
  if (!existingBalance) {
    await db.userSubscriptionBalance.create({
      data: {
        userId: client.id,
        planId: freePlan.id,
        periodType: 'MONTHLY',
        daysTotal: 0,
        periodEnd: null,
        status: 'ACTIVE',
        autoRenew: true,
        position: 0,
      },
    });
  }

  const admin = await db.admin.upsert({
    where: { email: 'admin@sendit.dev' },
    create: {
      email: 'admin@sendit.dev',
      firstName: 'Admin',
      lastName: 'User',
      isSuperAdmin: false,
      status: 'ACTIVE',
    },
    update: { firstName: 'Admin', lastName: 'User', isSuperAdmin: false, status: 'ACTIVE' },
  });

  await db.adminCredentials.upsert({
    where: { adminId: admin.id },
    create: { adminId: admin.id, passwordHash },
    update: { passwordHash },
  });

  const superAdmin = await db.admin.upsert({
    where: { email: 'superadmin@sendit.dev' },
    create: {
      email: 'superadmin@sendit.dev',
      firstName: 'Super',
      lastName: 'Admin',
      isSuperAdmin: true,
      status: 'ACTIVE',
    },
    update: { firstName: 'Super', lastName: 'Admin', isSuperAdmin: true, status: 'ACTIVE' },
  });

  await db.adminCredentials.upsert({
    where: { adminId: superAdmin.id },
    create: { adminId: superAdmin.id, passwordHash },
    update: { passwordHash },
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
