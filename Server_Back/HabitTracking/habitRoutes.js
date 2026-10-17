// import 
const { recordHabitCompletion } = require("../Notifications/habitEvents");
//--------------------------------File Import block------------------------
//-------------------------------------------------------------------------
const Habit = require('./Habit');
// const myHabit = new Habit(1, 101, "Exercise", "Daily workout", 30, "minutes", "DAILY", "ACTIVE");
// myHabit.create();
const Habit_Log = require('./Habit_Log');

//-------------------------------------------------------------------------
//-------------------------------------------------------------------------
const express = require('express');
const router = express.Router();
const prisma  = require('../prisma/client'); // pulls from client.js

//-------------------------------------------------------------------------
//-------------------------------------------------------------------------

// This file is the glue layer: plain functions that wrap the Habit /
// HabitLog classes with try/catch + logging, plus the actual Express
// routes and the nightly cron job that clean things up at midnight.

// recieves all the info required to make a new habit
// creates the habit and then saves it to the DB
async function CreateAndSaveHabit(userId, title, description, targetVal, targetUnit, freq, status, Activate = true, DateCreated = new Date()) {
    try {
        const newHabit = new Habit(
            null,
            userId,
            title,
            description,
            targetVal,
            targetUnit,
            freq,
            // If whoever's calling this didn't bother sending a status
            // (the POST /api/habits route, for example, happily lets it be
            // undefined), fall back to ACTIVE rather than let an empty
            // string end up representing "no status".
            status || "ACTIVE",
            Activate,
            DateCreated //date created
        );
        const savedRecord = await newHabit.save();
        console.log("Habit successfully saved to DB", savedRecord);
        // Handing this back up so the route below can tell the client
        // what got created (its new ID, mainly).
        return savedRecord;
    } catch (error) {
        console.error("Error saving Habit", error);
        // This needs to keep going up the chain. It used to just get
        // logged and swallowed right here, which meant the route handling
        // POST /api/habits never found out anything had gone wrong - its
        // own try/catch had nothing to catch, so it always responded with
        // "201 Created" even on a failed save. Rethrowing fixes that.
        throw error;
    }
}

//returns the requested habit
async function getHabitInstance(habitId) {
    const dbHabit = await prisma.habit.findUnique({
        where: { habitId: parseInt(habitId) }
    });
    if (!dbHabit) {
        const error = new Error(`Habit ${habitId} not found`);
        // Tagging this as a 404 so the routes below can respond
        // accordingly, instead of every "habit doesn't exist" case coming
        // back as a generic 500 like it used to.
        error.statusCode = 404;
        throw error;
    }
    return new Habit(
        dbHabit.habitId,
        dbHabit.userId,
        dbHabit.title,
        dbHabit.description,
        dbHabit.targetValue,
        dbHabit.targetUnit,
        dbHabit.frequency,
        dbHabit.StatusOfHabit,
        dbHabit.Activated,
        dbHabit.createdAt,
        dbHabit.currValue
    );
}
// completes the selected habit
async function completedHabit(habitId, date, value, note = "") {
    try {
        const habit = await getHabitInstance(habitId);
        const enteredValue = Number(value);
        const requiredTarget = habit.effectiveTargetValue;
        // Comparing against requiredTarget (not the raw targetValue) so
        // the rest-day rounding in effectiveTargetValue actually matters.
        // Previously this variable got calculated and then just... never
        // used - the check below compared against habit.targetValue
        // directly instead, so rest days never behaved any differently.
        if (!Number.isFinite(enteredValue) || enteredValue < requiredTarget) {
            const error = new Error(
                `Enter at least ${requiredTarget} ${habit.targetUnit} to complete this habit.`
            );
            error.statusCode = 400;
            throw error;
        }
        const savedLog = await habit.logCompletion(date, enteredValue, note);
        console.log(`Habit ${habitId} logged successfuly`);
        return savedLog;
    } catch (error) {
        console.error("Error logging completion:", error);
        throw error;
    }
}
// archives the selected habit
async function archiveHabit(habitId) {
    try {
        const habit = await getHabitInstance(habitId);
        // Passing this straight through now instead of hard-coding
        // `return true`, so the caller can tell whether this actually
        // archived something or the habit was already archived.
        return await habit.archiveHabit(habitId);
    } catch (error) {
        console.error("Error archiving habit:", error);
        throw error;
    }
}
// activates the selected habit
async function ActivateHabit(habitId) {
    try {
        const habit = await getHabitInstance(habitId);
        return await habit.activateHabit(habitId);
    } catch (error) {
        console.error("Error activating habit:", error);
        throw error;
    }
}
// calcs the completion rate
async function calcCompletionRate(habitId, fromDate, toDate) {
    try {
        const habit = await getHabitInstance(habitId);
        const completionRate = await habit.getCompletionRate(fromDate, toDate);
        return completionRate;
    } catch (error) {
        console.error(`Error fetching completion rate for habit ${habitId}`, error);
        throw error;
    }
}

