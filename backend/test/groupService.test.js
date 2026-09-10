const assert = require("assert");
const { generateInviteCode } = require("../services/groupService");

describe("generateInviteCode", function()
{
    it("should generate a valid 6-character alphanumeric code", function()
    {
        const code = generateInviteCode();

        // check the code length and allowed characters
        assert.strictEqual(code.length, 6);
        assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    });

    it("should generate different codes", function()
    {
        const codes = new Set();

        // generate multiple codes to check that the output varies
        for (let i = 0; i < 100; i++)
        {
            codes.add(generateInviteCode());
        }

        assert(codes.size > 1);
    });
});