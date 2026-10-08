/**
 * Combined seed script for local demo data.
 *
 * Run with: npx prisma db seed
 * (or directly: node prisma/seed.js)
 *
 * Part 1 - Demo team + group (Dashboard / Accountability)
 *  - Demo Student (userId=1 in a fresh database): 4 habits with varied
 *    completion patterns, ~40 days of logs each.
 *  - Alex Rivera and Jordan Kim with their own habits/logs.
 *  - One shared group ("Alpha Squad") with 8 activity feed events.
 *
 * Part 2 - Habit Tracking test data
 *  - "Test User" (test@example.com) with 4 habits built via the Habit class
 *    (Morning Run, Read book, Meditation, Drink Water) plus a little
 *    back-filled history.
 *
 * Uses a fixed-seed PRNG (not Math.random) so re-running produces the
 * *same* demo data every time.
 *
 * Safe to re-run: deletes and recreates all demo/test users and the demo
 * group first, then re-syncs id sequences so Demo Student stays userId=1.
 */
const { prisma } = require('./client');
const Habit = require('../HabitTracking/Habit');

const DEMO_EMAILS = ['demo@habitforge.test', 'alex@habitforge.test', 'jordan@habitforge.test'];
const TEST_USER_EMAIL = 'test@example.com';
const DEMO_INVITE_CODE = 'DEMO-1234';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Deterministic PRNG (mulberry32) so demo data is reproducible across re-seeds. */
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

/**
 * Resets a table's auto-increment sequence to match what's actually left
 * in it (max id + 1, or 1 if empty). Keeps "Demo Student" at userId=1 on
 * every re-seed, so the frontend's hardcoded DEMO_USER_ID never drifts,
 * while staying safe if other rows exist.
 */
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

/**
 * Builds a `days`-long array of statuses, index 0 = today, oldest last.
 * The most recent `currentStreak` days are COMPLETED, a MISSED follows so
 * the streak visibly ends there, and the rest is filled randomly around
 * `completionRate`.
 */
function buildHistory({ days, currentStreak, completionRate }) {
  const statuses = [];
  for (let i = 0; i < days; i += 1) {
    if (i < currentStreak) {
      statuses.push('COMPLETED');
    } else if (i === currentStreak) {
      statuses.push('MISSED'); // guarantees the streak actually ends here
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
      userId,
      name: def.name,
      targetValue: def.targetValue,
      targetUnit: def.targetUnit,
      frequency: 'DAILY',
    },
  });

  const statuses = buildHistory(def);
  for (let i = 0; i < statuses.length; i += 1) {
    // Anchor to UTC midnight to avoid local timezone drift
    const now = new Date();
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const status = statuses[i];

    await prisma.habitLog.create({
      data: {
        habitId: habit.habitId,
        logDate: date,
        value: status === 'COMPLETED' ? def.targetValue : 0,
        status,
      },
    });
  }
  return habit;
}

async function seedDemoTeam() {
  const demo = await prisma.user.create({
    data: { name: 'Demo Student', email: DEMO_EMAILS[0], passwordHash: 'seed-only', role: 'USER' },
  });
  const alex = await prisma.user.create({
    data: { name: 'Alex Rivera', email: DEMO_EMAILS[1], passwordHash: 'seed-only', role: 'USER' },
  });
  const jordan = await prisma.user.create({
    data: { name: 'Jordan Kim', email: DEMO_EMAILS[2], passwordHash: 'seed-only', role: 'USER' },
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

  // Demo Student's habits - deliberately varied so charts look real, not flat.
  const demoHabits = await Promise.all([
    createHabitWithHistory(demo.userId, {
      name: 'Sleep 8 hours',
      targetValue: 8,
      targetUnit: 'hours',
      days: 40,
      currentStreak: 21, // star habit: long, ongoing streak
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
      completionRate: 0.6, // moderate performer
    }),
    createHabitWithHistory(demo.userId, {
      name: 'Exercise',
      targetValue: 30,
      targetUnit: 'minutes',
      days: 40,
      currentStreak: 0, // streak broken as of today - shows the "reset" state
      completionRate: 0.7,
    }),
  ]);

  // Teammates get lighter histories - just enough to populate the group feed.
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

  // A spread-out, varied activity feed - different users, types, and ages.
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
  // Created AFTER the demo users so Demo Student keeps userId=1.
  // (The old HT seed hardcoded userId=1, which would collide with Demo Student.)
  const testUser = await prisma.user.create({
    data: {
      email: TEST_USER_EMAIL,
      passwordHash: 'password',
      name: 'Test User',
    },
  });
  const userId = testUser.userId;

  // Create 4 habits
  const habit1 = new Habit(null, userId, 'Morning Run', 'Run 5km', 5, 'km', 'DAILY', '', true, new Date());
  await habit1.save();

  const habit2 = new Habit(null, userId, 'Read book ', 'Read 20 pages', 20, 'pages', 'DAILY', '', true, new Date());
  await habit2.save();

  const habit3 = new Habit(null, userId, 'Meditation', '10 mins mindfulness', 10, 'minutes', 'DAILY', '', true, new Date());
  await habit3.save();

  const habit4 = new Habit(null, userId, 'Drink Water', 'Drink 2L', 2, 'L', 'DAILY', '', true, new Date());
  await habit4.save();

  // Back-filling a week and a bit of history for the morning run
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

  // 3 completed days in a row for the reading habit
  const h2StartDate = new Date();
  // Use UTC noon to safely avoid timezone date-shifting
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
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  // Clean up everything from a previous seed run: the group first (its
  // memberships/activities cascade), then all seeded users.
  await prisma.accountabilityGroup.deleteMany({ where: { inviteCode: DEMO_INVITE_CODE } });
  await prisma.user.deleteMany({ where: { email: { in: [...DEMO_EMAILS, TEST_USER_EMAIL] } } });

  // Re-sync every id sequence this seed touches so IDs are deterministic.
  await resyncSequence('users', 'user_id');
  await resyncSequence('habits', 'habit_id');
  await resyncSequence('habit_logs', 'log_id');
  await resyncSequence('accountability_groups', 'group_id');
  await resyncSequence('group_memberships', 'membership_id');
  await resyncSequence('activities', 'activity_id');

  await seedDemoTeam();
  await seedHabitTracking();

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