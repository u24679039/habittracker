// Load database configuration and connect Prisma to PostgreSQL.

const path = require("path");

// Always load the .env file inside Server_Back.
require("dotenv").config({
  path: path.join(__dirname, "..", ".env")
});

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in Server_Back/.env");
}

// PostgreSQL connection pool.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Connect Prisma to PostgreSQL using the pg adapter.
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = { prisma };