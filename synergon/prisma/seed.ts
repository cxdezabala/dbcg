import { PrismaClient } from '@prisma/client';
import { seedDemo } from '../src/server/seed';

const db = new PrismaClient();
seedDemo(db)
  .then(async () => { console.log('SYNERGON demo data seeded (Asterion Business Solutions — fictional).'); await db.$disconnect(); })
  .catch(async e => { console.error(e); await db.$disconnect(); process.exit(1); });
