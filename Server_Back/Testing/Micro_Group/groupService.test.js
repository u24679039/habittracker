const assert = require("assert");
const sinon = require("sinon");
// Mock Prisma before loading the service so no test contacts PostgreSQL.
jest.mock("../../prisma/prismaClient", () => {
    const sinon = require("sinon");
    return {
        accountabilityGroup: {
            findUnique: sinon.stub(),
            create: sinon.stub(),
            update: sinon.stub(),
            delete: sinon.stub()
        },
        groupMembership: {
            findUnique: sinon.stub(),
            count: sinon.stub(),
            create: sinon.stub(),
            findMany: sinon.stub(),
            delete: sinon.stub(),
            deleteMany: sinon.stub(),
            update: sinon.stub()
        },
        $transaction: sinon.stub()
    };
});

const prismaMock = require("../../prisma/prismaClient");
const findUniqueStub = prismaMock.accountabilityGroup.findUnique;
const groupCreateStub = prismaMock.accountabilityGroup.create;
const membershipCreateStub = prismaMock.groupMembership.create;
const transactionStub = prismaMock.$transaction;
const membershipFindUniqueStub = prismaMock.groupMembership.findUnique;
const membershipCountStub = prismaMock.groupMembership.count;
const groupUpdateStub = prismaMock.accountabilityGroup.update;
const membershipDeleteManyStub = prismaMock.groupMembership.deleteMany;
const groupDeleteStub = prismaMock.accountabilityGroup.delete;
const membershipFindManyStub = prismaMock.groupMembership.findMany;
const membershipDeleteStub = prismaMock.groupMembership.delete;
const membershipUpdateStub = prismaMock.groupMembership.update;

const {
    generateInviteCode,
    generateUniqueInviteCode,
    validateInviteCode,
    createGroup,
    addMember,
    joinGroup,
    getMembers,
    leaveGroup,
    isMember,
    removeMember,
    updateRole,
    getGroup,
    updateGroup,
    deleteGroup,
    getUserGroups
} = require("../../Micro_Groups/services/groupService");

describe("generateInviteCode", function()
{
    // test that generated invitation codes have the required format
    it("should generate a valid 6-character alphanumeric code", function()
    {
        const code = generateInviteCode();

        assert.strictEqual(code.length, 6);
        assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    });

    // test that separate calls can generate different invitation codes
    it("should generate different codes", function()
    {
        const codes = new Set();

        for (let i = 0; i < 100; i++)
        {
            codes.add(generateInviteCode());
        }

        assert(codes.size > 1);
    });
});


describe("generateUniqueInviteCode", function()
{
    beforeEach(function()
    {
        findUniqueStub.reset();
    });

    // test that an existing code causes another code to be generated
    it("should generate another code if the generated code already exists", async function()
    {
        const existingGroup = { groupId: 1 };
        const noGroup = null;

        findUniqueStub.onFirstCall().resolves(existingGroup);
        findUniqueStub.onSecondCall().resolves(noGroup);

        const code = await generateUniqueInviteCode();

        assert.strictEqual(findUniqueStub.callCount, 2);
        assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    });

    // test that an unused generated code is returned immediately
    it("should return the generated code if it does not already exist", async function()
    {
        const noGroup = null;

        findUniqueStub.resolves(noGroup);

        const code = await generateUniqueInviteCode();

        assert.strictEqual(findUniqueStub.callCount, 1);
        assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    });
});


