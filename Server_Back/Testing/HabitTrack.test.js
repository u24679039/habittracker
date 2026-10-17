//--------------------------------File Import block------------------------
//-------------------------------------------------------------------------
const Habit = require('../HabitTracking/Habit');
// const myHabit = new Habit(1, 101, "Exercise", "Daily workout", 30, "minutes", "DAILY", "ACTIVE");
// myHabit.create();
const HabitLog = require('../HabitTracking/Habit_Log');
const { prisma } = require('../prisma/client'); // pulls from client.js
//-------------------------------------------------------------------------

// Run with: npx jest HabitTracking.test.js --runInBand
//
// What changed from the old hand-rolled runner:
//  - The `Testing()` function, the allTests/testsPassed/testsNotPassed
//    arrays and the console summary are gone. Jest does the pass/fail
//    bookkeeping and reporting now, so each old "TestNN" function is a
//    `test()` block with real `expect()` assertions.
//  - The unused express/cors/`app` setup and the
//    `require('../HabitTracking/habitRoutes')` import were removed. That
//    file is now the Express router (it also schedules the midnight cron
//    job when loaded), and nothing in these tests used it.
//  - The old runner pulled `readingHabit.id`, but the primary key on the
//    habit table is `habitId`, so that value was always undefined.
//
// NB  The old version of these tests used hard-coded IDs (habit 1, 3, 4, 5
// and user 1) and relied on a seeded database ("Read book " with 3
// completed logs and so on). That only lined up on a completely fresh,
// empty database seeded in exactly the right order. These tests now create
// their own user, habits and logs, capture the real IDs off the saved
// records, and delete everything in afterAll, so they can be run repeatedly
// against the same DB. Point DATABASE_URL at a TEST database anyway, because
// these tests do write real rows.

jest.setTimeout(30000);

let testUserId;

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

// Creates and saves a habit for the test user. Pass overrides to change
// any field. Returns both the Habit instance and the saved DB record.
async function createHabit(overrides = {}) {
    const {
        title = "Test habit",
        description = "Test description",
        targetValue = 1,
        targetUnit = "units",
        frequency = "DAILY",
        activated = true,
    } = overrides;

    // habitId is null: it comes from the DB (auto-increment) on save().
    // Status is "" so save() falls back to ACTIVE.
    const habit = new Habit(null, testUserId, title, description, targetValue, targetUnit, frequency, "", activated, new Date());
    const saved = await habit.save();
    return { habit, saved };
}

// Saves a single HabitLog row for the given habit.
function addLog(habitId, date, status, value = 0, note = "") {
    const log = new HabitLog(null, habitId, testUserId, date, value, status, note, new Date());
    return log.save();
}

// A date `n` days before now (0 = today).
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

// ---------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------

beforeAll(async () => {
    // Our own user, so we never depend on a pre-seeded user 1. The User model
    // uses `passwordHash` (not `password`) and `userId` (not `id`) as its key.
    // If it has other required fields, add them here.
    const user = await prisma.user.create({
        data: {
            name: "Habit Test User",
            email: `habit-test-${Date.now()}@example.com`,
            passwordHash: "not-a-real-password-hash",
            role: "USER",
        },
    });
    testUserId = user.userId;
});

afterAll(async () => {
    if (testUserId !== undefined) {
        // children first (logs -> habits -> user) so foreign keys don't block it
        await prisma.habitLog.deleteMany({ where: { userId: testUserId } });
        await prisma.habit.deleteMany({ where: { userId: testUserId } });
        await prisma.user.delete({ where: { userId: testUserId } });
    }
    await prisma.$disconnect();
});

//No.
// Habit Create:
// Tested Class
// Inputs
//Expected Output

