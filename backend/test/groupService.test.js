const assert = require("assert");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

const findUniqueStub = sinon.stub();
const groupCreateStub = sinon.stub();
const membershipCreateStub = sinon.stub();
const transactionStub = sinon.stub();

// replace the real prisma client with mocked database operations
const prismaMock =
{
    accountabilityGroup:
    {
        findUnique: findUniqueStub,
        create: groupCreateStub
    },

    groupMembership:
    {
        create: membershipCreateStub
    },

    $transaction: transactionStub
};

const {
    generateInviteCode,
    generateUniqueInviteCode,
    validateInviteCode,
    createGroup
} = proxyquire("../services/groupService",
{
    "../prismaClient": prismaMock
});


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
        groupCreateStub.resolves({ groupId: 1 });
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

        assert.strictEqual(result, true);
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