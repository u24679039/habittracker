const crypto = require("crypto");
const prisma = require("../prismaClient");

// generate a random 6-character alphanumeric invitation code
function generateInviteCode()
{
    // use uppercase letters and numbers while excluding ambiguous characters
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    // generate each character using a cryptographically secure random value
    for (let i = 0; i < 6; i++)
    {
        const index = crypto.randomInt(0, characters.length);
        code += characters[index];
    }

    return code;
}

// generate an invitation code and ensure it is not already assigned to a group
async function generateUniqueInviteCode()
{
    let code;
    let existingGroup;

    // keep generating codes until an unused code is found
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

// validate whether an invitation code is valid and belongs to an existing group
async function validateInviteCode(invitationCode)
{
    // reject missing invitation codes
    if (!invitationCode)
    {
        return false;
    }

    // reject codes that do not match the required format
    if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(invitationCode))
    {
        return false;
    }

    // check whether the exact invitation code exists
    const existingGroup = await prisma.accountabilityGroup.findUnique({
        where: {
            invitationCode: invitationCode
        }
    });

    return existingGroup !== null;
}

// create an accountability group and add the creator as the owner
async function createGroup(name, description, maxMembers, creatorId)
{
    // validate the group name
    if (!name || name.trim() === "" || name.trim().length > 100)
    {
        return false;
    }

    // remove unnecessary whitespace from the name
    name = name.trim();

    // validate the group description
    if (!description || description.trim() === "")
    {
        return false;
    }

    // remove unnecessary whitespace from the description
    description = description.trim();

    // validate that the group contains between 3 and 5 members
    if (!Number.isInteger(maxMembers) || maxMembers < 3 || maxMembers > 5)
    {
        return false;
    }

    // validate the creator user ID
    if (!Number.isInteger(creatorId) || creatorId <= 0)
    {
        return false;
    }

    try
    {
        // generate a unique invitation code for the new group
        const invitationCode = await generateUniqueInviteCode();

        // create the group and creator membership atomically
        return await prisma.$transaction(async (tx) =>
        {
            // create the accountability group
            const group = await tx.accountabilityGroup.create({
                data: {
                    name,
                    description,
                    invitationCode,
                    maxMembers,
                    creatorId,
                    isPublic: false,
                    isActive: true
                }
            });

            // add the creator as the group owner
            await tx.groupMembership.create({
                data: {
                    userId: creatorId,
                    groupId: group.groupId,
                    role: "OWNER"
                }
            });

            return true;
        });
    }
    catch (error)
    {
        // return false if any database operation fails
        return false;
    }
}

module.exports =
{
    generateInviteCode,
    generateUniqueInviteCode,
    validateInviteCode,
    createGroup
};