describe("Habit", () => {
    test("Test 16: Habit.save() creates the habit and returns the saved record", async () => {
        // 16
        // Habit Create()
        // name = Entertainment, TargetValue = 6, targetUnit = Hours, Freq = WEEKLY
        // (the old comment here said Reading/30/minutes/DAILY, which is not
        // what the test actually created)
        // True: a record comes back
        const { saved } = await createHabit({
            title: "Entertainment",
            description: "watch TV",
            targetValue: 6,
            targetUnit: "Hours",
            frequency: "WEEKLY",
        });

        expect(saved).toBeTruthy();
        expect(saved.habitId).toBeDefined();
        expect(saved.title).toBe("Entertainment");
        // no status was passed in, so save() should default it to ACTIVE
        expect(saved.StatusOfHabit).toBe("ACTIVE");
    });

    test("Test 17: Habit update methods change name, target value, target unit and frequency", async () => {
        // 17
        // Habit Update()
        // Start as Study / 10 hours / WEEKLY, then update to
        // name = Drink lots of water, TargVal = 3, TargUnit = L, freq = DAILY
        // true: every update succeeds and the DB row reflects the changes
        const { habit, saved } = await createHabit({
            title: "Study",
            description: "Do past papers and prac questions",
            targetValue: 10,
            targetUnit: "hours",
            frequency: "WEEKLY",
        });

        await habit.updateName("Drink lots of water");
        await habit.updateTargetValue(3);
        await habit.updateTargetUnit("L");
        await habit.updateFreq("DAILY");

        const row = await prisma.habit.findUnique({ where: { habitId: saved.habitId } });
        expect(row.title).toBe("Drink lots of water");
        expect(row.targetValue).toBe(3);
        expect(row.targetUnit).toBe("L");
        expect(row.frequency).toBe("DAILY");
    });

    test("Test 18: Habit.archiveHabit() archives an active habit", async () => {
        // 18
        // Habit.archive()
        // Status = Active
        // true
        const { habit, saved } = await createHabit({
            title: "Revise ",
            description: "Revision",
            targetValue: 2,
            targetUnit: "hours",
        });

        const didArchive = await habit.archiveHabit(saved.habitId);

        expect(didArchive).toBe(true);
        const row = await prisma.habit.findUnique({ where: { habitId: saved.habitId } });
        expect(row.Activated).toBe(false);
        expect(row.archivedAt).not.toBeNull();
    });

    test("Test 19: Habit.archiveHabit() on an already archived habit returns false", async () => {
        // 19
        // Habit.archive() on a habit that's ALREADY archived
        // status = Archived
        // expected: false (nothing to archive, so nothing happens)
        //
        // This test calls the real archiveHabit() method and trusts what it
        // reports. The guard that checks whether a habit is already archived
        // lives in Habit.js (it used to be worked around inside the test
        // itself by reading `habit.Active` directly).
        const { habit, saved } = await createHabit({
            title: "Meditation",
            description: "10 mins mindfulness",
            targetValue: 10,
            targetUnit: "minutes",
            activated: false,
        });

        const result = await habit.archiveHabit(saved.habitId);

        expect(result).toBe(false);
    });

    test("Test 20: Habit.logCompletion() returns the saved HabitLog record", async () => {
        // 20
        // Habit.logCompletion()
        // value = 30, note = Completed
        // HabitLog obj
        const { habit, saved } = await createHabit({
            title: "Excercise",
            description: "Daily workout",
            targetValue: 30,
            targetUnit: "minutes",
        });

        const log = await habit.logCompletion(new Date(), 30, "Completed");

        // check if correct HabitLog object is returned
        expect(typeof log).toBe("object");
        expect(log).not.toBeNull();
        expect(log.habitId).toBe(saved.habitId);
        expect(log.status).toBe("COMPLETED");
        expect(log.value).toBe(30);

        // logging a completion also sets the habit's own status to COMPLETED
        const row = await prisma.habit.findUnique({ where: { habitId: saved.habitId } });
        expect(row.StatusOfHabit).toBe("COMPLETED");
    });

    test("Test 21: Habit.calculateStreak() returns 3 for 3 consecutive completed logs", async () => {
        // 21
        // Habit.calculateStreak()
        // 3 consecutive completed logs
        // 3
        //
        // This used to read a pre-seeded habit ("Read book ") and expect the
        // seed data to contain exactly 3 consecutive days. It now creates the
        // habit and the 3 logs itself (today, yesterday, the day before), so
        // it doesn't depend on whatever is in the database.
        const { habit, saved } = await createHabit({
            title: "Read book ",
            description: "Read 20 pages",
            targetValue: 20,
            targetUnit: "pages",
        });
        await addLog(saved.habitId, daysAgo(0), "COMPLETED", 20);
        await addLog(saved.habitId, daysAgo(1), "COMPLETED", 20);
        await addLog(saved.habitId, daysAgo(2), "COMPLETED", 20);

        const streak = await habit.calculateStreak();

        expect(streak).toBe(3);
    });

    test("Test 22: Habit.calculateStreak() returns 0 when there are no consecutive completed logs", async () => {
        // 22
        // Habit.calculateStreak()
        // No consecutive completed logs
        // 0
        const { habit } = await createHabit({
            title: "Drink lots of water",
            description: "Drink 3L of water",
            targetValue: 3,
            targetUnit: "L",
        });

        const streak = await habit.calculateStreak();

        expect(streak).toBe(0);
    });

    test("Test 23: Habit.getHistory() returns the logs inside the date range", async () => {
        // 23
        // Habit.getHistory()
        // from = 2026-08-01, to = 2026-08-07; logs exist
        // MatchingList<HabitLog>
        const fromDate = new Date("2026-08-01");
        const toDate = new Date("2026-08-07");
        const { habit } = await createHabit({
            title: "Morning Run",
            description: "Run 5km",
            targetValue: 5,
            targetUnit: "km",
        });
        await habit.logCompletion(new Date("2026-08-05"), 5, "");

        const history = await habit.getHistory(fromDate, toDate);

        // Check if correct history object is returned
        expect(Array.isArray(history)).toBe(true);
        expect(history.length).toBeGreaterThan(0);
        expect(history[0].status).toBe("COMPLETED");
    });

    test("Test 24: Habit.getHistory() returns an empty list when there are no logs in range", async () => {
        // 24
        // Habit.getHistory()
        // from = 2026-08-01, to = 2026-08-07; no logs
        // EmptyList<HabitLog>
        const fromDate = new Date("2026-08-01");
        const toDate = new Date("2026-08-07");
        const { habit } = await createHabit({
            title: "Drink lots of water",
            description: "Drink 3L of water",
            targetValue: 3,
            targetUnit: "L",
        });

        const history = await habit.getHistory(fromDate, toDate);

        // check if history object is empty
        expect(Array.isArray(history)).toBe(true);
        expect(history).toHaveLength(0);
    });

    test("Test 25: Habit.getCompletionRate() returns 80 for 8 completed and 2 missed logs", async () => {
        // 25
        // Habit.getCompletionRate()
        // 8 completed, 2 missed logs over a 10 day range
        // Correct double rate (80.00)
        //
        // Like Test 21, this used to rely on seeded data (habit 1). It now
        // creates its own 10 logs: Aug 1-8 COMPLETED, Aug 9-10 MISSED.
        // getCompletionRate() divides completed logs by the number of days
        // in the range (Aug 1 to Aug 11 = 10 days), so 8 / 10 = 80%.
        const fromDate = new Date("2026-08-01");
        const toDate = new Date("2026-08-11");
        const { habit, saved } = await createHabit({
            title: "Morning Run",
            description: "Run 5km",
            targetValue: 5,
            targetUnit: "km",
        });

        for (let day = 1; day <= 10; day++) {
            const date = new Date(`2026-08-${String(day).padStart(2, "0")}T12:00:00.000Z`);
            const status = day <= 8 ? "COMPLETED" : "MISSED";
            await addLog(saved.habitId, date, status, status === "COMPLETED" ? 5 : 0);
        }

        const rate = await habit.getCompletionRate(fromDate, toDate);

        expect(rate).toBe(80.0);
    });
});