describe("validateInviteCode", function()
{
    beforeEach(function()
    {
        findUniqueStub.reset();
    });

    // test that an existing invitation code is accepted
    it("should return true for an existing invitation code", async function()
    {
        findUniqueStub.resolves({ groupId: 1 });

        const result = await validateInviteCode("GRP234");

        assert.strictEqual(result, true);
        assert.strictEqual(findUniqueStub.callCount, 1);
    });

    // test that a valid-format code with no matching group is rejected
    it("should return false for a non-existing invitation code", async function()
    {
        findUniqueStub.resolves(null);

        const result = await validateInviteCode("ABC234");

        assert.strictEqual(result, false);
        assert.strictEqual(findUniqueStub.callCount, 1);
    });

    // test that incorrectly formatted invitation codes are rejected
    it("should return false for an invalid invitation code format", async function()
    {
        const result = await validateInviteCode("INVALID");

        assert.strictEqual(result, false);
        assert.strictEqual(findUniqueStub.callCount, 0);
    });

    // test that a missing invitation code is rejected
    it("should return false when no invitation code is provided", async function()
    {
        const result = await validateInviteCode("");

        assert.strictEqual(result, false);
        assert.strictEqual(findUniqueStub.callCount, 0);
    });
});


describe("createGroup", function()
{
    beforeEach(function()
    {
        // reset all mocks before each group creation test
        findUniqueStub.reset();
        groupCreateStub.reset();
        membershipCreateStub.reset();
        transactionStub.reset();
    });

    // test successful group creation and owner assignment
    it("should create a group and add the creator as the owner", async function()
    {
        // simulate successful database operations
        findUniqueStub.resolves(null);
        groupCreateStub.resolves({
            groupId: 1,
             inviteCode: "AB7KQ3"
        });
        membershipCreateStub.resolves({});

        transactionStub.callsFake(async (callback) =>
        {
            return callback({
                accountabilityGroup:
                {
                    create: groupCreateStub
                },
                groupMembership:
                {
                    create: membershipCreateStub
                }
            });
        });

        const result = await createGroup(
            "Study Group",
            "Weekly study sessions",
            5,
            10
        );

        assert.deepStrictEqual(result, {
            groupId: 1,
            invitationCode: "AB7KQ3"
        });
        assert.strictEqual(groupCreateStub.calledOnce, true);
        assert.strictEqual(membershipCreateStub.calledOnce, true);

        assert.strictEqual(
            membershipCreateStub.firstCall.args[0].data.role,
            "OWNER"
        );
    });

    // test that invalid group details are rejected before database creation
    it("should return false for invalid group details", async function()
    {
        const result = await createGroup(
            "",
            "Weekly study sessions",
            5,
            10
        );

        assert.strictEqual(result, false);
        assert.strictEqual(groupCreateStub.called, false);
    });

    // test that member limits outside the allowed 3–5 range are rejected
    it("should return false for an invalid member limit", async function()
    {
        const result = await createGroup(
            "Study Group",
            "Weekly study sessions",
            6,
            10
        );

        assert.strictEqual(result, false);
        assert.strictEqual(groupCreateStub.called, false);
    });

    // test that database failures cause group creation to fail safely
    it("should return false when group creation fails", async function()
    {
        // simulate a database failure
        findUniqueStub.resolves(null);
        groupCreateStub.rejects(new Error("database error"));

        transactionStub.callsFake(async (callback) =>
        {
            return callback({
                accountabilityGroup:
                {
                    create: groupCreateStub
                },
                groupMembership:
                {
                    create: membershipCreateStub
                }
            });
        });

        const result = await createGroup(
            "Study Group",
            "Weekly study sessions",
            5,
            10
        );

        assert.strictEqual(result, false);
    });
});


