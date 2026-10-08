const Habit = require('../HabitTracking/Habit');
// const myHabit = new Habit(1, 101, "Exercise", "Daily workout", 30, "minutes", "DAILY", "ACTIVE");
// myHabit.create();
const HabitLog = require('../HabitTracking/Habit_Log');
const HabitLogic = require('../HabitTracking/Habit_Tracker_Logic');

const express = require('express');
const cors = require('cors');
const { prisma } = require('../prisma/client'); // pulls from client.js