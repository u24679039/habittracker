//--------------------------------File Import block------------------------
//-------------------------------------------------------------------------
const Habit = require('./Habit');
// const myHabit = new Habit(1, 101, "Exercise", "Daily workout", 30, "minutes", "DAILY", "ACTIVE");
// myHabit.create();
const HabitLog = require('./Habit_Log');
const HabitLogic = require('./Habit_Tracker_Logic');

const express = require('express');
const cors = require('cors');
const { prisma } = require('./prisma/client'); // pulls from client.js
//-------------------------------------------------------------------------

const app = express();

// These four used to just be assigned without let/const/var anywhere,
// which makes them implicit globals in non-strict JS. It happened to work
// here, but it's the kind of thing that bites you later - a typo in one
// function silently creates a brand-new global instead of throwing an
// error you'd actually notice. Declaring them properly up top instead.
let allTests;
let testsPassed;
let testsNotPassed;
let test21habitId;

// NB  if you touch these tests later: a handful of them
// construct `new Habit(<hard-coded id>, ...)` using specific numbers like
// 1, 3, 4, 5. That only lines up with reality on a completely fresh,
// empty database seeded in exactly this order - run this twice against
// the same DB (or have fillDb partially fail) and those IDs won't point
// at what the test thinks they point at anymore. Test21 and Test23
// already dodge this by capturing the real ID off the saved record
// (`test21habitId`) instead of guessing - that's the safer pattern if
// these get reworked.

