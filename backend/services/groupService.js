const crypto = require("crypto");
const prisma = require("../prismaClient");

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


// ensure the generated invitation code is unique
async function generateUniqueInviteCode()
{
    let code;
    let existingGroup;

    do
    {
        code = generateInviteCode();

        existingGroup = await prisma.accountabilityGroup.findUnique({
            where: {
                invitationCode: code
            }
        });
    }
    while (existingGroup);

    return code;
}


module.exports =
{
    generateInviteCode,
    generateUniqueInviteCode
};