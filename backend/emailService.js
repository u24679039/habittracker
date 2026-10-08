// emailService.js
// Part of: Social Activity Feed & Notifications (Monal Iyer)
// EH-42: sends a milestone notification as an actual email

require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Builds the email content (subject + body) for a milestone.
 * This is PURE — no network calls — so it can be unit tested directly.
 * @param {string} userName
 * @param {number} milestone
 * @returns {{subject: string, text: string}}
 */
function buildMilestoneEmailContent(userName, milestone) {
  return {
    subject: `🎉 You hit a ${milestone}-day streak!`,
    text: `Hi ${userName}, congratulations on reaching a ${milestone}-day streak! Keep it up.`,
  };
}

/**
 * Sends a milestone congratulations email over SMTP.
 * @param {string} toEmail
 * @param {string} userName
 * @param {number} milestone
 */
async function sendMilestoneEmail(toEmail, userName, milestone) {
  const { subject, text } = buildMilestoneEmailContent(userName, milestone);

  const info = await transporter.sendMail({
    from: '"HabitForge" <no-reply@habitforge.app>',
    to: toEmail,
    subject,
    text,
  });

  console.log("Email sent:", info.messageId);
  return info;
}

// ---- Manual/informal test: actually sends a real test email ----
// Run with: node backend/emailService.js
// Then check your Mailtrap inbox online to confirm it arrived correctly.

if (require.main === module) {
  sendMilestoneEmail("test@example.com", "Monal", 7)
    .then(() => console.log("Test email sent successfully."))
    .catch((err) => console.error("Failed to send email:", err.message));
}

module.exports = { sendMilestoneEmail, buildMilestoneEmailContent };