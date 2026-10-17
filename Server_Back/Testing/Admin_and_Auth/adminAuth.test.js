const {
  createAdmin,
  login,
  deleteAccount
} = require("../../Auth_Security_Admin/authService");
const {
  authenticateToken,
  requireAdmin
} = require("../../Auth_Security_Admin/authMiddleware");
const prisma  = require("../../prisma/client");

describe("Admin Authorization Tests", () => {
  const adminEmail = `admin-test-${Date.now()}@habittracker.com`;
  const adminPassword = "AdminTest123";
  let adminId = null;
  let adminToken = null;
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    // Reset Express mocks before each test
    mockReq = { headers: {} };
    mockRes = {
      statusCode: 200,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  afterAll(async () => {
    if (adminId !== null) {
      await deleteAccount(adminId);
    }
    await prisma.$disconnect();
  });

  it("TEST 1: Should create an ADMIN account", async () => {
    const adminResult = await createAdmin("Admin Test User", adminEmail, adminPassword);
    expect(adminResult.success).toBe(true);
    expect(adminResult.userId).toBeDefined();
    adminId = adminResult.userId;

    const adminUser = await prisma.user.findUnique({
      where: { userId: adminId },
      select: { userId: true, name: true, email: true, role: true }
    });
    expect(adminUser.role).toBe("ADMIN");
  });

  it("TEST 2: Should login as ADMIN and receive a token", async () => {
    const loginResult = await login(adminEmail, adminPassword);
    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();
    adminToken = loginResult.token;
  });

  it("TEST 3: Should authenticate ADMIN JWT via middleware", () => {
    mockReq.headers.authorization = `Bearer ${adminToken}`;

    authenticateToken(mockReq, mockRes, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user.role).toBe("ADMIN");
  });

  it("TEST 4: Should grant access when requireAdmin is called", () => {
    // Simulate req object after authenticateToken has run
    mockReq.user = { role: "ADMIN" };

    requireAdmin(mockReq, mockRes, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalledWith(403);
  });
});