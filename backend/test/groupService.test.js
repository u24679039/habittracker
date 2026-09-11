const assert = require("assert");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

const findUniqueStub = sinon.stub();

const prismaMock =
{
    accountabilityGroup:
    {
        findUnique: findUniqueStub
    }
};

const {
    generateInviteCode,
    generateUniqueInviteCode,
    validateInviteCode
} = proxyquire("../services/groupService",
{
    "../prismaClient": prismaMock
});


describe("generateInviteCode", function()
{
    it("should generate a valid 6-character alphanumeric code", function()
    {
        const code = generateInviteCode();

        assert.strictEqual(code.length, 6);
        assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    });

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

    it("should generate another code if the generated code already exists", async function()
    {
        const existingGroup = { groupId: 1 };
        const noGroup = null;

        // simulate a collision, then no collision
        findUniqueStub.onFirstCall().resolves(existingGroup);
        findUniqueStub.onSecondCall().resolves(noGroup);

        const code = await generateUniqueInviteCode();

        assert.strictEqual(findUniqueStub.callCount, 2);
        assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    });

    it("should return the generated code if it does not already exist", async function()
    {
        const noGroup = null;

        // simulate a code that does not exist
        findUniqueStub.resolves(noGroup);

        const code = await generateUniqueInviteCode();

        assert.strictEqual(findUniqueStub.callCount, 1);
        assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    });
});



// test invitation code validation
describe("validateInviteCode", function()
{
    beforeEach(function()
    {
        findUniqueStub.reset();
    });

    it("should return true for an existing invitation code", async function()
    {
        // simulate an existing group
        findUniqueStub.resolves({ groupId: 1 });

        const result = await validateInviteCode("GRP234");

        assert.strictEqual(result, true);
        assert.strictEqual(findUniqueStub.callCount, 1);
    });

    it("should return false for a non-existing invitation code", async function()
    {
        // simulate no matching group
        findUniqueStub.resolves(null);

        const result = await validateInviteCode("ABC234");

        assert.strictEqual(result, false);
        assert.strictEqual(findUniqueStub.callCount, 1);
    });

    it("should return false for an invalid invitation code format", async function()
    {
        const result = await validateInviteCode("INVALID");

        assert.strictEqual(result, false);
        assert.strictEqual(findUniqueStub.callCount, 0);
    });

    it("should return false when no invitation code is provided", async function()
    {
        const result = await validateInviteCode("");

        assert.strictEqual(result, false);
        assert.strictEqual(findUniqueStub.callCount, 0);
    });
});