async function Testing() {
    allTests = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33];
    testsPassed = [];
    testsNotPassed = [];
    await fillDb();
    //---------------------------------------------------
    //----------------------Call Funcs-------------------
    //---------------------------------------------------
    const Test16Return = await Test16("Exercise", 30, "minutes", "DAILY");
    const Test17Return = await Test17("Reading", 20, "pages", "DAILY");
    const Test18Return = await Test18("ACTIVE");
    const Test19Return = await Test19("ARCHIVED");
    const Test20Return = await Test20(30, "COMPLETED");
    const Test21Return = await Test21();
    const Test22Return = await Test22();
    const test23FromDate = new Date("2026-08-01");
    const test23ToDate = new Date("2026-08-07");
    const test24FromDate = new Date("2026-08-01");
    const test24ToDate = new Date("2026-08-07");
    const Test23Return = await Test23(test23FromDate, test23ToDate);
    const Test24Return = await Test24(test24FromDate, test24ToDate);
    const test25FromDate = new Date("2026-08-01");
    const test25ToDate = new Date("2026-08-11");
    const Test25Return = await Test25(test25FromDate, test25ToDate);
    const Test26Return = await Test26();
    const Test27Return = await Test27();
    const Test28Return = await Test28();
    const Test29Return = await Test29();
    const Test30Return = await Test30();
    const Test31Return = await Test31();
    const Test32Return = await Test32();
    const Test33Return = await Test33();

    //---------------------------------------------------
    //---------------------------------------------------
    //###################################################
    //---------------------------------------------------
    //-------------------Tests Passed?-------------------
    //---------------------------------------------------
    if (Test16Return) {
        testsPassed.push(16);
    } else {
        testsNotPassed.push(16);
        console.log(`Test 16 failed; returned - ${Test16Return}`)
    }

    if (Test17Return) {
        testsPassed.push(17);
    } else {
        testsNotPassed.push(17);
        console.log(`Test 17 failed; returned - ${Test17Return}`)
    }

    if (Test18Return) {
        testsPassed.push(18);
    } else {
        testsNotPassed.push(18);
        console.log(`Test 18 failed; returned - ${Test18Return}`)
    }

    if (!Test19Return) {
        testsPassed.push(19);
    } else {
        testsNotPassed.push(19);
        console.log(`Test 19 failed; returned - ${Test19Return}`)
    }

    if (Test20Return) {
        // check if correct HabitLog object is returned
        testsPassed.push(20);
    } else {
        testsNotPassed.push(20);
        console.log(`Test 20 failed; returned - ${Test20Return}`)
    }

    if (Test21Return === 3) {
        testsPassed.push(21);
    } else {
        testsNotPassed.push(21);
        console.log(`Test 21 failed; returned - ${Test21Return}`)
    }

    if (Test22Return === 0) {
        testsPassed.push(22);
    } else {
        testsNotPassed.push(22);
        console.log(`Test 22 failed; returned - ${Test22Return}`)
    }

    if (Test23Return) {
        //Check if correct history onject is returned
        testsPassed.push(23);
    } else {
        testsNotPassed.push(23);
        console.log(`Test 23 failed; returned - ${Test23Return}`)
    }

    if (Test24Return) {
        //check if history object is empty
        testsPassed.push(24);
    } else {
        testsNotPassed.push(24);
        console.log(`Test 24 failed; returned - ${Test24Return}`)
    }

    if (Test25Return === 80.00) {
        testsPassed.push(25);
    } else {
        testsNotPassed.push(25);
        console.log(`Test 25 failed; returned - ${Test25Return}`)
    }
    if (Test26Return) {
        testsPassed.push(26);
    } else {
        testsNotPassed.push(26);
        console.log(`Test 26 failed; returned - ${Test26Return}`)
    }
    if (Test27Return) {
        testsPassed.push(27);
    } else {
        testsNotPassed.push(27);
        console.log(`Test 27 failed; returned - ${Test27Return}`)
    }

    if (Test28Return) {
        testsPassed.push(28);
    } else {
        testsNotPassed.push(28);
        console.log(`Test 28 failed; returned - ${Test28Return}`)
    }

    if (!Test29Return) {
        testsPassed.push(29);
    } else {
        testsNotPassed.push(29);
        console.log(`Test 29 failed; returned - ${Test29Return}`)
    }

    if (Test30Return) {
        testsPassed.push(30);
    } else {
        testsNotPassed.push(30);
        console.log(`Test 30 failed; returned - ${Test30Return}`)
    }

    if (!Test31Return) {
        testsPassed.push(31);
    } else {
        testsNotPassed.push(31);
        console.log(`Test 31 failed; returned - ${Test31Return}`)
    }

    if (Test32Return) {
        testsPassed.push(32);
    } else {
        testsNotPassed.push(32);
        console.log(`Test 32 failed; returned - ${Test32Return}`)
    }

    if (!Test33Return) {
        testsPassed.push(33);
    } else {
        testsNotPassed.push(33);
        console.log(`Test 33 failed; returned - ${Test33Return}`)
    }

    //---------------------------------------------------
    //---------------------------------------------------
}
async function fillDb() {
    try {
        await prisma.user.upsert({
            where: { id: 1 },
            update: {},
            create: { id: 1, email: "test@example.com", password: "password", name: "Test User" }
        });
        const userId = 1;
        //create 4 habits
        //constructor(habitId,userId,name,description,targetValue,TargetUnit,Frequency,HabitStatus="",Activated,DateCreated)
        const habit1 = new Habit(null, userId, "Morning Run", "Run 5km", 5, "km", "DAILY", "", true, new Date());
        const savedHabit1 = await habit1.save();

        const habit2 = new Habit(null, userId, "Read book ", "Read 20 pages", 20, "pages", "DAILY", "", true, new Date());
        const savedHabit2 = await habit2.save();
        test21habitId = savedHabit2.habitId;

        const habit3 = new Habit(null, userId, "Meditation", "10 mins mindfulness", 10, "minutes", "DAILY", "", true, new Date());
        const savedHabit3 = await habit3.save();

        const habit4 = new Habit(null, userId, "Drink Water", "Drink 2L", 2, "L", "DAILY", "", true, new Date());
        const savedHabit4 = await habit4.save();

        // Back-filling a week and a bit of history for the morning run
        // habit: 8 days completed in a row, then 2 missed days after that,
        // so the streak/completion-rate tests further down have something
        // real to chew on.
        const startDate = new Date('2026-08-01T00:00:00Z');
        for (let i = 0; i < 8; i++) {
            const logDate = new Date(startDate);
            logDate.setDate(logDate.getDate() + i);
            await habit1.logCompletion(logDate, 5, `completed day${i + 1}`);
        }
        for (let i = 8; i < 10; i++) {
            const missedDate = new Date(startDate);
            missedDate.setDate(missedDate.getDate() + i);
            await habit1.logMissed(missedDate, 0, `Missed day${i + 1}`);
        }
        // And 3 completed days in a row for the reading habit, ending
        // today, so Test21 has a real 3-day streak to find.
        const h2StartDate = new Date();
        h2StartDate.setHours(0, 0, 0, 0);
        h2StartDate.setDate(h2StartDate.getDate() - 2);
        for (let i = 0; i < 3; i++) {
            const logDate = new Date(h2StartDate);
            logDate.setDate(logDate.getDate() + i);
            await habit2.logCompletion(logDate, 20, `Completed reading day ${i + 1}`);
        }
    } catch (error) {
        console.error("Error seeding DB", error);
    }
}
//No.
// Habit Create:
// Tested Class
// Inputs
//Expected Output