//calcs the habit streak
async function calcHabitStreak(habitId, fromDate, toDate) {
    try {
        const habit = await getHabitInstance(habitId);
        const streak = await habit.calculateStreak(fromDate, toDate);
        return streak;
    } catch (error) {
        console.error(`Error fetching streak for habit ${habitId}`, error);
        throw error;
    }
}
// updates a habit(habitId) details with the given updates obj
async function updateHabitDetails(habitId, updates) {
    try {
        const habit = await getHabitInstance(habitId);
        if (updates.title !== undefined) await habit.updateName(updates.title);
        if (updates.description !== undefined) await habit.updateDescription(updates.description);
        if (updates.targetValue !== undefined) await habit.updateTargetValue(updates.targetValue);
        if (updates.targetUnit !== undefined) await habit.updateTargetUnit(updates.targetUnit);
        if (updates.frequency !== undefined) await habit.updateFreq(updates.frequency);
        if (updates.status !== undefined) await habit.updateStatus(updates.status);
        return true;
    } catch (error) {
        console.error("Error updating habit:", error);
        throw error;
    }
}

/*============================================================
==================Individual Demo Funcs ======================
============================================================*/

// log a rest day for a habit
async function restDayHabit(habitId, date, note = "") {
    try {
        const habit = await getHabitInstance(habitId);
        const savedLog = await habit.logRestDay(date, note);
        console.log(`Habit ${habitId} logged rest day successfully`);
        return savedLog;
    } catch (error) {
        console.error("Error logging rest day:", error);
        throw error;
    }
}


//log a snooze day for a habit

async function snoozeHabit(habitId, date, note = "") {
    try {
        const habit = await getHabitInstance(habitId);
        const savedLog = await habit.logSnoozed(date, note);
        console.log(`Habit ${habitId} logged snooze day successfully`);
        return savedLog;
    } catch (error) {
        console.error("Error logging snooze day:", error);
        throw error;
    }
}

// Helper to check if a habit was already logged (completed/rested/snoozed) on a specific date
async function isAlreadyLoggedToday(habitOrId, dateInput) {
    // Extract numeric ID whether passed a habit object or a raw ID
    const habitId = typeof habitOrId === 'object' && habitOrId !== null
        ? habitOrId.habitId
        : habitOrId;

    const parsedId = parseInt(habitId, 10);

    // Safety check: if the ID is invalid, do not query Prisma
    if (isNaN(parsedId)) return false;

    const targetDate = new Date(dateInput || new Date());
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Filtering by date range right in the query now, rather than pulling
    // back every single log this habit has ever had and then filtering
    // down to "today" in JS. Same result, but it won't get slower and
    // slower as a habit's history grows - this function gets called on
    // basically every log/rest/snooze request, so it's worth keeping
    // cheap.
    const logs = await prisma.habitLog.findMany({
        where: {
            habitId: parsedId,
            completedAt: { gte: startOfDay, lte: endOfDay },
        },
    });

    return logs.length > 0;
}


/*================================================================
================================================================*/


