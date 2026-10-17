const assert = require("assert");
const sinon = require("sinon");

const createGroupStub = sinon.stub();
const joinGroupStub = sinon.stub();
const getGroupStub = sinon.stub();
const updateGroupStub = sinon.stub();
const deleteGroupStub = sinon.stub();
const getMembersStub = sinon.stub();
const leaveGroupStub = sinon.stub();
const removeMemberStub = sinon.stub();
const updateRoleStub = sinon.stub();
const getUserGroupsStub = sinon.stub();

const groupServiceMock = {
    createGroup: createGroupStub,
    joinGroup: joinGroupStub,
    getGroup: getGroupStub,
    getMembers: getMembersStub,
    leaveGroup: leaveGroupStub,
    removeMember: removeMemberStub,
    updateRole: updateRoleStub,
    updateGroup: updateGroupStub,
    deleteGroup: deleteGroupStub,
    getUserGroups: getUserGroupsStub
};

// proxyquire is ignored under Jest, so mock the service with jest.doMock instead.
// It must come AFTER groupServiceMock is defined above (it is not hoisted).
jest.resetModules();
jest.doMock("../../Micro_Groups/services/groupService", () => groupServiceMock);

const {
    createGroup,
    joinGroup,
    getGroup,
    getMembers,
    leaveGroup,
    removeMember,
    updateRole,
    updateGroup,
    deleteGroup,
    getUserGroups
} = require("../../Micro_Groups/controllers/groupController");

