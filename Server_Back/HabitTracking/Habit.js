//--------------------------------File Import block------------------------
//-------------------------------------------------------------------------

const prisma  = require('../prisma/client.js');
const HabitLog = require('./Habit_Log');

//-------------------------------------------------------------------------

// This class owns everything about a single habit: creating it, editing
// it, archiving/activating it, and logging what happened on a given day
// (completed, missed, rest day, snoozed). Streaks and completion rates
// live here too since they're really just "read the logs and do some math"
// on top of a habit.
class Habit {
    #habitId;
    #userId;
    #name;
    #description;
    #targetValue;
    #targetUnit;
    #frequency;
    #status;
    #Activated;
    #createdAt;
    #archivedAt;
    #currValue;

    // Habit Class Constructor
    constructor(habitId, userId, name, description, targetValue, TargetUnit, Frequency, HabitStatus = "", Activated, DateCreated, currValue = 0) {
        this.#habitId = habitId;
        this.#userId = userId;
        this.#name = name;
        this.#description = description;
        this.#targetValue = targetValue;
        this.#targetUnit = TargetUnit;
        this.#frequency = Frequency;
        this.#status = HabitStatus;
        this.#createdAt = DateCreated;
        this.#Activated = Activated;
        this.#archivedAt = null;
        this.#currValue = Number(currValue) || 0;
    }

