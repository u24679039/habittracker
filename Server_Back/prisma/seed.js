const { prisma } = require('./client');
const Habit = require('../HabitTracking/Habit');

/*
Habit Tracking
Start
*/
// PLease add your DB seed code to this func 

async function fillDb() {
    try {
        await prisma.user.upsert({
    where: { userId: 1 },
    update: {},
    create: { 
        userId: 1, 
        email: "test@example.com", 
        passwordHash: "password", // match your schema field (passwordHash)
        name: "Test User" 
    }
});
        const userId = 1;

        // Create 4 habits
        const habit1 = new Habit(null, userId, "Morning Run", "Run 5km", 5, "km", "DAILY", "", true, new Date());
        await habit1.save();

        const habit2 = new Habit(null, userId, "Read book ", "Read 20 pages", 20, "pages", "DAILY", "", true, new Date());
        await habit2.save();

        const habit3 = new Habit(null, userId, "Meditation", "10 mins mindfulness", 10, "minutes", "DAILY", "", true, new Date());
        await habit3.save();

        const habit4 = new Habit(null, userId, "Drink Water", "Drink 2L", 2, "L", "DAILY", "", true, new Date());
        await habit4.save();

        // Back-filling a week and a bit of history for the morning run
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

        // 3 completed days in a row for the reading habit
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
        console.log("Database successfully seeded.");
    } catch (error) {
        console.error("Error seeding DB", error);
    } finally {
        await prisma.$disconnect();
    }
}

fillDb();






/*
Habit Tracking
End
*/