async function Test16() {
    // 16
    // Habit Creaet()
    // name =Reading, TargetValue=30, targetUnit = minutes, Freq=Daily
    //True
    try {
        const habit = new Habit(5, 1, "Entertainment", "watch TV", 6, "Hours", "WEEKLY", "", true, new Date());
        const savedHabit = await habit.save();
        return !!savedHabit;
    } catch (error) {
        return false;
    }
}

async function Test17() {
    // 17
    // Habit Update()
    // name = Reading, TargVal=20 , TargUnit=pages,greq=daily
    //true
    try {
        const habit = new Habit(null, 1, "Study", "Do past papers and prac questions", 10, "hours", "WEEKLY", "", true, new Date());
        const savedHabit = await habit.save();

        await habit.updateName("Drink lots of water");
        await habit.updateTargetValue(3);
        await habit.updateTargetUnit("L");
        await habit.updateFreq("DAILY");
        return true;
    } catch (error) {
        return false;
    }
}

async function Test18() {
    // 18
    // Habit.archive()
    // Status= Active
    // true
    try {
        const habit = new Habit(null, 1, "Revise ", "Revision", 2, "hours", "DAILY", "", true, new Date());
        const savedHabit = await habit.save();

        return await habit.archiveHabit(savedHabit.habitId);
    } catch (error) {
        return false
    }
}

async function Test19() {
    // 19
    // Habit.archive() on a habit that's ALREADY archived
    // status = Archived
    // expected: false (nothing to archive, so nothing happens)
    //
    // This one used to cheat a little: it built a Habit with
    // Activated=false, then just read `habit.Active` straight off and
    // returned false itself, never actually calling archiveHabit() at
    // all. That was really working around a gap in archiveHabit() itself
    // (it didn't check whether a habit was already archived before this
    // fix). Now that the guard lives in Habit.js, this test can just call
    // the real method and trust what it reports.
    try {
        const habit = new Habit(null, 1, "Meditation", "10 mins mindfulness", 10, "minutes", "DAILY", "", false, new Date());
        const saved = await habit.save();
        return await habit.archiveHabit(saved.habitId);
    } catch (error) {
        return false;
    }
}

async function Test20() {
    // 20
    // Habit.logCompletion()
    //  value=30 , note = Completed
    // HabitLog obj
    try {
        const habit = new Habit(null, 1, "Excercise", "Daily workout", 30, "minutes", "DAILY", "", true, new Date());
        await habit.save();
        const log = await habit.logCompletion(new Date(), 30, "COMPLETED");
        return (typeof log === 'object' && log !== null);
    } catch (error) {
        return false;
    }
}

async function Test21() {
    // 21
    // Habit.calculateStreak()
    //  3 consecutive completed logs
    // 3
    try {
        const habit = new Habit(test21habitId, 1, "Read book ", "Read 20 pages", 20, "pages", "DAILY", "", true, new Date());
        const streak = await habit.calculateStreak();
        return streak;
    } catch (error) {
        return 0;
    }
}

async function Test22() {
    // 22
    // Habit.calculateStreak()
    // No consecutive completed logs
    // 0
    try {
        const habit = new Habit(4, 1, "Drink lots of water", "Drink 3L of water", 3, "L", "DAILY", "", true, new Date());
        const streak = await habit.calculateStreak();
        return streak;
    } catch (error) {
        return -1;
    }
}