describe("joinGroup", function()
{
    beforeEach(function()
    {
        // reset all mocks before each group joining test
        findUniqueStub.reset();
        membershipFindUniqueStub.reset();
        membershipCountStub.reset();
        membershipCreateStub.reset();
        transactionStub.reset();

        // simulate the Prisma transaction
        transactionStub.callsFake(async (callback) =>
        {
            return callback({
                accountabilityGroup:
                {
                    findUnique: findUniqueStub
                },
                groupMembership:
                {
                    findUnique: membershipFindUniqueStub,
                    count: membershipCountStub,
                    create: membershipCreateStub
                }
            });
        });
    });

    // test that a new user can join a group with available capacity
    it("should add a new user to a group with 4 existing members", async function()
    {
        const group = {
            groupId: 1,
            maxMembers: 5,
            isActive: true
        };

        findUniqueStub.resolves(group);
        membershipFindUniqueStub.resolves(null);
        membershipCountStub.resolves(4);

        const result = await joinGroup("GRP234", 10);

        assert.deepStrictEqual(result, {success: true});
        assert.strictEqual(membershipCreateStub.calledOnce, true);
    });

    // test that a full group rejects a new user
    it("should return false when the group is full", async function()
    {
        const group = {
            groupId: 1,
            maxMembers: 5,
            isActive: true
        };

        findUniqueStub.resolves(group);
        membershipFindUniqueStub.resolves(null);
        membershipCountStub.resolves(5);

        const result = await joinGroup("GRP234", 10);

        assert.strictEqual(result, false);
        assert.strictEqual(membershipCreateStub.called, false);
    });

    // test that an existing member is not added again
    it("should return an already-member result when the user is already a member", async function()
    {
        const group = {
            groupId: 1,
            maxMembers: 5,
            isActive: true
        };

        findUniqueStub.resolves(group);
        membershipFindUniqueStub.resolves({ membershipId: 1 });

        const result = await joinGroup("GRP234", 10);

        assert.deepStrictEqual(result, {
            success: false,
            reason: "ALREADY_MEMBER"
        });
        assert.strictEqual(membershipCreateStub.called, false);
    });

    // test that inactive groups reject new members
    it("should return false when the group is inactive", async function()
    {
        const group = {
            groupId: 1,
            maxMembers: 5,
            isActive: false
        };

        findUniqueStub.resolves(group);

        const result = await joinGroup("GRP234", 10);

        assert.strictEqual(result, false);
        assert.strictEqual(membershipFindUniqueStub.called, false);
    });
});


// test whether a user has an existing membership in a group
describe("isMember", function()
{
    beforeEach(function()
    {
        membershipFindUniqueStub.reset();
    });

    it("should return true when the user belongs to the group", async function()
    {
        membershipFindUniqueStub.resolves({ membershipId: 1 });

        assert.strictEqual(await isMember(10, 1), true);
    });

    it("should return false when the user does not belong to the group", async function()
    {
        membershipFindUniqueStub.resolves(null);

        assert.strictEqual(await isMember(10, 1), false);
    });
});


// test adding members while preserving group capacity and duplicate-member rules
describe("addMember", function()
{
    beforeEach(function()
    {
        findUniqueStub.reset();
        membershipFindUniqueStub.reset();
        membershipCountStub.reset();
        membershipCreateStub.reset();
        transactionStub.reset();

        transactionStub.callsFake(async (callback) =>
        {
            return callback({
                accountabilityGroup: { findUnique: findUniqueStub },
                groupMembership:
                {
                    findUnique: membershipFindUniqueStub,
                    count: membershipCountStub,
                    create: membershipCreateStub
                }
            });
        });
    });

    it("should add a new member when the active group has capacity", async function()
    {
        findUniqueStub.resolves({ groupId: 1, isActive: true, maxMembers: 5 });
        membershipFindUniqueStub.resolves(null);
        membershipCountStub.resolves(4);
        membershipCreateStub.resolves({ membershipId: 2 });

        assert.deepStrictEqual(await addMember(1, 20), {success: true});
        assert.strictEqual(membershipCreateStub.calledOnce, true);
    });

    it("should return an already-member result for a duplicate member", async function()
    {
        findUniqueStub.resolves({ groupId: 1, isActive: true, maxMembers: 5 });
        membershipFindUniqueStub.resolves({ membershipId: 1, role: "MEMBER" });

        assert.deepStrictEqual(await addMember(1, 20), {
            success: false,
            reason: "ALREADY_MEMBER"
        });
        assert.strictEqual(membershipCreateStub.called, false);
    });

    it("should reject a full group", async function()
    {
        findUniqueStub.resolves({ groupId: 1, isActive: true, maxMembers: 5 });
        membershipFindUniqueStub.resolves(null);
        membershipCountStub.resolves(5);

        assert.strictEqual(await addMember(1, 20), false);
        assert.strictEqual(membershipCreateStub.called, false);
    });
});

