

const express = require('express');
const cors = require('cors');
const { prisma } = require('./prisma/client'); 

const app = express();

app.use(cors());

app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});