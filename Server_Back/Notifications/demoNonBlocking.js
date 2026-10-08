// Script to RUN LIVE in the demo
// Visually proves that notifyIfMilestone doesn't freeze the rest of the app
// Run with: node backend/demoNonBlocking.js


const { notifyIfMilestone } = require("./notificationOrchestrator");
 
console.log("User just logged their habit. Hitting a 7-day streak...");
 
notifyIfMilestone(7, "test@example.com", "Monal");
 
console.log("app is free to do other things.");
console.log("('Email sent' message will arrive a moment later)");