// test retrieving the memberships for existing and missing groups
describe("getMembers", function()
{
    beforeEach(function()
    {
        findUniqueStub.reset();
        membershipFindManyStub.reset();
    });

    it("should return the memberships for a group", async function()
    {
        const memberships = [
            {
                membershipId: 1,
                userId: 10,
                groupId: 1,
                role: "OWNER"
            }
        ];

        const expectedMemberships = [
            {
                membershipId: 1,
                userId: 10,
                groupId: 1,
                role: "OWNER",
                name: "User Ten"
            }
        ];

        findUniqueStub.resolves({ groupId: 1 });
        membershipFindManyStub.resolves(memberships.map(member => ({ ...member, user: { name: "User Ten" } })));

        assert.deepStrictEqual(await getMembers(1), expectedMemberships);
        assert.strictEqual(membershipFindManyStub.calledOnce, true);
    });

    it("should return an empty list for a group with no members", async function()
    {
        findUniqueStub.resolves({ groupId: 1 });
        membershipFindManyStub.resolves([]);

        assert.deepStrictEqual(await getMembers(1), []);
    });

    it("should return null for an invalid group ID", async function()
    {
        assert.strictEqual(await getMembers(0), null);
        assert.strictEqual(findUniqueStub.called, false);
    });

    it("should return null when the group does not exist", async function()
    {
        findUniqueStub.resolves(null);

        assert.strictEqual(await getMembers(999), null);
        assert.strictEqual(membershipFindManyStub.called, false);
    });

    it("should return null when retrieving members fails", async function()
    {
        findUniqueStub.resolves({ groupId: 1 });
        membershipFindManyStub.rejects(new Error("database error"));

        assert.strictEqual(await getMembers(1), null);
    });
});


// test leaving a group while protecting the owner membership
describe("leaveGroup", function()
{
    beforeEach(function()
    {
        membershipFindUniqueStub.reset();
        membershipDeleteStub.reset();
        transactionStub.reset();

        transactionStub.callsFake(async (callback) => callback({
            groupMembership:
            {
                findUnique: membershipFindUniqueStub,
                delete: membershipDeleteStub
            }
        }));
    });

    it("should allow a MEMBER to leave a group", async function()
    {
        membershipFindUniqueStub.resolves({ membershipId: 1, role: "MEMBER" });
        membershipDeleteStub.resolves({ membershipId: 1 });

        assert.deepStrictEqual(await leaveGroup(1, 20), { success: true });
        assert.strictEqual(membershipDeleteStub.calledOnce, true);
    });

    it("should reject an OWNER leaving a group", async function()
    {
        membershipFindUniqueStub.resolves({ membershipId: 1, role: "OWNER" });

        assert.deepStrictEqual(await leaveGroup(1, 10), {
            success: false,
            reason: "OWNER_CANNOT_LEAVE"
        });
        assert.strictEqual(membershipDeleteStub.called, false);
    });

    it("should reject a user who is not a member", async function()
    {
        membershipFindUniqueStub.resolves(null);

        assert.deepStrictEqual(await leaveGroup(1, 20), {
            success: false,
            reason: "NOT_A_MEMBER"
        });
    });

    it("should reject invalid group or user IDs", async function()
    {
        assert.deepStrictEqual(await leaveGroup(0, 20), {
            success: false,
            reason: "INVALID_REQUEST"
        });
        assert.strictEqual(membershipFindUniqueStub.called, false);
    });

    it("should handle database failures safely", async function()
    {
        membershipFindUniqueStub.rejects(new Error("database error"));

        assert.deepStrictEqual(await leaveGroup(1, 20), {
            success: false,
            reason: "DATABASE_ERROR"
        });
    });
});


