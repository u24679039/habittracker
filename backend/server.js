const express = require("express");

const {
  authenticateToken,
  requireAdmin
} = require("./authMiddleware");

const {
  register,
  login,
  getProfile,
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
  try {
    const { name, email, password } = req.body;

    const result = await register(
      name,
      email,
      password
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred."
    });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await login(
      email,
      password
    );

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred."
    });
  }
});

// ====================
// Profile Routes
// ====================

// Get authenticated user's profile
app.get(
  "/api/profile",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.userId;

      const result = await getProfile(userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error("Get profile error:", error);

      return res.status(500).json({
        success: false,
        message: "An internal server error occurred."
      });
    }
  }
);

// Update authenticated user's profile
app.put(
  "/api/profile",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.userId;

      const result = await updateProfile(
        userId,
        req.body
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error("Profile update error:", error);

      return res.status(500).json({
        success: false,
        message: "An internal server error occurred."
      });
    }
  }
);

// Delete authenticated user's account
app.delete(
  "/api/profile",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.userId;

      const result = await deleteAccount(userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error("Account deletion error:", error);

      return res.status(500).json({
        success: false,
        message: "An internal server error occurred."
      });
    }
  }
);

// ====================
// Admin Moderation Routes
// ====================

// Flag a group
app.put(
  "/api/admin/groups/:groupId/flag",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    try {
      const groupId = Number(req.params.groupId);
      const { reason } = req.body;

      const result = flagGroup(
        groupId,
        reason
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error("Group flag error:", error);

      return res.status(500).json({
        success: false,
        message: "An internal server error occurred."
      });
    }
  }
);

// Get all flagged groups
app.get(
  "/api/admin/flagged-groups",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    try {
      const result = getFlaggedGroups();

      return res.json(result);
    } catch (error) {
      console.error(
        "Get flagged groups error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "An internal server error occurred."
      });
    }
  }
);

// Review a flagged group
app.put(
  "/api/admin/groups/:groupId/review",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    try {
      const groupId = Number(req.params.groupId);

      const result =
        reviewFlaggedGroup(groupId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error(
        "Group review error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "An internal server error occurred."
      });
    }
  }
);

// Remove a group
app.delete(
  "/api/admin/groups/:groupId",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    try {
      const groupId = Number(req.params.groupId);

      const result = removeGroup(groupId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error(
        "Group removal error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "An internal server error occurred."
      });
    }
  }
);

// ====================
// Basic Health Check
// ====================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "HabitTracker API is running."
  });
});

// ====================
// Server
// ====================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(
    `HabitTracker server running on http://localhost:${PORT}`
  );
});

// Display unexpected server errors instead of silently exiting.
server.on("error", (error) => {
  console.error("Server error:", error);
});

module.exports = app;