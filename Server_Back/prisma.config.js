require('dotenv').config();
const { defineConfig } = require('@prisma/config');

module.exports = defineConfig({
    datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'node ./prisma/seed.js', // Adjust path if your seed file is located elsewhere
  },
});