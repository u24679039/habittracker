const {
  createAdmin,
  login,
  deleteAccount
} = require("./authService");

const {
  authenticateToken,
  requireAdmin
} = require("./authMiddleware");

const { prisma } = require("../Server_Back/prisma/client");

async function runTests() {
  console.log("========================================");
  console.log("ADMIN AUTHORIZATION TESTS");
  console.log("========================================");

  const adminEmail = `admin-test-${Date.now()}@habittracker.com`;
  const adminPassword = "AdminTest123";

  let adminId = null;

  try {
    // TEST 1: Create ADMIN account
    console.log("\nTEST 1: Create ADMIN account");

    const adminResult = await createAdmin(
      "Admin Test User",
      adminEmail,
      adminPassword
    );

    console.log(adminResult);

    if (!adminResult.success) {
      console.log("Admin creation failed.");
      return;
    }

    adminId = adminResult.userId;

    // Confirm the role directly from PostgreSQL.
    const adminUser = await prisma.user.findUnique({
      where: {
        id: adminId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log("Database role:", adminUser.role);

    // TEST 2: Login as ADMIN
    console.log("\nTEST 2: Login as ADMIN");

    const loginResult = await login(
      adminEmail,
      adminPassword
    );

    console.log({
      success: loginResult.success,
      message: loginResult.message,
      tokenCreated: Boolean(loginResult.token)
    });

    if (!loginResult.success) {
      console.log("Admin login failed.");
      return;
    }

    // TEST 3: Authenticate ADMIN JWT
    console.log("\nTEST 3: Authenticate ADMIN JWT");

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
          "Authorization rejected:",
          this.statusCode,
          data
        );

        return data;
      }
    };

    authenticateToken(req, res, () => {
      console.log("JWT authentication: PASSED");
      console.log("Decoded role:", req.user.role);

      // TEST 4: Check ADMIN authorization
      console.log("\nTEST 4: Require ADMIN role");

      requireAdmin(req, res, () => {
        console.log("Admin authorization: PASSED");
        console.log("ADMIN ACCESS GRANTED");
      });
    });

  } catch (error) {
    console.error("\nADMIN TEST ERROR:");
    console.error(error);

  } finally {
    // Remove the temporary admin created by this test.
    if (adminId !== null) {
      const cleanupResult = await deleteAccount(adminId);

      console.log("\nTemporary admin cleanup:");
      console.log(cleanupResult);
    }

    await prisma.$disconnect();

    console.log("\n========================================");
    console.log("ADMIN AUTHORIZATION TESTS COMPLETED");
    console.log("========================================");
  }
}

runTests();