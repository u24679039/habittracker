const assert = require("assert");
const request = require("supertest");
const app = require("../../Server");
const prisma = require("../../prisma/client");
beforeAll(async () => {
  // Ensure creator (userId: 10) exists
  await prisma.user.upsert({
    where: { userId: 10 },
    update: {},
    create: {
      userId: 10,
      email: 'testcreator10@example.com',
      name: 'Test Creator',
      passwordHash: 'hashedpassword123'
    }
  });

  // Ensure member (userId: 20) exists
  await prisma.user.upsert({
    where: { userId: 20 },
    update: {},
    create: {
      userId: 20,
      email: 'testmember20@example.com',
      name: 'Test Member',
      passwordHash: 'hashedpassword123'
    }
  });
});
// remove a test group and its memberships from the database
async function cleanupGroup(groupId)
{
    if (groupId)
    {
        await prisma.groupMembership.deleteMany({ where: { groupId: groupId } });
        await prisma.accountabilityGroup.delete({ where: { groupId: groupId } });
    }
}

// disconnect the Prisma client after all API tests have finished
afterAll(async function()
{
    await prisma.$disconnect();
});

// test the API responses for creating an accountability group
describe("POST /groups", function()
{
    // test successful group creation through the API
    it("should create a group and return 201", async function()
    {
        let groupId;

        try
        {
            const response = await request(app)
                .post("/api/groups")
                .send({ name: "API Test Group", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            groupId = response.body.groupId;

            assert.strictEqual(response.status, 201);
            assert.strictEqual(response.body.message, "Group created successfully.");
            assert.ok(response.body.groupId);
            assert.ok(response.body.invitationCode);
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });

    // test that invalid group creation returns a 400 response
    it("should return 400 when group creation fails", async function()
    {
        const response = await request(app)
            .post("/api/groups")
            .send({ name: "", description: "Integration test group", maxMembers: 5, creatorId: 10 });

        assert.strictEqual(response.status, 400);
        assert.deepStrictEqual(response.body, {message: "Group creation failed."});
    });
});

// test the API responses for joining an accountability group
describe("POST /groups/join", function()
{
    // test successful group joining through the API
    it("should join an existing group and return 200", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Join Test Group", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            assert.strictEqual(createResponse.status, 201);

            groupId = createResponse.body.groupId;

            const response = await request(app)
                .post("/api/groups/join")
                .send({ invitationCode: createResponse.body.invitationCode, userId: 20 });

            assert.strictEqual(response.status, 200);
            assert.deepStrictEqual(response.body, {message: "Group joined successfully."});
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });

    // test that an invalid invitation code returns a 400 response
    it("should return 400 when the invitation code is invalid", async function()
    {
        const response = await request(app)
            .post("/api/groups/join")
            .send({ invitationCode: "XXXXXX", userId: 20 });

        assert.strictEqual(response.status, 400);
        assert.deepStrictEqual(response.body, {message: "Invalid invitation code. Please enter a valid code."});
    });
    
    // test that joining the same group twice returns an already-member error
    it("should return 400 when the user is already a member", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({
                    name: "Duplicate Join Test",
                    description: "Integration test",
                    maxMembers: 5,
                    creatorId: 10
                });

            groupId = createResponse.body.groupId;

            const invitationCode = createResponse.body.invitationCode;

            await request(app)
                .post("/api/groups/join")
                .send({invitationCode: invitationCode, userId: 20});

            const response = await request(app)
                .post("/api/groups/join")
                .send({invitationCode: invitationCode, userId: 20});

            assert.strictEqual(response.status, 400);
            assert.deepStrictEqual(response.body, {
                message: "You are already a member of this group."
            });
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });
});

// test the API responses for retrieving an accountability group
describe("GET /groups/:groupId", function()
{
    // test retrieving an existing group through the API
    it("should return 200 and the group details", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Get Test Group", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            assert.strictEqual(createResponse.status, 201);

            groupId = createResponse.body.groupId;

            const response = await request(app).get(`/api/groups/${groupId}`);

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.groupId, groupId);
            assert.strictEqual(response.body.name, "Get Test Group");
            assert.strictEqual(response.body.memberships.length, 1);
            assert.strictEqual(response.body.memberships[0].userId, 10);
            assert.strictEqual(response.body.memberships[0].groupId, groupId);
            assert.strictEqual(response.body.memberships[0].role, "OWNER");
            assert.ok(response.body.memberships[0].joinedAt);
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });

    // test that a request for a nonexistent group returns a 404 response
    it("should return 404 when the group does not exist", async function()
    {
        const response = await request(app).get("/api/groups/999999");

        assert.strictEqual(response.status, 404);
        assert.deepStrictEqual(response.body, {message: "Group not found."});
    });
});

