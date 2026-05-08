import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService implements OnModuleInit {
  readonly db: PrismaClient;

  constructor() {
    const adapter = new PrismaPg(process.env['DATABASE_URL']!);
    this.db = new PrismaClient({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.db.$connect();
  }
}