// test owner-only removal of another group member
describe("removeMember", function()
{
    beforeEach(function()
    {
        membershipFindUniqueStub.reset();
        membershipDeleteStub.reset();
        transactionStub.reset();

        transactionStub.callsFake(async (callback) => callback({
            groupMembership:
            {
                findUnique: membershipFindUniqueStub,
                delete: membershipDeleteStub
            }
        }));
    });

    it("should allow an OWNER to remove another MEMBER", async function()
    {
        membershipFindUniqueStub.onFirstCall().resolves({ role: "OWNER" });
        membershipFindUniqueStub.onSecondCall().resolves({ role: "MEMBER" });
        membershipDeleteStub.resolves({ membershipId: 2 });

        assert.strictEqual(await removeMember(1, 10, 20), true);
        assert.strictEqual(membershipDeleteStub.calledOnce, true);
    });

    it("should reject a non-owner attempting to remove a member", async function()
    {
        membershipFindUniqueStub.resolves({ role: "MEMBER" });

        assert.strictEqual(await removeMember(1, 20, 30), false);
        assert.strictEqual(membershipDeleteStub.called, false);
    });

    it("should reject an owner attempting to remove themselves", async function()
    {
        assert.strictEqual(await removeMember(1, 10, 10), false);
        assert.strictEqual(membershipFindUniqueStub.called, false);
    });

    it("should reject a target user who is not a member", async function()
    {
        membershipFindUniqueStub.onFirstCall().resolves({ role: "OWNER" });
        membershipFindUniqueStub.onSecondCall().resolves(null);

        assert.strictEqual(await removeMember(1, 10, 20), false);
        assert.strictEqual(membershipDeleteStub.called, false);
    });

    it("should allow an OWNER to remove another OWNER", async function()
    {
        membershipFindUniqueStub.onFirstCall().resolves({ role: "OWNER" });
        membershipFindUniqueStub.onSecondCall().resolves({ role: "OWNER" });
        membershipDeleteStub.resolves({ membershipId: 2 });

        assert.strictEqual(await removeMember(1, 10, 20), true);
        assert.strictEqual(membershipDeleteStub.calledOnce, true);
    });
});


// test owner-only role changes for other group members
describe("updateRole", function()
{
    beforeEach(function()
    {
        membershipFindUniqueStub.reset();
        membershipUpdateStub.reset();
        transactionStub.reset();

        transactionStub.callsFake(async (callback) => callback({
            groupMembership:
            {
                findUnique: membershipFindUniqueStub,
                update: membershipUpdateStub
            }
        }));
    });

    it("should allow an OWNER to promote another member", async function()
    {
        membershipFindUniqueStub.onFirstCall().resolves({ role: "OWNER" });
        membershipFindUniqueStub.onSecondCall().resolves({ role: "MEMBER" });
        membershipUpdateStub.resolves({ membershipId: 2, role: "OWNER" });

        assert.strictEqual(await updateRole(1, 10, 20, "OWNER"), true);
        assert.strictEqual(membershipUpdateStub.calledOnce, true);
    });

    it("should allow an OWNER to change another owner back to MEMBER", async function()
    {
        membershipFindUniqueStub.onFirstCall().resolves({ role: "OWNER" });
        membershipFindUniqueStub.onSecondCall().resolves({ role: "OWNER" });
        membershipUpdateStub.resolves({ membershipId: 2, role: "MEMBER" });

        assert.strictEqual(await updateRole(1, 10, 20, "MEMBER"), true);
        assert.strictEqual(membershipUpdateStub.calledOnce, true);
    });

    it("should reject a member changing another member's role", async function()
    {
        membershipFindUniqueStub.resolves({ role: "MEMBER" });

        assert.strictEqual(await updateRole(1, 20, 30, "OWNER"), false);
        assert.strictEqual(membershipUpdateStub.called, false);
    });

    it("should reject an owner changing their own role", async function()
    {
        assert.strictEqual(await updateRole(1, 10, 10, "MEMBER"), false);
        assert.strictEqual(membershipUpdateStub.called, false);
    });

    it("should reject an invalid target role", async function()
    {
        assert.strictEqual(await updateRole(1, 10, 20, "ADMIN"), false);
        assert.strictEqual(membershipFindUniqueStub.called, false);
    });

    it("should reject a target user who is not a member", async function()
    {
        membershipFindUniqueStub.onFirstCall().resolves({ role: "OWNER" });
        membershipFindUniqueStub.onSecondCall().resolves(null);

        assert.strictEqual(await updateRole(1, 10, 20, "MEMBER"), false);
        assert.strictEqual(membershipUpdateStub.called, false);
    });
});


