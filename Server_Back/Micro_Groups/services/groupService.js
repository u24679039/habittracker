const crypto = require("crypto");
const prisma = require("../../prisma/client");


// Generate a secure random 6-character invitation code.
function generateInviteCode()
{
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < 6; i++)
    {
        const index = crypto.randomInt(0, characters.length);
        code += characters[index];
    }

    return code;
}


// Generate an invitation code that is not already used.
async function generateUniqueInviteCode()
{
    let code;
    let existingGroup;

    do
    {
        code = generateInviteCode();

        existingGroup = await prisma.accountabilityGroup.findUnique({
            where: { inviteCode: code }
        });
    }
    while (existingGroup);

    return code;
}


// Validate the invitation code format and existence.
async function validateInviteCode(invitationCode)
{
    if (!invitationCode ||
        !/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(invitationCode))
    {
        return false;
    }

    const existingGroup = await prisma.accountabilityGroup.findUnique({
        where: { inviteCode: invitationCode }
    });

    return existingGroup !== null;
}


// Create a group and add its creator as OWNER.
async function createGroup(name, description, maxMembers, creatorId)
{
    if (!name || name.trim() === "" || name.trim().length > 100)
        return false;

    if (!description || description.trim() === "")
        return false;

    if (!Number.isInteger(maxMembers) || maxMembers < 3 || maxMembers > 5)
        return false;

    if (!Number.isInteger(creatorId) || creatorId <= 0)
        return false;

    name = name.trim();
    description = description.trim();

    try
    {
        const inviteCode = await generateUniqueInviteCode();

        return await prisma.$transaction(async (tx) =>
        {
            const group = await tx.accountabilityGroup.create({
                data: {
                    name,
                    description,
                    inviteCode,
                    maxMembers,
                    createdBy: creatorId,
                    isPublic: false,
                    isActive: true
                }
            });

            await tx.groupMembership.create({
                data: {
                    userId: creatorId,
                    groupId: group.groupId,
                    role: "OWNER"
                }
            });

            return {
                groupId: group.groupId,
                inviteCode: group.inviteCode
            };
        });
    }
    catch
    {
        return false;
    }
}


// Check whether a user belongs to a group.
async function isMember(userId, groupId, client = prisma)
{
    if (!Number.isInteger(userId) || userId <= 0 ||
        !Number.isInteger(groupId) || groupId <= 0)
    {
        return false;
    }

    try
    {
        const membership = await client.groupMembership.findUnique({
            where: {
                userId_groupId: { userId, groupId }
            }
        });

        return membership !== null;
    }
    catch
    {
        return false;
    }
}


// Add a user to an active group.
async function addMember(groupId, userId)
{
    if (!Number.isInteger(groupId) || groupId <= 0 ||
        !Number.isInteger(userId) || userId <= 0)
    {
        return false;
    }

    try
    {
        return await prisma.$transaction(async (tx) =>
        {
            const group = await tx.accountabilityGroup.findUnique({
                where: { groupId }
            });

            if (!group || !group.isActive)
                return false;

            if (await isMember(userId, groupId, tx))
                return { success: false, reason: "ALREADY_MEMBER" };

            const memberCount = await tx.groupMembership.count({
                where: { groupId }
            });

            if (memberCount >= group.maxMembers)
                return false;

            await tx.groupMembership.create({
                data: {
                    userId,
                    groupId,
                    role: "MEMBER"
                }
            });

            return { success: true };
        });
    }
    catch
    {
        return false;
    }
}


// Join a group using an invitation code.
async function joinGroup(invitationCode, userId)
{
    if (!await validateInviteCode(invitationCode))
        return false;

    if (!Number.isInteger(userId) || userId <= 0)
        return false;

    try
    {
        const group = await prisma.accountabilityGroup.findUnique({
            where: { inviteCode: invitationCode }
        });

        if (!group)
            return false;

        return await addMember(group.groupId, userId);
    }
    catch
    {
        return false;
    }
}


// Check whether a user is an OWNER of a group.
async function isOwner(userId, groupId, client = prisma)
{
    const membership = await client.groupMembership.findUnique({
        where: {
            userId_groupId: { userId, groupId }
        }
    });

    return membership?.role === "OWNER";
}


// Retrieve the members of a group.
async function getMembers(groupId)
{
    if (!Number.isInteger(groupId) || groupId <= 0)
        return null;

    try
    {
        const group = await prisma.accountabilityGroup.findUnique({
            where: { groupId }
        });

        if (!group)
            return null;

        const mockUserNames = {
            1: "Alex Johnson",
            2: "Jordan Smith",
            3: "Taylor Williams",
            4: "Morgan Brown",
            5: "Casey Davis"
        };

        const memberships = await prisma.groupMembership.findMany({
            where: { groupId },
            select: {
                membershipId: true,
                userId: true,
                groupId: true,
                joinedAt: true,
                role: true
            }
        });

        return memberships.map(member => ({
            ...member,
            name: mockUserNames[member.userId] || `User ${member.userId}`
        }));
    }
    catch
    {
        return null;
    }
}