    /** Persists this habit and returns the created database record. */
    async save() {
        // Quick sanity check before we write anything: if nothing passed a
        // status in, don't let an empty string sneak into the database.
        // A blank status doesn't mean anything to the rest of the app, so
        // it's easier to just default it to ACTIVE here than to have every
        // caller remember to do it themselves.
        if (!this.#status) {
            this.#status = "ACTIVE";
        }

        const createdRecord = await prisma.habit.create({
            data: {
                userId: parseInt(this.#userId),
                title: this.#name,
                description: this.#description,
                // Using parseInt here on purpose, not parseFloat - the DB
                // column is an Int, and handing Prisma a decimal for an Int
                // field is asking for trouble. If fractional targets ever
                // become a real requirement (5.5 km, say), the column
                // itself needs to change to Float first, and then this can
                // go back to parseFloat.
                targetValue: parseInt(this.#targetValue, 10),
                targetUnit: this.#targetUnit,
                frequency: this.#frequency,
                StatusOfHabit: this.#status,
                createdAt: this.#createdAt,
                Activated: this.#Activated,
                archivedAt: this.#archivedAt,
                currValue: this.#currValue,
            }
        });
        // habitId comes from the DB (auto-increment), so we don't know it
        // until after the insert - grab it off the created record.
        this.#habitId = createdRecord.habitId;
        return createdRecord;
    }

    // recieve name
    // update Habit name to name
    async updateName(name) {
        this.#name = name;
        return await prisma.habit.update({
            where: { habitId: this.#habitId },
            data: { title: this.#name },
        });
    }

    // recieve description
    // update Habit description to description
    async updateDescription(description) {
        this.#description = description;
        return await prisma.habit.update({
            where: { habitId: this.#habitId },
            data: { description: this.#description },
        });
    }

    // recieve targetValue
    // update Habit TargetValue to targetValue
    async updateTargetValue(targetValue) {
        this.#targetValue = targetValue;
        // Same reasoning as in save() - keep this an integer so it matches
        // what the targetValue column actually expects.
        return await prisma.habit.update({
            where: { habitId: this.#habitId },
            data: { targetValue: parseInt(this.#targetValue, 10) },
        });
    }

    // recieve targetUnit
    // update Habit TargetUnit to targetUnit
    async updateTargetUnit(targetUnit) {
        this.#targetUnit = targetUnit;
        return await prisma.habit.update({
            where: { habitId: this.#habitId },
            data: { targetUnit: this.#targetUnit },
        });
    }

    // recieve frequency
    // update Habit Freq to frequency
    async updateFreq(frequency) {
        this.#frequency = frequency;
        return await prisma.habit.update({
            where: { habitId: this.#habitId },
            data: { frequency: this.#frequency },
        });
    }

    // recieve HabitStatus
    // update Habit Status to HabitStatus
    async updateStatus(HabitStatus) {
        this.#status = HabitStatus;
        // Needs a `return` here so whoever calls this actually gets the
        // updated record back, same as every other update method below.
        return await prisma.habit.update({
            where: { habitId: this.#habitId },
            data: { StatusOfHabit: this.#status },
        });
    }

    // Recieve habitId
    // Archives the Habit of habitId
    async archiveHabit(habitId) {
        // If it's already archived, there's nothing to do - bail out and
        // say so, rather than quietly re-archiving something that's
        // already in that state. This also gives callers an honest way to
        // tell "I just archived this" apart from "this was already
        // archived".
        if (this.#Activated === false) {
            return false;
        }
        this.#Activated = false;
        this.#archivedAt = new Date();
        await prisma.habit.update({
            where: { habitId: this.#habitId },
            data: {
                Activated: false,
                archivedAt: this.#archivedAt,
            },
        });
        return true;
    }

    // Recieve habitId
    // activates the archived Habit of habitId
    async activateHabit(habitId) {
        // Mirror of the guard in archiveHabit() above - no point flipping
        // something to "active" that's already active.
        if (this.#Activated === true) {
            return false;
        }
        this.#Activated = true;
        this.#archivedAt = null;
        await prisma.habit.update({
            where: { habitId: this.#habitId },
            data: {
                Activated: true,
                archivedAt: null,
            },
        });
        return true;
    }

    async logIncrement(incrementBy) {
        const addedValue = Number(incrementBy) || 0;
        this.#currValue = (Number(this.#currValue) || 0) + addedValue;
        try {
            await prisma.habit.update({
                where: { habitId: this.#habitId },
                data: { currValue: this.#currValue },
            });
            return this.#currValue;
        } catch (error) {
            console.error("Error Updating Habit Value:", error);
            throw error;
        }
    }

    // recieves date(defualt today)+value+ note if given
    // creates new HabitLog of completed Habit
    async logCompletion(date = new Date(), value, note = "") {
        // Keep the in-memory status and the DB status in sync - both say
        // "COMPLETED" now. Logging completion is really "the habit is done
        // for today", so that's what gets stored.
        this.#status = "COMPLETED";
        this.#currValue = 0;
        await prisma.habit.update({
            where: { habitId: this.#habitId },
            data: {
                currValue: 0,
                StatusOfHabit: "COMPLETED",
            }
        });
        const newLog = new HabitLog(
            null,
            this.#habitId,
            this.#userId,
            date,
            value,
            "COMPLETED",
            note
        );
        return await newLog.save();
    }

    // recieves date(defualt today)+value+ note if given
    // creates new HabitLog of Missed Habit
    async logMissed(date = new Date(), value = 0, note = "") {
        // `value` defaults to 0 now. The nightly cron job calls this with
        // no arguments at all, and without a default here that turns into
        // `undefined`, which becomes NaN once it hits parseFloat() over in
        // HabitLog - and NaN really shouldn't be showing up in the
        // database.
        this.#status = "MISSED";
        // The other log* methods (completion, rest day, snooze) all write
        // their status back to the Habit record, so this one should too -
        // otherwise the habit's stored status just goes stale after a miss.
        await prisma.habit.update({
            where: { habitId: this.#habitId },
            data: { StatusOfHabit: "MISSED" }
        });
        const newLog = new HabitLog(
            null,
            this.#habitId,
            this.#userId,
            date,
            value,
            "MISSED",
            note
        );
        return await newLog.save();
    }

    //recieves nothing (or fromDate/toDate)
    // pulls habitlogs from the DB
    // reads the status's of those habitlogs
    // checks if status is Completed/Snoozed/Rest_Day/Missed
    // by iterating through the records(obeects {})of habitLog
    // checks to make sure that users arent logging multiple habits a day
    //returns calculated streak
    async calculateStreak(fromDate, toDate) {
        // Callers (calcHabitStreak, further down the codebase) have always
        // passed fromDate/toDate in here, but this method used to ignore
        // them completely and just pull every log ever created. Now the
        // range actually gets applied to the query when it's given, and if
        // a toDate was supplied we anchor the streak calculation on that
        // date instead of always assuming "today".
        const where = { habitId: this.#habitId };
        if (fromDate || toDate) {
            where.completedAt = {};
            if (fromDate) where.completedAt.gte = new Date(fromDate);
            if (toDate) where.completedAt.lte = new Date(toDate);
        }

        const rawLogs = await prisma.habitLog.findMany({
            where,
            orderBy: { completedAt: 'desc' },
        });

        if (rawLogs.length === 0) return 0;
        let streak = 0;
        let lastCountedDate = null;
        // set date for midnight for accurate day-to-day calcs
        let refDate = toDate ? new Date(toDate) : new Date();
        refDate.setHours(0, 0, 0, 0); // set refDate as midnight for calc

        for (const record of rawLogs) {
            const logInstance = new HabitLog(
                record.logId,
                record.habitId,
                record.userId,
                record.completedAt,
                record.value,
                record.status,
                record.note,
                record.createdAt
            );
            if (logInstance.isMissed()) {
                break; // break streak
            }
            if (logInstance.isRestDay() || logInstance.isSnoozed()) {
                const logDate = new Date(record.completedAt);
                logDate.setHours(0, 0, 0, 0); // set logDate as midnight for calc
                refDate = logDate; // move refDate back but dont count it
                continue;
            }
            if (logInstance.isCompleted()) {
                const logDate = new Date(record.completedAt);
                logDate.setHours(0, 0, 0, 0);
                const diffTime = Math.abs(refDate - logDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 0 || diffDays === 1) {
                    // 0 - logDay = on the day of being requested
                    // 1 - logDay = on the previous day of being requested
                    if (lastCountedDate !== logDate.getTime()) {
                        streak++;
                        lastCountedDate = logDate.getTime();
                    }
                    refDate = logDate;
                } else {
                    break;
                }
            }
        }
        return streak; //int
    }

    //recieves two dates from + to
    // finds the habitLog history between the dates
    //returns a variable containing the history
    async getHistory(from, to) {
        //fetch habitlog between dates()
        const HistoryLogs = await prisma.habitLog.findMany({
            where: {
                habitId: this.#habitId,
                completedAt: {
                    gte: new Date(from), // greater than or equal to 'from'
                    lte: new Date(to),   // less than or equal to 'to'
                },
            },
            orderBy: { completedAt: 'asc' },
        });
        return HistoryLogs;
    }

    /** Calculates the percentage of completed logs in a date range. */
    async getCompletionRate(from, to) {
        const history = await this.getHistory(from, to);
        if (history.length === 0) return 0.0;
        const completedCount = history.filter(log => log.status === "COMPLETED").length;
        const msPerDay = 1000 * 60 * 60 * 24;
        const fromDate = new Date(from);
        const toDate = new Date(to);
        const totalDays = Math.max(1, Math.ceil((toDate - fromDate) / msPerDay));
        return parseFloat(((completedCount / totalDays) * 100).toFixed(2));
    }

    async logRestDay(date = new Date(), note = "") {
        this.#status = "REST_DAY";
        await prisma.habit.update({
            where: { habitId: this.#habitId },
            data: { StatusOfHabit: "REST_DAY" }
        });
        const newLog = new HabitLog(
            null,
            this.#habitId,
            this.#userId,
            date,
            0,
            "REST_DAY",
            note
        );
        return await newLog.save();
    }

    async logSnoozed(date = new Date(), note = "") {
        this.#status = "SNOOZED";
        // This one was missing the same DB write logRestDay() does just
        // above it, so a snoozed habit's stored status never actually
        // changed to SNOOZED. Bringing it in line with the others.
        await prisma.habit.update({
            where: { habitId: this.#habitId },
            data: { StatusOfHabit: "SNOOZED" }
        });
        const newLog = new HabitLog(
            null,
            this.#habitId,
            this.#userId,
            date,
            0,
            "SNOOZED",
            note
        );
        return await newLog.save();
    }

    // This getter used to live over in Habit_Log.js and referenced a
    // variable called `habit` that didn't exist anywhere in that file -
    // it would've blown up the moment anything actually tried to use it.
    // It belongs here instead, since it's really just "this habit's
    // target, adjusted for today's status" - a single log entry has no
    // business knowing its parent habit's target value anyway.
    /** Target value adjusted for today's status (rest days round up). */
    get effectiveTargetValue() {
        if (this.#status === "REST_DAY") {
            return Math.ceil(this.#targetValue);
        }
        return this.#targetValue;
    }

    // Getter for targetValue
    get targetValue() {
        return this.#targetValue;
    }

    // Getter for targetUnit
    get targetUnit() {
        return this.#targetUnit;
    }

    // Getter for Active
    get Active() {
        return this.#Activated;
    }
    // Getter for habitId
    get HabitId() {
        return this.#habitId;
    }
    // Getter for currValue
    get currValue() {
        return this.#currValue;
    }
}
module.exports = Habit;
