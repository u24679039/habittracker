require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = global.__habitforgePool || new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = global.__habitforgeAdapter || new PrismaPg(pool);
const prisma = global.__habitforgePrisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  global.__habitforgePool = pool;
  global.__habitforgeAdapter = adapter;
  global.__habitforgePrisma = prisma;
}

module.exports = prisma;