// test the controller responses for group creation
describe("createGroup", function()
{
    beforeEach(function()
    {
        createGroupStub.reset();
    });

    // test successful group creation
    it("should return 201 and the created group details", async function()
    {
        createGroupStub.resolves({ groupId: 1, inviteCode: "AB7KQ3" });

        const req = { body: { name: "Study Group", description: "Weekly study sessions", maxMembers: 5, creatorId: 10 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await createGroup(req, res);

        assert.strictEqual(res.status.calledWith(201), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {
            message: "Group created successfully.",
            groupId: 1,
            invitationCode: "AB7KQ3"
        });
    });

    // test failed group creation
    it("should return 400 when group creation fails", async function()
    {
        createGroupStub.resolves(false);

        const req = { body: { name: "Study Group", description: "Weekly study sessions", maxMembers: 5, creatorId: 10 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await createGroup(req, res);

        assert.strictEqual(res.status.calledWith(400), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "Group creation failed."});
    });
});

// test the controller responses for group joining
describe("joinGroup", function()
{
    beforeEach(function()
    {
        joinGroupStub.reset();
    });

    // test successful group join
    it("should return 200 when the group is joined successfully", async function()
    {
        joinGroupStub.resolves({success: true});

        const req = { body: { invitationCode: "AB7KQ3", userId: 10 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await joinGroup(req, res);

        assert.strictEqual(res.status.calledWith(200), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "Group joined successfully."});
    });

    // test failed group join
    it("should return 400 when joining the group fails", async function()
    {
        joinGroupStub.resolves(false);

        const req = { body: { invitationCode: "AB7KQ3", userId: 10 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await joinGroup(req, res);

        assert.strictEqual(res.status.calledWith(400), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "Invalid invitation code. Please enter a valid code."});
    });

    // test that duplicate membership returns a clear error
    it("should return 400 when the user is already a member", async function()
    {
        joinGroupStub.resolves({
            success: false,
            reason: "ALREADY_MEMBER"
        });

        const req = { body: { invitationCode: "AB7KQ3", userId: 10 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await joinGroup(req, res);

        assert.strictEqual(res.status.calledWith(400), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {
            message: "You are already a member of this group."
        });
    });
});

// test the controller responses for retrieving a group
describe("getGroup", function()
{
    beforeEach(function()
    {
        getGroupStub.reset();
    });

    // test retrieving an existing group
    it("should return 200 and the group details", async function()
    {
        const group = {
            groupId: 1,
            name: "Study Group",
            memberships: [
                {
                    membershipId: 1,
                    userId: 10,
                    groupId: 1,
                    joinedAt: "2026-09-20T10:00:00.000Z",
                    role: "OWNER"
                }
            ]
        };

        getGroupStub.resolves(group);

        const req = { params: { groupId: "1" } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await getGroup(req, res);

        assert.strictEqual(res.status.calledWith(200), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], group);
    });

    // test when the group does not exist
    it("should return 404 when the group does not exist", async function()
    {
        getGroupStub.resolves(null);

        const req = { params: { groupId: "999" } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await getGroup(req, res);

        assert.strictEqual(res.status.calledWith(404), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "Group not found."});
    });
});

// test the controller responses for retrieving group memberships
describe("getMembers", function()
{
    beforeEach(function()
    {
        getMembersStub.reset();
    });

    it("should return 200 and the group memberships", async function()
    {
        const memberships = [{ membershipId: 1, userId: 10, groupId: 1, role: "OWNER" }];
        getMembersStub.resolves(memberships);
        const req = { params: { groupId: "1" } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await getMembers(req, res);

        assert.strictEqual(res.status.calledWith(200), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], memberships);
    });

    it("should return 400 for an invalid group ID", async function()
    {
        const req = { params: { groupId: "0" } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await getMembers(req, res);

        assert.strictEqual(res.status.calledWith(400), true);
        assert.strictEqual(getMembersStub.called, false);
    });

    it("should return 404 when the group does not exist", async function()
    {
        getMembersStub.resolves(null);
        const req = { params: { groupId: "999" } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await getMembers(req, res);

        assert.strictEqual(res.status.calledWith(404), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "Group not found."});
    });
});


// test the controller responses for leaving a group
describe("leaveGroup", function()
{
    beforeEach(function()
    {
        leaveGroupStub.reset();
    });

    it("should return 200 when a member leaves successfully", async function()
    {
        leaveGroupStub.resolves({ success: true });
        const req = { params: { groupId: "1" }, body: { userId: 20 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await leaveGroup(req, res);

        assert.strictEqual(res.status.calledWith(200), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "Group left successfully."});
    });

    it("should return a clear failure when an owner tries to leave", async function()
    {
        leaveGroupStub.resolves({ success: false, reason: "OWNER_CANNOT_LEAVE" });
        const req = { params: { groupId: "1" }, body: { userId: 10 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await leaveGroup(req, res);

        assert.strictEqual(res.status.calledWith(403), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "The group owner cannot leave the group."});
    });

    it("should return 400 when leaving the group fails", async function()
    {
        leaveGroupStub.resolves({ success: false, reason: "NOT_A_MEMBER" });
        const req = { params: { groupId: "1" }, body: { userId: 20 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await leaveGroup(req, res);

        assert.strictEqual(res.status.calledWith(400), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "Group leave failed."});
    });
});


// test the controller responses for owner-only member removal
describe("removeMember", function()
{
    beforeEach(function()
    {
        removeMemberStub.reset();
    });

    it("should return 200 when an owner removes a member", async function()
    {
        removeMemberStub.resolves(true);
        const req = { params: { groupId: "1", memberUserId: "20" }, body: { userId: 10 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await removeMember(req, res);

        assert.strictEqual(res.status.calledWith(200), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "Group member removed successfully."});
    });

    it("should return 400 when a non-owner attempts to remove a member", async function()
    {
        removeMemberStub.resolves(false);
        const req = { params: { groupId: "1", memberUserId: "30" }, body: { userId: 20 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await removeMember(req, res);

        assert.strictEqual(res.status.calledWith(400), true);
    });

    it("should return 400 when an owner attempts to remove themselves", async function()
    {
        removeMemberStub.resolves(false);
        const req = { params: { groupId: "1", memberUserId: "10" }, body: { userId: 10 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await removeMember(req, res);

        assert.strictEqual(res.status.calledWith(400), true);
    });
});


// test the controller responses for owner-only member role changes
describe("updateRole", function()
{
    beforeEach(function()
    {
        updateRoleStub.reset();
    });

    it("should return 200 when an owner updates a member role", async function()
    {
        updateRoleStub.resolves(true);
        const req = {
            params: { groupId: "1", memberUserId: "20" },
            body: { userId: 10, role: "OWNER" }
        };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await updateRole(req, res);

        assert.strictEqual(res.status.calledWith(200), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "Group member role updated successfully."});
    });

    it("should return 400 when a non-owner attempts a role change", async function()
    {
        updateRoleStub.resolves(false);
        const req = {
            params: { groupId: "1", memberUserId: "30" },
            body: { userId: 20, role: "OWNER" }
        };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await updateRole(req, res);

        assert.strictEqual(res.status.calledWith(400), true);
    });

    it("should return 400 when an owner attempts to change their own role", async function()
    {
        updateRoleStub.resolves(false);
        const req = {
            params: { groupId: "1", memberUserId: "10" },
            body: { userId: 10, role: "MEMBER" }
        };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await updateRole(req, res);

        assert.strictEqual(res.status.calledWith(400), true);
    });
});


describe("updateGroup", function()
{
    beforeEach(function()
    {
        updateGroupStub.reset();
    });

    // test successful group update
    it("should return 200 and the updated group", async function()
    {
        updateGroupStub.resolves({ groupId: 1, name: "Exam Group" });

        const req = { params: { groupId: "1" }, body: { userId: 10, name: "Exam Group" } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await updateGroup(req, res);

        assert.strictEqual(res.status.calledWith(200), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], { groupId: 1, name: "Exam Group" });
    });

    // test failed group update
    it("should return 400 when the group update fails", async function()
    {
        updateGroupStub.resolves(null);

        const req = { params: { groupId: "1" }, body: { userId: 10, name: "Exam Group" } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await updateGroup(req, res);

        assert.strictEqual(res.status.calledWith(400), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "Group update failed."});
    });
});

// test the controller responses for deleting an accountability group
describe("deleteGroup", function()
{
    beforeEach(function()
    {
        deleteGroupStub.reset();
    });

    // test successful group deletion
    it("should return 200 when the group is deleted successfully", async function()
    {
        deleteGroupStub.resolves(true);

        const req = { params: { groupId: "1" }, body: { userId: 10 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await deleteGroup(req, res);

        assert.strictEqual(res.status.calledWith(200), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "Group deleted successfully."});
    });

    // test failed group deletion
    it("should return 400 when group deletion fails", async function()
    {
        deleteGroupStub.resolves(false);

        const req = { params: { groupId: "1" }, body: { userId: 10 } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await deleteGroup(req, res);

        assert.strictEqual(res.status.calledWith(400), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], {message: "Group deletion failed."});
    });
});

// test the controller responses for retrieving all groups belonging to a user
describe("getUserGroups", function()
{
    beforeEach(function()
    {
        getUserGroupsStub.reset();
    });

    // test retrieving all groups belonging to a user
    it("should return 200 and the user's groups", async function()
    {
        const groups = [
            {
                membershipId: 1,
                userId: 10,
                groupId: 1,
                role: "OWNER",
                group: { groupId: 1, name: "Study Group" }
            },
            {
                membershipId: 2,
                userId: 10,
                groupId: 2,
                role: "MEMBER",
                group: { groupId: 2, name: "Fitness Group" }
            }
        ];

        getUserGroupsStub.resolves(groups);

        const req = { params: { userId: "10" } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await getUserGroups(req, res);

        assert.strictEqual(res.status.calledWith(200), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], groups);
    });

    // test retrieving groups for a user with no group memberships
    it("should return 200 and an empty list when the user has no groups", async function()
    {
        getUserGroupsStub.resolves([]);

        const req = { params: { userId: "10" } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await getUserGroups(req, res);

        assert.strictEqual(res.status.calledWith(200), true);
        assert.deepStrictEqual(res.json.firstCall.args[0], []);
    });

    // test that an invalid user ID is rejected
    it("should return 400 for an invalid user ID", async function()
    {
        const req = { params: { userId: "0" } };
        const res = { status: sinon.stub().returnsThis(), json: sinon.stub() };

        await getUserGroups(req, res);

        assert.strictEqual(res.status.calledWith(400), true);
        assert.strictEqual(getUserGroupsStub.called, false);
    });
});