//load DB + connect to PostgreSQL + axport Prisma

require("dotenv").config();

const { PrismaClient } =  require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require( "pg");
// Init Postgres connection pool
const pool =new Pool ({
    connectionString: process.env.DATABASE_URL,
});
// Pass the pool to Prisma adapter
const adapter = new PrismaPg(pool);
// make instance of client from the adapter
const prisma = new PrismaClient({ adapter });

module.exports = { prisma };