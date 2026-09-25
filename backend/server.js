const express = require("express");
const { authenticateToken } = require("./authMiddleware");

const {
  register,
  login,
  updateProfile,
  deleteAccount
} = require("./authService");

const {
  flagGroup,
  getFlaggedGroups,
  reviewFlaggedGroup,
  removeGroup
} = require("./adminService");

const app = express();

app.use(express.json());

// ====================
// Authentication Routes
// ====================

// Register a new user
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  const result = await register(name, email, password);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.status(201).json(result);
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await login(email, password);

  if (!result.success) {
    return res.status(401).json(result);
  }

  res.json(result);
});

// ====================
// Profile Routes
// ====================

// Temporary userId until JWT middleware is added
app.put("/api/profile", authenticateToken, (req, res) => {
  const userId = req.user.userId;

  const result = updateProfile(userId, req.body);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// Delete account
app.delete("/api/profile", authenticateToken, (req, res) => {
  const userId = req.user.userId;

  const result = deleteAccount(userId);

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json(result);
});

// ====================
// Admin Moderation Routes
// ====================

// Flag a group
app.put("/api/admin/groups/:groupId/flag", (req, res) => {
  const groupId = Number(req.params.groupId);
  const { reason } = req.body;

  const result = flagGroup(groupId, reason);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// Get all flagged groups
app.get("/api/admin/flagged-groups", (req, res) => {
  res.json(getFlaggedGroups());
});

// Review a flagged group
app.put("/api/admin/groups/:groupId/review", (req, res) => {
  const groupId = Number(req.params.groupId);

  const result = reviewFlaggedGroup(groupId);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// Remove a group
app.delete("/api/admin/groups/:groupId", (req, res) => {
  const groupId = Number(req.params.groupId);

  const result = removeGroup(groupId);

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json(result);
});

// ====================
// Server
// ====================

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`HabitTracker server running on http://localhost:${PORT}`);
});