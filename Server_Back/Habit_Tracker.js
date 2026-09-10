const Habit = require('./Habit');
// const myHabit = new Habit(1, 101, "Exercise", "Daily workout", 30, "minutes", "DAILY", "ACTIVE");
// myHabit.create();
const Habit_Log = require('./Habit_Log');
const Activity = require('./Activity');

const express = require('express');
const cors = require('cors');
const { prisma } = require('./prisma/client'); // pulls from client.js


const app = express();

app.use(cors());

app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});