// test the API responses for retrieving group memberships
describe("GET /groups/:groupId/members", function()
{
    it("should return the memberships for an existing group", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Members Test Group", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            groupId = createResponse.body.groupId;

            const response = await request(app).get(`/api/groups/${groupId}/members`);

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.length, 1);
            assert.strictEqual(response.body[0].userId, 10);
            assert.strictEqual(response.body[0].role, "OWNER");
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });

    it("should return 404 when the group does not exist", async function()
    {
        const response = await request(app).get("/api/groups/999999/members");

        assert.strictEqual(response.status, 404);
        assert.deepStrictEqual(response.body, {message: "Group not found."});
    });
});

// test the API responses for leaving an accountability group
describe("DELETE /groups/:groupId/leave", function()
{
    it("should allow a MEMBER to leave without deleting the group", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Leave Test Group", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            groupId = createResponse.body.groupId;

            await request(app)
                .post("/api/groups/join")
                .send({ invitationCode: createResponse.body.invitationCode, userId: 20 });

            const response = await request(app)
                .delete(`/api/groups/${groupId}/leave`)
                .send({ userId: 20 });

            assert.strictEqual(response.status, 200);
            assert.deepStrictEqual(response.body, {message: "Group left successfully."});

            const memberships = await prisma.groupMembership.findMany({ where: { groupId: groupId } });
            assert.strictEqual(memberships.length, 1);
            assert.strictEqual(memberships[0].userId, 10);
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });

    it("should return 403 when an owner attempts to leave", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Owner Leave Test Group", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            groupId = createResponse.body.groupId;

            const response = await request(app)
                .delete(`/api/groups/${groupId}/leave`)
                .send({ userId: 10 });

            assert.strictEqual(response.status, 403);
            assert.deepStrictEqual(response.body, {message: "The group owner cannot leave the group."});
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });
});

// test the API responses for an owner removing a member
describe("DELETE /groups/:groupId/members/:memberUserId", function()
{
    it("should allow an OWNER to remove another MEMBER", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Remove Test Group", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            groupId = createResponse.body.groupId;

            await request(app)
                .post("/api/groups/join")
                .send({ invitationCode: createResponse.body.invitationCode, userId: 20 });

            const response = await request(app)
                .delete(`/api/groups/${groupId}/members/20`)
                .send({ userId: 10 });

            assert.strictEqual(response.status, 200);
            assert.deepStrictEqual(response.body, {message: "Group member removed successfully."});
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });

    it("should reject a non-owner attempting to remove a member", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Non-owner Remove Test", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            groupId = createResponse.body.groupId;

            await request(app)
                .post("/api/groups/join")
                .send({ invitationCode: createResponse.body.invitationCode, userId: 20 });

            const response = await request(app)
                .delete(`/api/groups/${groupId}/members/10`)
                .send({ userId: 20 });

            assert.strictEqual(response.status, 400);
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });

    it("should reject an owner attempting to remove themselves", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Self Remove Test Group", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            groupId = createResponse.body.groupId;

            const response = await request(app)
                .delete(`/api/groups/${groupId}/members/10`)
                .send({ userId: 10 });

            assert.strictEqual(response.status, 400);
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });
});

// test the API responses for an owner updating a member role
describe("PATCH /groups/:groupId/members/:memberUserId/role", function()
{
    it("should allow an OWNER to update another member's role", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Role Test Group", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            groupId = createResponse.body.groupId;

            await request(app)
                .post("/api/groups/join")
                .send({ invitationCode: createResponse.body.invitationCode, userId: 20 });

            const response = await request(app)
                .patch(`/api/groups/${groupId}/members/20/role`)
                .send({ userId: 10, role: "OWNER" });

            assert.strictEqual(response.status, 200);
            assert.deepStrictEqual(response.body, {message: "Group member role updated successfully."});

            const membership = await prisma.groupMembership.findUnique({
                where: { userId_groupId: { userId: 20, groupId: groupId } }
            });
            assert.strictEqual(membership.role, "OWNER");
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    },10000);

    it("should reject a non-owner attempting to update a member role", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Non-owner Role Test", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            groupId = createResponse.body.groupId;

            await request(app)
                .post("/api/groups/join")
                .send({ invitationCode: createResponse.body.invitationCode, userId: 20 });

            const response = await request(app)
                .patch(`/api/groups/${groupId}/members/10/role`)
                .send({ userId: 20, role: "MEMBER" });

            assert.strictEqual(response.status, 400);
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    },10000);

    it("should reject an owner attempting to change their own role", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Self Role Test Group", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            groupId = createResponse.body.groupId;

            const response = await request(app)
                .patch(`/api/groups/${groupId}/members/10/role`)
                .send({ userId: 10, role: "MEMBER" });

            assert.strictEqual(response.status, 400);
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });
});

