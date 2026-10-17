import { useEffect, useState } from "react";

/***********************************************************************
 * Groups
 *
 * Displays all accountability groups that the current user belongs to,
 * including each group's details, invitation code, members, and roles.
 * It also provides the appropriate group actions based on whether the
 * current user is an owner or a member.
 ***********************************************************************/
function Groups({
    currentUserId,
    onManageGroup,
    onCreateGroup,
    onJoinGroup,
    onViewActivity
})
{
    const [groups, setGroups] = useState([]);
    const [groupMembers, setGroupMembers] = useState({});
    const [isLoadingGroups, setIsLoadingGroups] = useState(true);
    const [isLeaving, setIsLeaving] = useState(false);
    const [groupsError, setGroupsError] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

    /***********************************************************************
     * loadGroups
     *
     * Retrieves all groups that the current user belongs to and then
     * retrieves the member list for each group. The results are stored
     * in component state for display, while any request failures are
     * reported to the user.
     ***********************************************************************/

    async function loadGroups()
    {
        setIsLoadingGroups(true);
        setGroupsError("");

        try
        {
            const response = await fetch(
                `/api/groups/user/${currentUserId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok)
            {
                setGroupsError(
                    data.message || "Unable to retrieve your groups."
                );
                return;
            }

            setGroups(data);

            const memberResults = await Promise.all(
                data.map(async (membership) =>
                {
                    const groupId = membership.group.groupId;

                    const response = await fetch(
                        `/api/groups/${groupId}/members`,
                        {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem("token")}`
                            }
                        }
                    );

                    const members = await response.json();

                    if (!response.ok)
                    {
                        throw new Error(
                            members.message ||
                            "Unable to retrieve group members."
                        );
                    }

                    return { groupId, members };
                })
            );

            const membersByGroup = {};

            memberResults.forEach(({ groupId, members }) =>
            {
                membersByGroup[groupId] = members;
            });

            setGroupMembers(membersByGroup);
        }
        catch
        {
            setGroupsError(
                "Unable to retrieve your groups. Please try again."
            );
        }
        finally
        {
            setIsLoadingGroups(false);
        }
    }

    useEffect(() =>
    {
        loadGroups();
    }, [currentUserId]);


    async function copyInvitationCode(invitationCode)
    {
        try
        {
            await navigator.clipboard.writeText(invitationCode);
        }
        catch
        {
            // Clipboard access is optional.
        }
    }

    /***********************************************************************
     * leaveGroup
     *
     * Sends a request to remove the current user from the selected group.
     * After a successful request, the user's groups are reloaded so the
     * interface reflects the updated membership. Any backend or connection
     * errors are displayed to the user.
     ***********************************************************************/
    async function leaveGroup(groupId)
    {
        setIsLeaving(true);
        setGroupsError("");

        try
        {
            const response = await fetch(
                `/api/groups/${groupId}/leave`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify({ userId: currentUserId })
                }
            );

            const data = await response.json();

            if (!response.ok)
            {
                setGroupsError(
                    data.message || "Unable to leave the group."
                );
                return;
            }

            await loadGroups();
        }
        catch
        {
            setGroupsError(
                "Unable to connect to the server. Please try again."
            );
        }
        finally
        {
            setIsLeaving(false);
        }
    }

    /***********************************************************************
     * getMemberInitials
     *
     * Generates the text displayed in a member's avatar. The current user
     * is shown as "ME", while other members are represented by initials
     * derived from their names.
     ***********************************************************************/
    function getMemberInitials(member)
    {
        if (member.userId === currentUserId)
            return "ME";

        if (!member.name)
            return "?";

        const names = member.name.trim().split(/\s+/);

        return names.length > 1
            ? names[0][0] + names[names.length - 1][0]
            : names[0][0];
    }

    return (
        <main className="groups-page">

            <div className="groups-header">
                <h2>My Groups</h2>

                <div className="groups-actions">
                    <button
                        type="button"
                        onClick={onJoinGroup}
                    >
                        🔑 Join with code
                    </button>

                    <button
                        type="button"
                        onClick={onCreateGroup}
                    >
                        + Create Group
                    </button>
                </div>
            </div>

            {isLoadingGroups && <p>Loading groups...</p>}

            {groupsError && (
                <p className="groups-error">
                    {groupsError}
                </p>
            )}

            {!isLoadingGroups &&
                !groupsError &&
                groups.length === 0 && (
                    <p>You are not a member of any groups yet.</p>
                )}

            {!isLoadingGroups &&
                !groupsError &&
                groups.length > 0 && (

                    <div className="groups-list">

                        {groups.map((membership) =>
                        {
                            const group = membership.group;

                            const members =
                                groupMembers[group.groupId] || [];

                            const currentMember = members.find(
                                (member) =>
                                    member.userId === currentUserId
                            );

                            const isOwner =
                                currentMember?.role === "OWNER";

                            const isMember =
                                currentMember?.role === "MEMBER";

                            return (
                                <article
                                    key={group.groupId}
                                    className="group-card"
                                >
                                    <div className="group-card-header">
                                        <h3>{group.name}</h3>

                                        <span className="member-count">
                                            <span className="member-count-icon">
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />

                                                    <circle
                                                        cx="9"
                                                        cy="7"
                                                        r="4"
                                                    />

                                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />

                                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                </svg>
                                            </span>

                                            {members.length} /{" "}
                                            {group.maxMembers} members
                                        </span>
                                    </div>

                                    <p className="group-description">
                                        {group.description}
                                    </p>

                                    <div className="group-card-meta">
                                        <div className="group-code-actions">

                                            <span className="invite-code">
                                                Code:{" "}
                                                <strong>
                                                    {group.inviteCode}
                                                </strong>
                                            </span>

                                            <button
                                                type="button"
                                                className="small-action-button"
                                                onClick={() =>
                                                    copyInvitationCode(
                                                        group.inviteCode
                                                    )
                                                }
                                            >
                                                <span className="action-icon">
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        aria-hidden="true"
                                                    >
                                                        <rect
                                                            x="8"
                                                            y="8"
                                                            width="10"
                                                            height="10"
                                                            rx="1"
                                                        />

                                                        <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                    </svg>
                                                </span>

                                                Copy
                                            </button>
                                            
                                            <button
                                                type="button"
                                                className="small-action-button"
                                                onClick={() => onViewActivity?.({
                                                    groupId: group.groupId,
                                                    groupName: group.name
                                                })}
                                            >
                                                View Activity
                                            </button>
                                            
                                            {isOwner && (
                                                <button
                                                    type="button"
                                                    className="small-action-button"
                                                    onClick={() =>
                                                        onManageGroup(
                                                            group.groupId
                                                        )
                                                    }
                                                >
                                                    Manage Group
                                                </button>
                                            )}

                                            {isMember && (
                                                <button
                                                    type="button"
                                                    className="small-action-button"
                                                    disabled={isLeaving}
                                                    onClick={() =>
                                                    {
                                                        setSelectedGroupId(
                                                            group.groupId
                                                        );

                                                        setShowLeaveConfirmation(
                                                            true
                                                        );
                                                    }}
                                                >
                                                    <span className="action-icon">
                                                        ↗
                                                    </span>

                                                    {isLeaving
                                                        ? "Leaving..."
                                                        : "Leave"}
                                                </button>
                                            )}

                                        </div>
                                    </div>

                                    <div className="group-card-content">
                                        <div className="group-members">

                                            {members.map((member) => (
                                                <div
                                                    key={member.userId}
                                                    className="group-member"
                                                >
                                                    <div className="member-avatar">
                                                        {getMemberInitials(
                                                            member
                                                        )}
                                                    </div>

                                                    <span className="member-name">
                                                        {member.userId ===
                                                        currentUserId
                                                            ? "You"
                                                            : member.name}
                                                    </span>

                                                    <span className="member-role">
                                                        {member.role}
                                                    </span>
                                                </div>
                                            ))}

                                        </div>
                                    </div>
                                </article>
                            );
                        })}

                    </div>
                )}

            {showLeaveConfirmation && (
                <div className="leave-confirmation-overlay">
                    <div className="leave-confirmation-modal">

                        <h2>Leave Group</h2>

                        <p>
                            Are you sure you want to leave this group?
                        </p>

                        <div className="leave-confirmation-actions">
                            <button
                                type="button"
                                className="cancel-leave-button"
                                onClick={() =>
                                    setShowLeaveConfirmation(false)
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="confirm-leave-button"
                                onClick={() =>
                                {
                                    setShowLeaveConfirmation(false);
                                    leaveGroup(selectedGroupId);
                                }}
                            >
                                Leave
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </main>
    );
}

export default Groups;