describe("getGroup", function()
{
    beforeEach(function()
    {
        findUniqueStub.reset();
    });

    // test that an existing group is returned when its group ID is valid
    it("should return a group when the group ID exists", async function()
    {
        const group = {
            groupId: 1,
            name: "Study Group",
            memberships: [
                {
                    membershipId: 1,
                    userId: 10,
                    groupId: 1,
                    joinedAt: new Date("2026-09-20T10:00:00.000Z"),
                    role: "OWNER"
                }
            ]
        };

        findUniqueStub.resolves(group);

        const result = await getGroup(1);

        assert.deepStrictEqual(result, group);
        assert.deepStrictEqual(findUniqueStub.firstCall.args[0], {
            where: { groupId: 1 },
            include: {
                memberships: {
                    select: {
                        membershipId: true,
                        userId: true,
                        groupId: true,
                        joinedAt: true,
                        role: true
                    }
                }
            }
        });
    });

    // test rejecting an invalid group ID
    it("should return null for an invalid group ID", async function()
    {
        const result = await getGroup(0);

        assert.strictEqual(result, null);
        assert.strictEqual(findUniqueStub.called, false);
    });

    // test handling a group that does not exist
    it("should return null when the group does not exist", async function()
    {
        findUniqueStub.resolves(null);

        const result = await getGroup(999);

        assert.strictEqual(result, null);
        assert.strictEqual(findUniqueStub.calledOnce, true);
    });

    // test that a database error is handled safely
    it("should return null when retrieving the group fails", async function()
    {
        findUniqueStub.rejects(new Error("database error"));

        const result = await getGroup(1);

        assert.strictEqual(result, null);
    });
});


describe("updateGroup", function()
{
    beforeEach(function()
        {
            // reset all mocks before each group update test

            findUniqueStub.reset();
            membershipFindUniqueStub.reset();
            membershipCountStub.reset();
            groupUpdateStub.reset();
            transactionStub.reset();

            // simulate the Prisma transaction
            transactionStub.callsFake(async (callback) =>
            {
                return callback({
                    accountabilityGroup:
                    {
                        findUnique: findUniqueStub,
                        update: groupUpdateStub
                    },

                    groupMembership:
                    {
                        findUnique: membershipFindUniqueStub,
                        count: membershipCountStub
                    }
                });
            });
        });

    // test that the owner can successfully update group settings
    it("should update group settings for the group owner", async function()
    {
        findUniqueStub.resolves({
            groupId: 1,
            createdBy: 10
        });

        membershipFindUniqueStub.resolves({
            role: "OWNER"
        });

        groupUpdateStub.resolves({
            groupId: 1,
            name: "Exam Group"
        });

        const result = await updateGroup(
            1,
            10,
            { name: "Exam Group" }
        );

        assert.deepStrictEqual(result, {
            groupId: 1,
            name: "Exam Group"
        });
    });

    // test that invalid group settings are rejected
    it("should return null for invalid group settings", async function()
    {
        const result = await updateGroup(
            1,
            10,
            { name: "" }
        );

        assert.strictEqual(result, null);
        assert.strictEqual(findUniqueStub.called, false);
    });

    // test that non-owners cannot update group settings
    it("should return null when the user is not the group owner", async function()
    {
        findUniqueStub.resolves({
            groupId: 1,
            createdBy: 10
        });

        const result = await updateGroup(
            1,
            20,
            { name: "Exam Group" }
        );

        assert.strictEqual(result, null);
        assert.strictEqual(groupUpdateStub.called, false);
    });

    // test that the new capacity cannot be below current membership
    it("should return null when the new capacity is below current membership", async function()
    {
        findUniqueStub.resolves({
            groupId: 1,
            createdBy: 10
        });

        membershipCountStub.resolves(4);

        const result = await updateGroup(
            1,
            10,
            { maxMembers: 3 }
        );

        assert.strictEqual(result, null);
        assert.strictEqual(groupUpdateStub.called, false);
    });

    // test that database errors are handled safely
    it("should return null when updating the group fails", async function()
    {
        findUniqueStub.resolves({
            groupId: 1,
            createdBy: 10
        });

        groupUpdateStub.rejects(new Error("database error"));

        const result = await updateGroup(
            1,
            10,
            { name: "Exam Group" }
        );

        assert.strictEqual(result, null);
    });
});