async function Test23(fromDate, toDate) {
    // 23
    // Habit.getHistory()
    //  from=2026-08-01,to=2026-08-07; logs exist
    // MatchingList<HabitLog>
    try {
        const habit = new Habit(null, 1, "Morning Run", "Run 5km", 5, "km", "DAILY", "", true, new Date());
        await habit.save();
        await habit.logCompletion(new Date("2026-08-05"), 5, "")
        const history = await habit.getHistory(fromDate, toDate);
        return Array.isArray(history) && history.length > 0;
    } catch (error) {
        return false;
    }
}

async function Test24(fromDate, toDate) {
    // 24
    // Habit.getHistory()
    //  from=2026-08-01,to=2026-08-07;no logs
    // EmptyList<HabitLog>
    try {
        const habit = new Habit(null, 1, "Drink lots of water", "Drink 3L of water", 3, "L", "DAILY", "", true, new Date());
        await habit.save();
        const history = await habit.getHistory(fromDate, toDate);
        return Array.isArray(history) && history.length === 0;
    } catch (error) {
        return false;
    }
}

async function Test25(fromDate, toDate) {
    // 25
    // Habit.getCompletionRate()
    // 8 completed, 2 missed logs
    //  Correct double rate
    try {
        const habit = new Habit(1, 1, "Morning Run", "Run 5km", 5, "km", "DAILY", "", true, new Date());
        const rate = await habit.getCompletionRate(fromDate, toDate);
        return rate;
    } catch (error) {
        return 0;
    }
}

async function Test26() {
    // 26
    // HabitLog.save()
    // value=30.0,status=COMPLETED,note="Completed"
    // true
    try {
        const log = new HabitLog(null, 1, 1, new Date(), 30, "COMPLETED", "completed", new Date());
        const saved = await log.save();
        return !!saved;
    } catch (error) {
        return false;
    }
}

async function Test27() {
    // 27
    // HabitLog.update()
    //  value=25.0,status=MISSED,note="Not completed"
    // true
    try {
        const log = new HabitLog(1, 1, 1, new Date(), 25, "MISSED", "Not completed", new Date());
        const savedLog = await log.save();
        await log.updateValue(25);
        await log.updateStatus("MISSED");
        await log.updateNote("Not Completed");
        return true;
    } catch (error) {
        return false;
    }
}

function Test28() {
    // 28
    // HabitLog.isCompleted()
    // status=COMPLETED
    // true
    const log = new HabitLog(null, 1, 1, new Date(), 0, "COMPLETED", "", new Date());
    return log.isCompleted();
}

function Test29() {
    // 29
    // HabitLog.isCompleted()
    // status=MISSED
    // false
    const log = new HabitLog(null, 1, 1, new Date(), 0, "MISSED", "", new Date());
    return log.isCompleted();
}

function Test30() {
    // 30
    // HabitLog.isRestDay()
    // status=RESTDAY
    //  true
    const log = new HabitLog(null, 1, 1, new Date(), 0, "REST_DAY", "", new Date());
    return log.isRestDay();
}

function Test31() {
    // 31
    // HabitLog.isRestDay()
    // status=COMPLETED
    // false
    const log = new HabitLog(null, 1, 1, new Date(), 0, "COMPLETED", "", new Date());
    return log.isRestDay();
}

function Test32() {
    // 32
    // HabitLog.isSnoozed()
    // status=SNOOZED
    // true
    const log = new HabitLog(null, 1, 1, new Date(), 0, "SNOOZED", "", new Date());
    return log.isSnoozed();
}

function Test33() {
    // 33
    // HabitLog.isSnoozed()
    // status=COMPLETED
    // false
    const log = new HabitLog(null, 1, 1, new Date(), 0, "COMPLETED", "", new Date());
    return log.isSnoozed();
}

Testing().then(() => {
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Tests Failed: ${testsNotPassed}`);
    process.exit(0);
})
    .catch((err) => {
        console.error("Testing failed with error:", err);
        process.exit(1);
    })