//===================================================
//======================Express Funcs================
//===================================================



const cron = require('node-cron');
// Create a new habit
router.post('/api/habits', async (req, res) => {
    const { userId, title, description, targetVal, targetUnit, freq, status } = req.body;
    try {
        // Grabbing the saved record now that CreateAndSaveHabit() actually
        // returns something and rethrows on failure - this route used to
        // never find out either way.
        const savedRecord = await CreateAndSaveHabit(userId, title, description, targetVal, targetUnit, freq, status);
        res.status(201).json({ message: 'Habit created successfully', habit: savedRecord });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create habit' });
    }
});

// Log Rest Day
router.post('/api/habits/:id/rest', async (req, res) => {
    const habitId = parseInt(req.params.id, 10);

    // 2. Validate that habitId is a valid number
    if (isNaN(habitId)) {
        return res.status(400).json({ error: 'Invalid habit ID format' });
    }
    const { date, note } = req.body;
    const targetDate = new Date(date || new Date());
    try {
        //check for existing habit log today
        if (await isAlreadyLoggedToday(habitId, targetDate)) {
            return res.status(400).json({ error: 'This habit has already been logged today.' });
        }
        // Using the already-normalized targetDate here instead of the raw
        // `date` from the request body, so this actually logs on the same
        // date we just checked above (the snooze route right below already
        // did it this way - this just brings rest days in line with it).
        const savedLog = await restDayHabit(habitId, targetDate, note);
        res.status(200).json(savedLog);
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to log rest day' });
    }
});

// Log Snooze Day
router.post('/api/habits/:id/snooze', async (req, res) => {
    const habitId = parseInt(req.params.id, 10);

    // 2. Validate that habitId is a valid number
    if (isNaN(habitId)) {
        return res.status(400).json({ error: 'Invalid habit ID format' });
    }
    const { date, note } = req.body;
    const targetDate = new Date(date || new Date());
    try {
        // Check for existing log today
        if (await isAlreadyLoggedToday(habitId, targetDate)) {
            return res.status(400).json({ error: 'This habit has already been logged today.' });
        }
        const savedLog = await snoozeHabit(habitId, targetDate, note);
        res.status(200).json(savedLog);
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to log snooze day' });
    }
});

// Log progress for a specific habit
router.post('/api/habits/:id/log', async (req, res) => {
    const habitId = parseInt(req.params.id, 10);

    // 2. Validate that habitId is a valid number
    if (isNaN(habitId)) {
        return res.status(400).json({ error: 'Invalid habit ID format' });
    }
    const { date, value, note } = req.body;
    const targetDate = new Date(date || new Date());
    try {
        if (await isAlreadyLoggedToday(habitId, targetDate)) {
            return res.status(400).json({ error: 'This habit has already been logged today.' });
        }
        const savedLog = await completedHabit(habitId, date, value, note);
        await recordHabitCompletion(habitId);
        res.status(200).json(savedLog);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            error: error.message || 'Failed to log habit progress'
        });
    }
});


// Edit habit details
router.patch('/api/habits/:id', async (req, res) => {
    const habitId = parseInt(req.params.id, 10);

    // 2. Validate that habitId is a valid number
    if (isNaN(habitId)) {
        return res.status(400).json({ error: 'Invalid habit ID format' });
    }
    const updates = req.body;
    try {
        await updateHabitDetails(habitId, updates);
        res.status(200).json({ message: 'Habit updated successfully' });
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update habit' });
    }
});

