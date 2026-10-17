const {
  register,
  login,
  updateProfile,
  deleteAccount
} = require("../../Auth_Security_Admin/authService");
const prisma  = require("../../prisma/client");

describe("Authentication and Profile Service", () => {
  const testEmail = `auth-test-${Date.now()}@example.com`;
  const password = "TestPassword123";
  let userId = null;

  afterAll(async () => {
    // Failsafe cleanup in case the delete test fails
    if (userId) {
      await deleteAccount(userId);
    }
    await prisma.$disconnect();
  });

  it("TEST 1: Should register a valid user successfully", async () => {
    const result = await register("Test User", testEmail, password);
    expect(result.success).toBe(true);
    expect(result.userId).toBeDefined();
    userId = result.userId;
  });

  it("TEST 2: Should reject registration with a duplicate email", async () => {
    const result = await register("Another User", testEmail, "AnotherPassword123");
    expect(result.success).toBe(false);
  });

  it("TEST 3: Should login successfully with valid credentials", async () => {
    const result = await login(testEmail, password);
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
  });

  it("TEST 4: Should reject login with wrong password", async () => {
    const result = await login(testEmail, "WrongPassword");
    expect(result.success).toBe(false);
  });

  it("TEST 5: Should reject login with an unknown email", async () => {
    const result = await login("unknown-user@example.com", password);
    expect(result.success).toBe(false);
  });

  it("TEST 6: Should reject login with an empty email", async () => {
    const result = await login("", password);
    expect(result.success).toBe(false);
  });

  it("TEST 7: Should reject registration with an empty name", async () => {
    const result = await register("", `invalid-${Date.now()}@example.com`, password);
    expect(result.success).toBe(false);
  });

  it("TEST 8: Should update user profile successfully", async () => {
    const updateResult = await updateProfile(userId, { name: "Updated Test User" });
    expect(updateResult.success).toBe(true);

    const updatedUser = await prisma.user.findUnique({
      where: { userId: userId },
      select: { userId: true, name: true, email: true, role: true }
    });
    expect(updatedUser.name).toBe("Updated Test User");
  });

  it("TEST 9: Should delete the account successfully", async () => {
    const deleteResult = await deleteAccount(userId);
    expect(deleteResult.success).toBe(true);

    const deletedUser = await prisma.user.findUnique({
      where: { userId: userId }
    });
    expect(deletedUser).toBeNull();
    
    // Clear userId so afterAll doesn't try to delete again
    userId = null; 
  });
});