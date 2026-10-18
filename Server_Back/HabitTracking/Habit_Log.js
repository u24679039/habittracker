//--------------------------------File Import block------------------------
//-------------------------------------------------------------------------
const  prisma  = require('../prisma/client.js')

//-------------------------------------------------------------------------

// class for the habitLog funcs
// A HabitLog is just a single record of "on this day, this habit was
// completed / missed / a rest day / snoozed". Habit owns the business
// logic; this class is mostly a thin wrapper around one row in the
// habitLog table.
class HabitLog {
    //private prop
    #logId;
    #habitId;
    #userId;
    #date;
    #value;
    #status;
    #note;
    #createdAt;

    /** Creates a habit-log instance from supplied log data. */
    // Small thing worth knowing if you're editing this later: `userId`
    // has a default of null but sits before params that don't have
    // defaults (date, value, ...). JS actually allows that - default
    // params don't have to be last - but it reads a bit oddly. Every
    // caller in this codebase passes all the arguments positionally
    // anyway, so the default never really comes into play. Left the order
    // as-is rather than risk breaking every place that calls `new
    // HabitLog(...)`.
    constructor(logId, habitId, userId = null, date, value, status = "", note = "", createdAt) {
        this.#logId = logId;
        this.#habitId = habitId;
        this.#date = date || new Date();
        this.#value = value;
        this.#status = status;
        this.#note = note;
        this.#createdAt = createdAt || new Date();
        this.#userId = userId;
    }

    /** Persists this habit log and returns the created database record. */
    async save() {
        const createdLog = await prisma.habitLog.create({
            data: {
                habitId: parseInt(this.#habitId),
                userId: parseInt(this.#userId),
                completedAt: this.#date,
                value: parseFloat(this.#value),
                status: this.#status,
                note: this.#note,
                createdAt: this.#createdAt,
            },
        });
        this.#logId = createdLog.logId;
        return createdLog;
    }

    //recieves a value
    //updates the value in the class and the DB
    async updateValue(value) {
        this.#value = value;
        return await prisma.habitLog.update({
            where: { logId: parseInt(this.#logId) },
            data: {
                value: parseFloat(this.#value),
            },
        });
    }

    //recieves a status
    //updates the status in the class and the DB
    async updateStatus(status) {
        this.#status = status;
        return await prisma.habitLog.update({
            where: { logId: parseInt(this.#logId) },
            data: {
                status: this.#status,
            },
        });
    }

    //recieves a note
    //updates the note in the class and the DB
    async updateNote(note) {
        this.#note = note;
        return await prisma.habitLog.update({
            where: { logId: parseInt(this.#logId) },
            data: {
                note: this.#note,
            },
        });
    }

    //recieves nothing
    //returns a boolean value of if completed
    isCompleted() {
        return this.#status === "COMPLETED";
    }

    //recieves nothing
    //returns a boolean value of if Rest_Day
    isRestDay() {
        return this.#status === "REST_DAY";
    }

    //recieves nothing
    //returns a boolean value of if Snoozed
    isSnoozed() {
        return this.#status === "SNOOZED";
    }

    //recieves nothing
    //returns a boolean value of if Missed
    isMissed() {
        return this.#status === "MISSED";
    }

    // Getter for logId
    get logId() {
        return this.#logId;
    }

    // Getter for status
    get status() {
        return this.#status;
    }

    // There used to be an `effectiveTargetValue` getter right here that
    // looked like this:
    //
    //   get effectiveTargetValue() {
    //     if (this.#status === "REST_DAY") return Math.ceil(habit.targetValue);
    //     return habit.targetValue;
    //   }
    //
    // `habit` was never actually defined anywhere - not a parameter, not a
    // field, nothing imported by that name - so this would have thrown a
    // ReferenceError the moment anything tried to call it. It's also just
    // in the wrong place conceptually: a single log entry doesn't know
    // (and shouldn't need to know) its parent habit's target value. Moved
    // it over to the Habit class, where it can actually see `#targetValue`
    // and `#status` on itself. Look for `get effectiveTargetValue()` in
    // Habit.js.

    // Getter for value
    get value() {
        return this.#value;
    }
}
module.exports = HabitLog