describe("deleteGroup", function()
{
    beforeEach(function()
    {
        // reset all mocks before each group deletion test

        findUniqueStub.reset();
        membershipFindUniqueStub.reset();
        membershipDeleteManyStub.reset();
        groupDeleteStub.reset();
        transactionStub.reset();

        // simulate the Prisma transaction
        transactionStub.callsFake(async (callback) =>
        {
            return callback({
                accountabilityGroup:
                {
                    findUnique: findUniqueStub,
                    delete: groupDeleteStub
                },

                groupMembership:
                {
                    findUnique: membershipFindUniqueStub,
                    deleteMany: membershipDeleteManyStub
                }
            });
        });
    });

    // test that the group owner can successfully delete the group
    it("should delete the group and its memberships for the owner", async function()
    {
        findUniqueStub.resolves({
            groupId: 1,
            createdBy: 10
        });

        membershipFindUniqueStub.resolves({
            role: "OWNER"
        });

        membershipDeleteManyStub.resolves({ count: 2 });
        groupDeleteStub.resolves({ groupId: 1 });

        const result = await deleteGroup(1, 10);

        assert.strictEqual(result, true);
        assert.strictEqual(membershipDeleteManyStub.calledOnce, true);
        assert.strictEqual(groupDeleteStub.calledOnce, true);
    });

    // test that non-owners cannot delete the group
    it("should return false when the user is not the group owner", async function()
    {
        findUniqueStub.resolves({
            groupId: 1,
            createdBy: 10
        });

        const result = await deleteGroup(1, 20);

        assert.strictEqual(result, false);
        assert.strictEqual(membershipDeleteManyStub.called, false);
        assert.strictEqual(groupDeleteStub.called, false);
    });

    // test that a nonexistent group cannot be deleted
    it("should return false when the group does not exist", async function()
    {
        findUniqueStub.resolves(null);

        const result = await deleteGroup(999, 10);

        assert.strictEqual(result, false);
        assert.strictEqual(membershipDeleteManyStub.called, false);
        assert.strictEqual(groupDeleteStub.called, false);
    });

    // test that database errors are handled safely
    it("should return false when group deletion fails", async function()
    {
        findUniqueStub.resolves({
            groupId: 1,
            createdBy: 10
        });

        groupDeleteStub.rejects(new Error("database error"));

        const result = await deleteGroup(1, 10);

        assert.strictEqual(result, false);
    });
});


describe("getUserGroups", function()
{
    beforeEach(function()
    {
        membershipFindManyStub.reset();
    });

    // test that all groups belonging to a user are returned
    it("should return all groups for a user", async function()
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

        membershipFindManyStub.resolves(groups);

        const result = await getUserGroups(10);

        assert.deepStrictEqual(result, groups);
        assert.strictEqual(membershipFindManyStub.calledOnce, true);
    });

    // test that a user with no groups receives an empty list
    it("should return an empty list when the user has no groups", async function()
    {
        membershipFindManyStub.resolves([]);

        const result = await getUserGroups(10);

        assert.deepStrictEqual(result, []);
    });

    // test that invalid user IDs are rejected before database access
    it("should return null for an invalid user ID", async function()
    {
        const result = await getUserGroups(0);

        assert.strictEqual(result, null);
        assert.strictEqual(membershipFindManyStub.called, false);
    });
});