const {
  register,
  login,
  updateProfile,
  deleteAccount
} = require("./authService");

const { prisma } = require("../Server_Back/prisma/client");

async function runTests() {
  // Use a unique email so the test can be run multiple times.
  const testEmail = `auth-test-${Date.now()}@example.com`;
  const password = "TestPassword123";

  let userId = null;

  try {
    console.log("========================================");
    console.log("AUTHENTICATION AND PROFILE TESTS");
    console.log("========================================");

    // TEST 1
    console.log("\nTEST 1: Valid registration");

    const registrationResult = await register(
      "Test User",
      testEmail,
      password
    );

    console.log(registrationResult);

    if (registrationResult.success) {
      userId = registrationResult.userId;
    }

    // TEST 2
    console.log("\nTEST 2: Duplicate email");

    const duplicateResult = await register(
      "Another User",
      testEmail,
      "AnotherPassword123"
    );

    console.log(duplicateResult);

    // TEST 3
    console.log("\nTEST 3: Valid login");

    const loginResult = await login(
      testEmail,
      password
    );

    // Do not print the actual JWT.
    console.log({
      success: loginResult.success,
      message: loginResult.message,
      tokenCreated: Boolean(loginResult.token)
    });

    // TEST 4
    console.log("\nTEST 4: Wrong password");

    console.log(
      await login(testEmail, "WrongPassword")
    );

    // TEST 5
    console.log("\nTEST 5: Unknown email");

    console.log(
      await login(
        "unknown-user@example.com",
        password
      )
    );

    // TEST 6
    console.log("\nTEST 6: Empty email");

    console.log(
      await login("", password)
    );

    // TEST 7
    console.log("\nTEST 7: Empty name registration");

    console.log(
      await register(
        "",
        `invalid-${Date.now()}@example.com`,
        password
      )
    );

    // TEST 8
    console.log("\nTEST 8: Update profile");

    const updateResult = await updateProfile(
      userId,
      {
        name: "Updated Test User"
      }
    );

    console.log(updateResult);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log("User after profile update:");
    console.log(updatedUser);

    // TEST 9
    console.log("\nTEST 9: Delete account");

    const deleteResult = await deleteAccount(userId);

    console.log(deleteResult);

    const deletedUser = await prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    console.log(
      "User exists after deletion:",
      deletedUser !== null
    );

    console.log("\n========================================");
    console.log("AUTHENTICATION TESTS COMPLETED");
    console.log("========================================");

  } catch (error) {
    console.error("\nTEST ERROR:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();