// Archive a habit
router.patch('/api/habits/:id/archive', async (req, res) => {
    const habitId = parseInt(req.params.id, 10);

    // 2. Validate that habitId is a valid number
    if (isNaN(habitId)) {
        return res.status(400).json({ error: 'Invalid habit ID format' });
    }
    try {
        const didArchive = await archiveHabit(habitId);
        // Now that archiveHabit() can honestly tell us "nothing changed,
        // this was already archived", the response can say that instead of
        // pretending something happened every time.
        res.status(200).json({
            message: didArchive ? 'Habit archived successfully' : 'Habit was already archived',
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to archive habit' });
    }
});

// Restore an archived habit to the active list.
router.patch('/api/habits/:id/unarchive', async (req, res) => {
    const habitId = parseInt(req.params.id, 10);

    // 2. Validate that habitId is a valid number
    if (isNaN(habitId)) {
        return res.status(400).json({ error: 'Invalid habit ID format' });
    }
    try {
        const didActivate = await ActivateHabit(habitId);
        res.status(200).json({
            message: didActivate ? 'Habit restored successfully' : 'Habit was already active',
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to restore habit' });
    }
});

// Return active or archived habits for one user.
router.get('/api/users/:userId/habits', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const archived = req.query.archived === 'true';
    try {
        const habits = await prisma.habit.findMany({
            where: { userId: userId, Activated: !archived },
            include: { logs: true },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.status(200).json(habits);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch habits' });
    }
});

// Return all users for the temporary user selector.
router.get('/api/users', async (req, res) => {
    const users = await prisma.user.findMany({
        select: {
            userId: true,
            name: true,
            email: true }
    });
    res.json(users);
});

//log an increment for a specific habit
router.post('/api/habits/:id/increment', async (req, res) => {
    const habitId = parseInt(req.params.id, 10);

    // 2. Validate that habitId is a valid number
    if (isNaN(habitId)) {
        return res.status(400).json({ error: 'Invalid habit ID format' });
    }
    const { incrementBy } = req.body;
    try {
        const habit = await getHabitInstance(habitId);
        const newCurrValue = await habit.logIncrement(Number(incrementBy));
        res.status(200).json({
            currValue: newCurrValue,
            // This used to come back as `undefined` every single time,
            // because Habit didn't actually have an effectiveTargetValue
            // getter (see the notes in Habit.js) - so any client trying to
            // show "3 of 5 done" for an incrementable habit had nothing to
            // show for the "of 5" part.
            targetValue: habit.effectiveTargetValue
        });
    } catch (error) {
        console.error("Error logging increment:", error);
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to log increment' });
    }
});

//Midnight check: log missed habits and reset curr values
cron.schedule('0 0 * * *', async () => {
    console.log('Running midnight check for uncompleted habits...');
    try {
        const activeHabits = await prisma.habit.findMany({ where: { Activated: true } });

        for (const dbHabit of activeHabits) {
            const isLogged = await isAlreadyLoggedToday(dbHabit.habitId, new Date());

            // Only auto-marking DAILY habits as missed here. The old
            // version marked *any* active habit missed if it hadn't been
            // logged today, regardless of frequency - which meant a
            // WEEKLY habit would get flagged "missed" every single day it
            // wasn't touched, even on days it was never due in the first
            // place. This is a stopgap, not a full fix: it just leaves
            // non-daily habits alone rather than mis-marking them. Doing
            // this properly means knowing which specific days a weekly or
            // monthly habit is actually due on, which is a bigger feature
            // than what's here right now.
            if (!isLogged && dbHabit.frequency === "DAILY") {
                const habit = await getHabitInstance(dbHabit.habitId);
                await habit.logMissed(); // Log as missed
            } else if (!isLogged) {
                // TODO: real due-date logic for WEEKLY/other frequencies
                // instead of just skipping them.
            } else {
                // The habit was logged today (completed, rest day, or
                // snoozed), which leaves a "just for today" status sitting
                // on the Habit record. Clearing it back to ACTIVE here so
                // tomorrow starts with a clean slate instead of still
                // showing yesterday's "COMPLETED" badge before anything's
                // happened yet.
                await prisma.habit.update({
                    where: { habitId: dbHabit.habitId },
                    data: { StatusOfHabit: "ACTIVE" }
                });
            }

            // Reset the current increment value for the new day
            await prisma.habit.update({
                where: { habitId: dbHabit.habitId },
                data: { currValue: 0 }
            });
        }
    } catch (error) {
        console.error("Error running midnight cron job:", error);
    }
});

module.exports = router;