describe("HabitLog", () => {
    test("Test 26: HabitLog.save() persists the log", async () => {
        // 26
        // HabitLog.save()
        // value = 30.0, status = COMPLETED, note = "completed"
        // true
        const { saved: habitRecord } = await createHabit();
        const log = new HabitLog(null, habitRecord.habitId, testUserId, new Date(), 30, "COMPLETED", "completed", new Date());

        const saved = await log.save();

        expect(saved).toBeTruthy();
        expect(saved.logId).toBeDefined();
        expect(saved.status).toBe("COMPLETED");
        expect(saved.value).toBe(30);
    });

    test("Test 27: HabitLog update methods change value, status and note", async () => {
        // 27
        // HabitLog.update()
        // value = 25.0, status = MISSED, note = "Not completed"
        // true
        //
        // The log is saved as 30 / COMPLETED first, then updated, so the
        // test shows that the values actually change (before, it saved the
        // final values up front and the updates were no-ops).
        const { saved: habitRecord } = await createHabit();
        const log = new HabitLog(null, habitRecord.habitId, testUserId, new Date(), 30, "COMPLETED", "completed", new Date());
        const savedLog = await log.save();

        await log.updateValue(25);
        await log.updateStatus("MISSED");
        await log.updateNote("Not Completed");

        const row = await prisma.habitLog.findUnique({ where: { logId: savedLog.logId } });
        expect(row.value).toBe(25);
        expect(row.status).toBe("MISSED");
        expect(row.note).toBe("Not Completed");
    });

    // Tests 28-33 are pure (no database needed): they only check the status
    // helper methods on a HabitLog instance.

    test("Test 28: HabitLog.isCompleted() is true for status COMPLETED", () => {
        // 28
        // HabitLog.isCompleted()
        // status = COMPLETED
        // true
        const log = new HabitLog(null, 1, 1, new Date(), 0, "COMPLETED", "", new Date());
        expect(log.isCompleted()).toBe(true);
    });

    test("Test 29: HabitLog.isCompleted() is false for status MISSED", () => {
        // 29
        // HabitLog.isCompleted()
        // status = MISSED
        // false
        const log = new HabitLog(null, 1, 1, new Date(), 0, "MISSED", "", new Date());
        expect(log.isCompleted()).toBe(false);
    });

    test("Test 30: HabitLog.isRestDay() is true for status REST_DAY", () => {
        // 30
        // HabitLog.isRestDay()
        // status = REST_DAY
        // true
        const log = new HabitLog(null, 1, 1, new Date(), 0, "REST_DAY", "", new Date());
        expect(log.isRestDay()).toBe(true);
    });

    test("Test 31: HabitLog.isRestDay() is false for status COMPLETED", () => {
        // 31
        // HabitLog.isRestDay()
        // status = COMPLETED
        // false
        const log = new HabitLog(null, 1, 1, new Date(), 0, "COMPLETED", "", new Date());
        expect(log.isRestDay()).toBe(false);
    });

    test("Test 32: HabitLog.isSnoozed() is true for status SNOOZED", () => {
        // 32
        // HabitLog.isSnoozed()
        // status = SNOOZED
        // true
        const log = new HabitLog(null, 1, 1, new Date(), 0, "SNOOZED", "", new Date());
        expect(log.isSnoozed()).toBe(true);
    });

    test("Test 33: HabitLog.isSnoozed() is false for status COMPLETED", () => {
        // 33
        // HabitLog.isSnoozed()
        // status = COMPLETED
        // false
        const log = new HabitLog(null, 1, 1, new Date(), 0, "COMPLETED", "", new Date());
        expect(log.isSnoozed()).toBe(false);
    });
});