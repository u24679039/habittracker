const crypto = require("crypto");

// generate a random 6-character alphanumeric invitation code
function generateInviteCode()
{
    // uppercase alphanumeric characters, excluding I, O, 0 and 1
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++)
    {
        const index = crypto.randomInt(0, characters.length);
        code += characters[index];
    }

    return code;
}

module.exports =
{
    generateInviteCode
};