// Allow a MEMBER to leave a group.
async function leaveGroup(groupId, userId)
{
    if (!Number.isInteger(groupId) || groupId <= 0 ||
        !Number.isInteger(userId) || userId <= 0)
    {
        return { success: false, reason: "INVALID_REQUEST" };
    }

    try
    {
        const membership = await prisma.groupMembership.findUnique({
            where: {
                userId_groupId: { userId, groupId }
            }
        });

        if (!membership)
            return { success: false, reason: "NOT_A_MEMBER" };

        if (membership.role === "OWNER")
            return { success: false, reason: "OWNER_CANNOT_LEAVE" };

        await prisma.groupMembership.delete({
            where: {
                userId_groupId: { userId, groupId }
            }
        });

        return { success: true };
    }
    catch
    {
        return { success: false, reason: "DATABASE_ERROR" };
    }
}


// Allow an OWNER to remove another member.
async function removeMember(groupId, ownerId, memberUserId)
{
    if (!Number.isInteger(groupId) || groupId <= 0 ||
        !Number.isInteger(ownerId) || ownerId <= 0 ||
        !Number.isInteger(memberUserId) || memberUserId <= 0 ||
        ownerId === memberUserId)
    {
        return false;
    }

    try
    {
        if (!await isOwner(ownerId, groupId))
            return false;

        const member = await prisma.groupMembership.findUnique({
            where: {
                userId_groupId: {
                    userId: memberUserId,
                    groupId
                }
            }
        });

        if (!member)
            return false;

        await prisma.groupMembership.delete({
            where: {
                userId_groupId: {
                    userId: memberUserId,
                    groupId
                }
            }
        });

        return true;
    }
    catch
    {
        return false;
    }
}


// Allow an OWNER to change another member's role.
async function updateRole(groupId, ownerId, memberUserId, role)
{
    if (!Number.isInteger(groupId) || groupId <= 0 ||
        !Number.isInteger(ownerId) || ownerId <= 0 ||
        !Number.isInteger(memberUserId) || memberUserId <= 0 ||
        ownerId === memberUserId ||
        !["OWNER", "MEMBER"].includes(role))
    {
        return false;
    }

    try
    {
        if (!await isOwner(ownerId, groupId))
            return false;

        const member = await prisma.groupMembership.findUnique({
            where: {
                userId_groupId: {
                    userId: memberUserId,
                    groupId
                }
            }
        });

        if (!member)
            return false;

        await prisma.groupMembership.update({
            where: {
                userId_groupId: {
                    userId: memberUserId,
                    groupId
                }
            },
            data: { role }
        });

        return true;
    }
    catch
    {
        return false;
    }
}


// Retrieve a group and its memberships.
async function getGroup(groupId)
{
    if (!Number.isInteger(groupId) || groupId <= 0)
        return null;

    try
    {
        return await prisma.accountabilityGroup.findUnique({
            where: { groupId },
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
    }
    catch
    {
        return null;
    }
}


// Update editable group settings.
async function updateGroup(groupId, userId, changes)
{
    if (!Number.isInteger(groupId) || groupId <= 0 ||
        !Number.isInteger(userId) || userId <= 0 ||
        !changes || typeof changes !== "object" ||
        Array.isArray(changes) || Object.keys(changes).length === 0)
    {
        return null;
    }

    const allowedFields = ["name", "description", "maxMembers"];

    if (Object.keys(changes).some(field => !allowedFields.includes(field)))
        return null;

    if (changes.name !== undefined)
    {
        changes.name = changes.name.trim();

        if (!changes.name || changes.name.length > 100)
            return null;
    }

    if (changes.description !== undefined)
    {
        changes.description = changes.description.trim();

        if (!changes.description)
            return null;
    }

    if (changes.maxMembers !== undefined &&
        (!Number.isInteger(changes.maxMembers) ||
         changes.maxMembers < 3 ||
         changes.maxMembers > 5))
    {
        return null;
    }

    try
    {
        return await prisma.$transaction(async (tx) =>
        {
            if (!await isOwner(userId, groupId, tx))
                return null;

            if (changes.maxMembers !== undefined)
            {
                const memberCount = await tx.groupMembership.count({
                    where: { groupId }
                });

                if (changes.maxMembers < memberCount)
                    return null;
            }

            return await tx.accountabilityGroup.update({
                where: { groupId },
                data: changes
            });
        });
    }
    catch
    {
        return null;
    }
}


// Delete a group after verifying OWNER access.
async function deleteGroup(groupId, userId)
{
    if (!Number.isInteger(groupId) || groupId <= 0 ||
        !Number.isInteger(userId) || userId <= 0)
    {
        return false;
    }

    try
    {
        return await prisma.$transaction(async (tx) =>
        {
            if (!await isOwner(userId, groupId, tx))
                return false;

            await tx.groupMembership.deleteMany({
                where: { groupId }
            });

            await tx.accountabilityGroup.delete({
                where: { groupId }
            });

            return true;
        });
    }
    catch
    {
        return false;
    }
}


// Retrieve all groups that a user belongs to.
async function getUserGroups(userId)
{
    if (!Number.isInteger(userId) || userId <= 0)
        return null;

    try
    {
        return await prisma.groupMembership.findMany({
            where: { userId },
            include: { group: true }
        });
    }
    catch
    {
        return null;
    }
}


module.exports =
{
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
};