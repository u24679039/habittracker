const groupService = require("../services/groupService");

// create an accountability group and return its ID and invitation code
async function createGroup(req, res)
{
    const { name, description, maxMembers, creatorId } = req.body;

    const result = await groupService.createGroup(name, description, maxMembers, creatorId);

    if (!result)
    {
        return res.status(400).json({message: "Group creation failed."});
    }
    else
    {
        return res.status(201).json({
            message: "Group created successfully.",
            groupId: result.groupId,
            invitationCode: result.inviteCode
        });
    }
}

// join an accountability group using a valid invitation code and user ID
async function joinGroup(req, res)
{
    const { invitationCode, userId } = req.body;

    const result = await groupService.joinGroup(invitationCode, userId);

    if (!result)
    {
        return res.status(400).json({message: "Invalid invitation code. Please enter a valid code."});
    }

    if (result.reason === "ALREADY_MEMBER")
    {
        return res.status(400).json({
            message: "You are already a member of this group."
        });
    }

    return res.status(200).json({message: "Group joined successfully."});
}

// retrieve and return an accountability group's details using its ID
async function getGroup(req, res)
{
    // convert the URL parameter from a string to a number
    const groupId = Number(req.params.groupId);

    const result = await groupService.getGroup(groupId);

    if (!result)
    {
        return res.status(404).json({message: "Group not found."});
    }
    else
    {
        return res.status(200).json(result);
    }
}

// retrieve and return the memberships for an accountability group
async function getMembers(req, res)
{
    const groupId = Number(req.params.groupId);

    if (!Number.isInteger(groupId) || groupId <= 0)
    {
        return res.status(400).json({message: "Group members could not be retrieved."});
    }

    const result = await groupService.getMembers(groupId);

    if (!result)
    {
        return res.status(404).json({message: "Group not found."});
    }

    return res.status(200).json(result);
}

// allow a MEMBER to leave a group using the temporary request-body user ID
async function leaveGroup(req, res)
{
    const groupId = Number(req.params.groupId);
    const { userId } = req.body;
    const result = await groupService.leaveGroup(groupId, userId);

    if (!result.success)
    {
        if (result.reason === "OWNER_CANNOT_LEAVE")
        {
            return res.status(403).json({message: "The group owner cannot leave the group."});
        }

        return res.status(400).json({message: "Group leave failed."});
    }

    return res.status(200).json({message: "Group left successfully."});
}

// allow a group OWNER to remove another MEMBER
async function removeMember(req, res)
{
    const groupId = Number(req.params.groupId);
    const memberUserId = Number(req.params.memberUserId);
    const { userId } = req.body;
    const result = await groupService.removeMember(groupId, userId, memberUserId);

    if (!result)
    {
        return res.status(400).json({message: "Group member removal failed."});
    }

    return res.status(200).json({message: "Group member removed successfully."});
}

// allow a group OWNER to update another member's role
async function updateRole(req, res)
{
    const groupId = Number(req.params.groupId);
    const memberUserId = Number(req.params.memberUserId);
    const { userId, role } = req.body;
    const result = await groupService.updateRole(groupId, userId, memberUserId, role);

    if (!result)
    {
        return res.status(400).json({message: "Group member role update failed."});
    }

    return res.status(200).json({message: "Group member role updated successfully."});
}

// update an accountability group's editable settings after validating its ID and owner
async function updateGroup(req, res)
{
    // convert the URL parameter from a string to a number
    const groupId = Number(req.params.groupId);
    const { userId, ...changes } = req.body;

    const result = await groupService.updateGroup(groupId, userId, changes);

    if (!result)
    {
        return res.status(400).json({message: "Group update failed."});
    }
    else
    {
        return res.status(200).json(result);
    }
}

// delete an accountability group after verifying the requesting user is its owner
async function deleteGroup(req, res)
{
    // convert the URL parameter from a string to a number
    const groupId = Number(req.params.groupId);
    const { userId } = req.body;

    const result = await groupService.deleteGroup(groupId, userId);

    if (!result)
    {
        return res.status(400).json({message: "Group deletion failed."});
    }
    else
    {
        return res.status(200).json({message: "Group deleted successfully."});
    }
}

// retrieve and return all accountability groups that a user belongs to
async function getUserGroups(req, res)
{
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0)
    {
        return res.status(400).json({message: "Invalid user ID."});
    }

    const result = await groupService.getUserGroups(userId);

    if (!result)
    {
        return res.status(404).json({message: "No groups found."});
    }

    return res.status(200).json(result);
}

module.exports = {
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
};