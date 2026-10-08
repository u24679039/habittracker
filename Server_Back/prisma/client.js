// client.js
const path = require("path");

// Force dotenv to look in the root of your Server_Back folder or project root.
// Adjust the '../.env' depending on where client.js is relative to your .env file.
require("dotenv").config({ path: path.resolve(__dirname, '../.env') }); 
// If client.js and .env are in the exact same folder, change it to: path.resolve(__dirname, '.env')

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

console.log("Loaded DATABASE_URL:", process.env.DATABASE_URL ? "Success!" : "UNDEFINED!");

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing! dotenv could not find your .env file.");
}

// Init Postgres connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Pass the pool to Prisma adapter
const adapter = new PrismaPg(pool);

// make instance of client from the adapter
const prisma = new PrismaClient({ adapter });

module.exports = { prisma };