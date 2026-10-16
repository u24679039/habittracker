// const Habit = require('../HabitTracking/Habit');
// // const myHabit = new Habit(1, 101, "Exercise", "Daily workout", 30, "minutes", "DAILY", "ACTIVE");
// // myHabit.create();
// const HabitLog = require('../HabitTracking/Habit_Log');
// const HabitLogic = require('../HabitTracking/Habit_Tracker_Logic');

// const express = require('express');
// const cors = require('cors');
// const { prisma } = require('../prisma/client'); // pulls from client.js







// const express = require("express");
// const cors = require("cors");

// const groupRoutes = require("./routes/groupRoutes");

// const app = express();

// app.use(cors({origin: "http://localhost:5173"}));

// app.use(express.json());

// app.use("/groups", groupRoutes);

// module.exports = app;




// /**
//  * Server entrypoint. Kept separate from app.js so the Express app itself
//  * can be imported directly into supertest for route-level testing
//  * (analyticsRoutes.test.js) without actually opening a network port.
//  */
// require('dotenv').config();
// const app = require('./app');

// const PORT = process.env.PORT || 4000;

// app.listen(PORT, () => {
//   console.log(`HabitTracker dashboard/analytics API listening on port ${PORT}`);
// });
const Habit = require('../HabitTracking/Habit');
// const myHabit = new Habit(1, 101, "Exercise", "Daily workout", 30, "minutes", "DAILY", "ACTIVE");
// myHabit.create();
const HabitLog = require('../HabitTracking/Habit_Log');
const HabitLogic = require('../HabitTracking/Habit_Tracker_Logic');

const groupRoutes = require("./routes/groupRoutes");

const app = express();

app.use(cors({origin: "http://localhost:5173"}));

app.use(express.json());

app.use("/groups", groupRoutes);

module.exports = app;

const express = require('express');
const cors = require('cors');
const { prisma } = require('../prisma/client'); // pulls from client.js


/**
 * Server entrypoint. Kept separate from app.js so the Express app itself
 * can be imported directly into supertest for route-level testing
 * (analyticsRoutes.test.js) without actually opening a network port.
 */
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`HabitTracker dashboard/analytics API listening on port ${PORT}`);
});
