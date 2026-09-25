const {
  createAdmin,
  login
} = require("./authService");

const {
  authenticateToken,
  requireAdmin
} = require("./authMiddleware");

async function runTests() {
  console.log("=== Admin Authorization Tests ===");

  // Create an admin account
  const adminResult = await createAdmin(
    "Admin User",
    "admin@habittracker.com",
    "Admin123"
  );

  console.log("Create admin:", adminResult);

  // Login as the admin
  const loginResult = await login(
    "admin@habittracker.com",
    "Admin123"
  );

  console.log("Admin login:", loginResult.success);

  if (!loginResult.success) {
    console.log("Admin login failed.");
    return;
  }

  // Fake Express request containing the ADMIN JWT
  const req = {
    headers: {
      authorization: `Bearer ${loginResult.token}`
    }
  };

  const res = {
    statusCode: 200,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      console.log(
        "Authorization failed:",
        this.statusCode,
        data
      );
      return data;
    }
  };

  authenticateToken(req, res, () => {
    console.log("JWT authentication: PASSED");
    console.log("Decoded role:", req.user.role);

    requireAdmin(req, res, () => {
      console.log("Admin authorization: PASSED");
      console.log("ADMIN ACCESS GRANTED");
    });
  });
}

runTests();