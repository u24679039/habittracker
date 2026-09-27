/**
 * Seed script for local demo data.
 *
 * Run with: npx prisma db seed
 * (or directly: node prisma/seed.js)
 *
 * Creates a small "team" for the demo:
 *  - Demo Student (the account the frontend is pointed at, userId=1 in a
 *    fresh database): 4 habits with deliberately varied completion
 *    patterns (a star performer, a moderate one, a currently-broken
 *    streak, and a high-consistency one), ~40 days of logs each - enough
 *    for the trend chart, heatmap, and per-habit breakdown to all show
 *    something visually interesting instead of flat/empty.
 *  - Two more group members (Alex Rivera, Jordan Kim) with their own
 *    habits/logs, so the "Group activity" feed has more than one voice.
 *  - One shared group ("Alpha Squad") all three belong to, with 8
 *    activity feed events spread across the last two weeks.
 *
 * Uses a fixed-seed PRNG (not Math.random) so re-running this before your
 * demo produces the *same* data every time - useful if you've already
 * taken GUI test log screenshots against a particular run and don't want
 * the numbers to shift.
 *
 * Safe to re-run: deletes and recreates all three demo users first.
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter }); 

const DEMO_EMAILS = ['demo@habitforge.test', 'alex@habitforge.test', 'jordan@habitforge.test'];
const DEMO_INVITE_CODE = 'DEMO-1234';

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
 * Builds a `days`-long array of statuses, index 0 = today, oldest last.
 * Guarantees the most recent `currentStreak` days are COMPLETED (so the
 * demo shows a real, non-zero current streak), forces a MISSED right
 * after that so the streak visibly and deliberately ends there, then
 * fills the rest of the history randomly around `completionRate`.
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
    // Create date anchored to UTC midnight to avoid local timezone drift
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

/**
 * Resets a table's auto-increment sequence to match what's actually left
 * in it, rather than blindly forcing it to 1. After this seed script's
 * cleanup step, these tables are empty, so this naturally makes the next
 * inserted row get id=1 again - keeping "Demo Student" at userId=1 on
 * every re-seed, so the frontend's hardcoded DEMO_USER_ID never drifts.
 * If the table isn't empty (e.g. you've added other rows by hand via
 * Prisma Studio), this safely continues after the current max id instead
 * of colliding with them - unlike a hardcoded `RESTART WITH 1` would.
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

async function main() {
  // Clean up everything from a previous seed run - both the users AND the
  // group they created. Deleting only the users left the old group behind
  // (deleting a user doesn't cascade "upward" to things they own), which
  // then collided with the new group's invite code on the unique
  // constraint. GroupMembership/Activity rows cascade-delete automatically
  // when their group is deleted (see schema.prisma), so this one line
  // cleans up the whole old group tree.
  await prisma.accountabilityGroup.deleteMany({ where: { inviteCode: DEMO_INVITE_CODE } });
  await prisma.user.deleteMany({ where: { email: { in: DEMO_EMAILS } } });

  // Re-sync every id sequence this seed touches, so IDs are deterministic
  // across re-seeds instead of drifting upward forever (Postgres SERIAL
  // never reuses ids just because rows were deleted).
  await resyncSequence('users', 'user_id');
  await resyncSequence('habits', 'habit_id');
  await resyncSequence('habit_logs', 'log_id');
  await resyncSequence('accountability_groups', 'group_id');
  await resyncSequence('group_memberships', 'membership_id');
  await resyncSequence('activities', 'activity_id');

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
      completionRate: 0.7, // but a decent highest-streak buried in the history
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

  console.log('Seeded demo data:');
  console.log(`  - Demo Student (userId=${demo.userId}): 4 habits, 40 days of logs`);
  console.log(`  - Alex Rivera (userId=${alex.userId}): 1 habit, 20 days of logs`);
  console.log(`  - Jordan Kim (userId=${jordan.userId}): 1 habit, 20 days of logs`);
  console.log('  - 1 group ("Alpha Squad") with all 3 members, 8 activity feed events');
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