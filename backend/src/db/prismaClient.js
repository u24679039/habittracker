const { PrismaClient } = require('@prisma/client');

// A single shared Prisma Client instance for the whole process. Stashed on
// `global` outside production so that hot-reloading in dev doesn't spawn a
// new connection pool on every file change (the standard Prisma pattern).
const prisma = global.__habitforgePrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__habitforgePrisma = prisma;
}

module.exports = prisma;