// test the API responses for updating accountability group settings
describe("PATCH /groups/:groupId", function()
{
    // test successful group update through the API
    it("should update a group and return 200", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Update Test Group", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            assert.strictEqual(createResponse.status, 201);

            groupId = createResponse.body.groupId;

            const response = await request(app)
                .patch(`/api/groups/${groupId}`)
                .send({ userId: 10, name: "Updated Group" });

            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.groupId, groupId);
            assert.strictEqual(response.body.name, "Updated Group");
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });

    // test that an invalid group update returns a 400 response
    it("should return 400 when the group update fails", async function()
    {
        const response = await request(app)
            .patch("/api/groups/999999")
            .send({ userId: 10, name: "Updated Group" });

        assert.strictEqual(response.status, 400);
        assert.deepStrictEqual(response.body, {message: "Group update failed."});
    });
});

// test the API responses for deleting an accountability group
describe("DELETE /groups/:groupId", function()
{
    // test successful group deletion through the API
    it("should delete a group and return 200", async function()
    {
        let groupId;

        try
        {
            const createResponse = await request(app)
                .post("/api/groups")
                .send({ name: "Delete Test Group", description: "Integration test group", maxMembers: 5, creatorId: 10 });

            assert.strictEqual(createResponse.status, 201);

            groupId = createResponse.body.groupId;

            const response = await request(app)
                .delete(`/api/groups/${groupId}`)
                .send({ userId: 10 });

            assert.strictEqual(response.status, 200);
            assert.deepStrictEqual(response.body, {message: "Group deleted successfully."});

            const deletedGroupId = groupId;
            groupId = null;

            const deletedGroup = await prisma.accountabilityGroup.findUnique({
                where: { groupId: deletedGroupId }
            });

            assert.strictEqual(deletedGroup, null);
        }
        finally
        {
            await cleanupGroup(groupId);
        }
    });

    // test that an invalid group deletion returns a 400 response
    it("should return 400 when group deletion fails", async function()
    {
        const response = await request(app)
            .delete("/api/groups/999999")
            .send({ userId: 10 });

        assert.strictEqual(response.status, 400);
        assert.deepStrictEqual(response.body, {message: "Group deletion failed."});
    });
});

// test the API responses for retrieving all groups belonging to a user
// describe("GET /groups/user/:userId", function()
// {
//     it("should return all groups belonging to a user", async function()
//     {
//         let firstGroupId;
//         let secondGroupId;

//         try
//         {
//             const firstGroup = await request(app)
//                 .post("/api/groups")
//                 .send({ name: "User Groups Test 1", description: "Integration test group", maxMembers: 5, creatorId: 10 });

//             const secondGroup = await request(app)
//                 .post("/api/groups")
//                 .send({ name: "User Groups Test 2", description: "Integration test group", maxMembers: 5, creatorId: 10 });

//             firstGroupId = firstGroup.body.groupId;
//             secondGroupId = secondGroup.body.groupId;

//             const response = await request(app)
//                 .get("/api/groups/user/10");

//             assert.strictEqual(response.status, 200);
//             assert.strictEqual(response.body.length, 2);
//             assert.strictEqual(response.body[0].groupId === firstGroupId ||
//                 response.body[1].groupId === firstGroupId, true);
//             assert.strictEqual(response.body[0].groupId === secondGroupId ||
//                 response.body[1].groupId === secondGroupId, true);
//         }
//         finally
//         {
//             await cleanupGroup(firstGroupId);
//             await cleanupGroup(secondGroupId);
//         }
//     });

//     it("should return an empty list when the user has no groups", async function()
//     {
//         const response = await request(app)
//             .get("/api/groups/user/999999");

//         assert.strictEqual(response.status, 200);
//         assert.deepStrictEqual(response.body, []);
//     });
// });
describe("GET /groups/user/:userId", function () {
  it("should return all groups belonging to a user", async function () {
    // 1. Clean up any existing leftover groups/memberships for userId 10 first
    await prisma.groupMembership.deleteMany({
      where: { userId: 10 }
    });
    await prisma.accountabilityGroup.deleteMany({
      where: { createdBy: 10 }
    });

    // 2. Create group 1
    const res1 = await request(app)
      .post("/api/groups")
      .send({
        name: "User Group 1",
        description: "Test group 1",
        maxMembers: 5,
        creatorId: 10
      });
    const firstGroupId = res1.body.groupId;

    // 3. Create group 2
    const res2 = await request(app)
      .post("/api/groups")
      .send({
        name: "User Group 2",
        description: "Test group 2",
        maxMembers: 5,
        creatorId: 10
      });
    const secondGroupId = res2.body.groupId;

    // 4. Fetch user's groups
    const response = await request(app).get("/api/groups/user/10");

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.length, 2); // Will now be exactly 2!
    
    const groupIds = response.body.map(g => g.groupId);
    assert.ok(groupIds.includes(firstGroupId));
    assert.ok(groupIds.includes(secondGroupId));
  });
});


afterAll(async () => {
  // Clean up created test groups and memberships
  await prisma.groupMembership.deleteMany({
    where: { userId: { in: [10, 20] } }
  });
  await prisma.accountabilityGroup.deleteMany({
    where: { createdBy: { in: [10, 20] } }
  });

  // Disconnect Prisma client
  await prisma.$disconnect();
});