/**
 * Combined seed script for local demo data and admin creation.
 *
 * Run with: npx prisma db seed
 * (or directly: node prisma/seed.js)
 */
const bcrypt = require('bcrypt');
require("dotenv").config();
const  prisma  = require('./client');
const Habit = require('../HabitTracking/Habit');
const { createAdmin } = require("../Auth_Security_Admin/authService"); // Adjust relative path if authService is elsewhere

const DEMO_EMAILS = ['demo@habitforge.test', 'alex@habitforge.test', 'jordan@habitforge.test'];
const TEST_USER_EMAIL = 'test@example.com';
const DEMO_INVITE_CODE = 'DEMO-1234';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);

async function resyncSequence(table, column) {
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"${table}"', '${column}'),
      COALESCE((SELECT MAX("${column}") FROM "${table}"), 0) + 1,
      false
    )
  `);
}

/* ------------------------------------------------------------------ */
/* Part 1: Demo team + group                                           */
/* ------------------------------------------------------------------ */

function buildHistory({ days, currentStreak, completionRate }) {
  const statuses = [];
  for (let i = 0; i < days; i += 1) {
    if (i < currentStreak) {
      statuses.push('COMPLETED');
    } else if (i === currentStreak) {
      statuses.push('MISSED');
    } else {
      const r = rng();
      if (r < completionRate) statuses.push('COMPLETED');
      else if (r < completionRate + 0.08) statuses.push('REST_DAY');
      else if (r < completionRate + 0.12) statuses.push('SNOOZED');
      else statuses.push('MISSED');
    }
  }
  return statuses;
}

async function createHabitWithHistory(userId, def) {
  const habit = await prisma.habit.create({
    data: {
      userId:userId,
      title: def.name, // Updated from 'name' to 'title' to match DB schema
      targetValue: def.targetValue,
      targetUnit: def.targetUnit,
      frequency: 'DAILY',
    },
  });

  const statuses = buildHistory(def);
  for (let i = 0; i < statuses.length; i += 1) {
    const now = new Date();
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const status = statuses[i];

    await prisma.habitLog.create({
      data: {
        userId:userId,
        habitId: habit.habitId,
        completedAt: date,
        value: status === 'COMPLETED' ? def.targetValue : 0,
        status,
      },
    });
  }
  return habit;
}

async function seedDemoTeam() {
  const hashedPassword1 = await bcrypt.hash('demo1', 10);
  const hashedPassword2 = await bcrypt.hash('demo2', 10);
  const hashedPassword3 = await bcrypt.hash('demo3', 10);
  const demo = await prisma.user.create({
    data: { name: 'Demo Student', email: DEMO_EMAILS[0], passwordHash: hashedPassword1, role: 'USER' },
  });
  const alex = await prisma.user.create({
    data: { name: 'Alex Rivera', email: DEMO_EMAILS[1], passwordHash: hashedPassword2, role: 'USER' },
  });
  const jordan = await prisma.user.create({
    data: { name: 'Jordan Kim', email: DEMO_EMAILS[2], passwordHash: hashedPassword3, role: 'USER' },
  });

  const group = await prisma.accountabilityGroup.create({
    data: {
      name: 'Alpha Squad',
      description: 'Weekly study + exercise goals',
      inviteCode: DEMO_INVITE_CODE,
      createdBy: demo.userId,
    },
  });
  await prisma.groupMembership.createMany({
    data: [
      { userId: demo.userId, groupId: group.groupId, role: 'OWNER' },
      { userId: alex.userId, groupId: group.groupId, role: 'MEMBER' },
      { userId: jordan.userId, groupId: group.groupId, role: 'MEMBER' },
    ],
  });

  const demoHabits = await Promise.all([
    createHabitWithHistory(demo.userId, {
      name: 'Sleep 8 hours',
      targetValue: 8,
      targetUnit: 'hours',
      days: 40,
      currentStreak: 21,
      completionRate: 0.9,
    }),
    createHabitWithHistory(demo.userId, {
      name: 'Meditate',
      targetValue: 10,
      targetUnit: 'minutes',
      days: 40,
      currentStreak: 12,
      completionRate: 0.85,
    }),
    createHabitWithHistory(demo.userId, {
      name: 'Read',
      targetValue: 20,
      targetUnit: 'pages',
      days: 40,
      currentStreak: 4,
      completionRate: 0.6,
    }),
    createHabitWithHistory(demo.userId, {
      name: 'Exercise',
      targetValue: 30,
      targetUnit: 'minutes',
      days: 40,
      currentStreak: 0,
      completionRate: 0.7,
    }),
  ]);

  const alexHabits = await Promise.all([
    createHabitWithHistory(alex.userId, {
      name: 'Run 5k',
      targetValue: 5,
      targetUnit: 'km',
      days: 20,
      currentStreak: 6,
      completionRate: 0.75,
    }),
  ]);
  const jordanHabits = await Promise.all([
    createHabitWithHistory(jordan.userId, {
      name: 'Study session',
      targetValue: 2,
      targetUnit: 'hours',
      days: 20,
      currentStreak: 3,
      completionRate: 0.65,
    }),
  ]);

  const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000);
  await prisma.activity.createMany({
    data: [
      {
        groupId: group.groupId,
        userId: alex.userId,
        habitId: alexHabits[0].habitId,
        activityType: 'MEMBER_JOINED',
        message: 'Alex Rivera joined Alpha Squad',
        timestamp: hoursAgo(24 * 12),
      },
      {
        groupId: group.groupId,
        userId: jordan.userId,
        habitId: jordanHabits[0].habitId,
        activityType: 'MEMBER_JOINED',
        message: 'Jordan Kim joined Alpha Squad',
        timestamp: hoursAgo(24 * 10),
      },
      {
        groupId: group.groupId,
        userId: demo.userId,
        habitId: demoHabits[0].habitId,
        activityType: 'STREAK_MILESTONE',
        message: 'Demo Student hit a 21-day sleep streak!',
        timestamp: hoursAgo(3),
      },
      {
        groupId: group.groupId,
        userId: alex.userId,
        habitId: alexHabits[0].habitId,
        activityType: 'HABIT_COMPLETED',
        message: 'Alex Rivera completed "Run 5k"',
        timestamp: hoursAgo(5),
      },
      {
        groupId: group.groupId,
        userId: jordan.userId,
        habitId: jordanHabits[0].habitId,
        activityType: 'HABIT_COMPLETED',
        message: 'Jordan Kim completed "Study session"',
        timestamp: hoursAgo(9),
      },
      {
        groupId: group.groupId,
        userId: demo.userId,
        habitId: demoHabits[1].habitId,
        activityType: 'HABIT_COMPLETED',
        message: 'Demo Student completed "Meditate"',
        timestamp: hoursAgo(14),
      },
      {
        groupId: group.groupId,
        userId: alex.userId,
        activityType: 'STREAK_MILESTONE',
        message: 'Alex Rivera hit a 6-day running streak!',
        timestamp: hoursAgo(30),
      },
      {
        groupId: group.groupId,
        userId: demo.userId,
        activityType: 'GROUP_ANNOUNCEMENT',
        message: 'Demo Student: "Let\'s all hit our goals this week!"',
        timestamp: hoursAgo(48),
      },
    ],
  });

  console.log('Seeded demo team:');
  console.log(`  - Demo Student (userId=${demo.userId}): 4 habits, 40 days of logs`);
  console.log(`  - Alex Rivera (userId=${alex.userId}): 1 habit, 20 days of logs`);
  console.log(`  - Jordan Kim (userId=${jordan.userId}): 1 habit, 20 days of logs`);
  console.log('  - 1 group ("Alpha Squad") with all 3 members, 8 activity feed events');
}

/* ------------------------------------------------------------------ */
/* Part 2: Habit Tracking test data                                    */
/* ------------------------------------------------------------------ */

async function seedHabitTracking() {
  const testUser = await prisma.user.create({
    data: {
      email: TEST_USER_EMAIL,
      passwordHash: 'password',
      name: 'Test User',
    },
  });
  const userId = testUser.userId;

  const habit1 = new Habit(null, userId, 'Morning Run', 'Run 5km', 5, 'km', 'DAILY', '', true, new Date());
  await habit1.save();

  const habit2 = new Habit(null, userId, 'Read book ', 'Read 20 pages', 20, 'pages', 'DAILY', '', true, new Date());
  await habit2.save();

  const habit3 = new Habit(null, userId, 'Meditation', '10 mins mindfulness', 10, 'minutes', 'DAILY', '', true, new Date());
  await habit3.save();

  const habit4 = new Habit(null, userId, 'Drink Water', 'Drink 2L', 2, 'L', 'DAILY', '', true, new Date());
  await habit4.save();

  const startDate = new Date('2026-08-01T00:00:00Z');
  for (let i = 0; i < 8; i++) {
    const logDate = new Date(startDate);
    logDate.setUTCDate(logDate.getUTCDate() + i);
    await habit1.logCompletion(logDate, 5, `completed day${i + 1}`);
  }
  for (let i = 8; i < 10; i++) {
    const missedDate = new Date(startDate);
    missedDate.setUTCDate(missedDate.getUTCDate() + i);
    await habit1.logMissed(missedDate, 0, `Missed day${i + 1}`);
  }

  const h2StartDate = new Date();
  h2StartDate.setUTCHours(12, 0, 0, 0);
  h2StartDate.setUTCDate(h2StartDate.getUTCDate() - 2);

  for (let i = 0; i < 3; i++) {
    const logDate = new Date(h2StartDate);
    logDate.setUTCDate(h2StartDate.getUTCDate() + i);
    await habit2.logCompletion(logDate, 20, `Completed reading day ${i + 1}`);
  }

  console.log(`Seeded habit tracking data: Test User (userId=${userId}), 4 habits with history`);
}

/* ------------------------------------------------------------------ */
/* Part 3: Demo Admin Creation                                         */
/* ------------------------------------------------------------------ */

async function seedAdmin() {
  const name = process.env.DEMO_ADMIN_NAME;
  const email = process.env.DEMO_ADMIN_EMAIL;
  const password = process.env.DEMO_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error("Demo admin environment variables are missing.");
    console.error("Set DEMO_ADMIN_NAME, DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD in .env.");
    return;
  }

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: email
    },
    select: {
      userId: true,
      email: true,
      role: true
    }
  });

  if (existingAdmin) {
    console.log("Demo admin already exists.");
    console.log("Email:", existingAdmin.email);
    console.log("Role:", existingAdmin.role);
    return;
  }

  const result = await createAdmin(name, email, password);

  if (result.success) {
    console.log("Demo admin created successfully.");
    console.log("Email:", email);
  } else {
    console.log(result.message);
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  await prisma.accountabilityGroup.deleteMany({ where: { inviteCode: DEMO_INVITE_CODE } });
  await prisma.user.deleteMany({ where: { email: { in: [...DEMO_EMAILS, TEST_USER_EMAIL] } } });

  await resyncSequence('users', 'user_id');
  await resyncSequence('habits', 'habitId'); // Matched to actual schema casing
  await resyncSequence('habit_logs', 'logId'); // Matched to actual schema casing
  await resyncSequence('accountability_groups', 'group_id');
  await resyncSequence('group_memberships', 'membership_id');
  await resyncSequence('activities', 'activity_id');

  await seedDemoTeam();
  await seedHabitTracking();
  await seedAdmin();

  console.log('Database successfully seeded.');
  console.log('Point the frontend/backend at userId=1 (Demo Student) for the demo.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });