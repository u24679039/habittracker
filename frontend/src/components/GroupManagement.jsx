import { useEffect, useState } from "react";
import "./GroupManagement.css";

/***********************************************************************
 * GroupManagement
 *
 * Displays the selected accountability group's details and manages
 * group settings, members, roles, and group actions.
 ***********************************************************************/
function GroupManagement({ groupId, currentUserId, onDelete })
{
    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [actionMessage, setActionMessage] = useState("");
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

    /***********************************************************************
     * loadGroup
     *
     * Retrieves the selected group's details and member list from the
     * backend and stores them in component state for display. Any backend
     * or connection errors are displayed to the user.
     ***********************************************************************/
    const loadGroup = async () =>
    {
        setIsLoading(true);
        setErrorMessage("");

        try
        {
            const groupResponse = await fetch(
                `http://localhost:3000/groups/${groupId}`
            );
            const groupData = await groupResponse.json();

            if (!groupResponse.ok)
            {
                setErrorMessage(groupData.message || "Unable to load the group.");
                return;
            }

            const membersResponse = await fetch(
                `http://localhost:3000/groups/${groupId}/members`
            );
            const membersData = await membersResponse.json();

            if (!membersResponse.ok)
            {
                setErrorMessage(
                    membersData.message || "Unable to load group members."
                );
                return;
            }

            setGroup(groupData);
            setMembers(membersData);
        }
        catch
        {
            setErrorMessage("Unable to connect to the server. Please try again.");
        }
        finally
        {
            setIsLoading(false);
        }
    };

    /***********************************************************************
     * saveSettings
     *
     * Handles submission of the group settings form. It sends the updated
     * group name, description, and member limit to the backend and updates
     * the displayed group information after a successful request. Any
     * backend or connection errors are displayed to the user.
     ***********************************************************************/
    const saveSettings = async (event) =>
    {
        event.preventDefault();

        setIsSaving(true);
        setActionMessage("");
        setErrorMessage("");

        const form = new FormData(event.currentTarget);

        try
        {
            const response = await fetch(
                `http://localhost:3000/groups/${groupId}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: currentUserId,
                        name: form.get("groupName").trim(),
                        description: form.get("description").trim(),
                        maxMembers: Number(form.get("maxMembers"))
                    })
                }
            );

            const data = await response.json();

            if (!response.ok)
            {
                setErrorMessage(
                    data.message || "Unable to update group settings."
                );
                return;
            }

            setGroup((currentGroup) => ({ ...currentGroup, ...data }));
            setActionMessage("Group settings updated successfully.");
            setIsEditing(false);

            setTimeout(() => setActionMessage(""), 2000);
        }
        catch
        {
            setErrorMessage("Unable to connect to the server. Please try again.");
        }
        finally
        {
            setIsSaving(false);
        }
    };

    /***********************************************************************
     * deleteGroup
     *
     * Sends a request to permanently delete the selected group using the
     * current user's ID. On success, it calls the provided onDelete
     * function to return the user to the groups view. Any backend or
     * connection errors are displayed to the user.
     ***********************************************************************/
    const deleteGroup = async () =>
    {
        setIsDeleting(true);
        setActionMessage("");
        setErrorMessage("");

        try
        {
            const response = await fetch(
                `http://localhost:3000/groups/${groupId}`,
                {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: currentUserId })
                }
            );

            const data = await response.json();

            if (!response.ok)
            {
                setErrorMessage(data.message || "Unable to delete the group.");
                return;
            }

            onDelete();
        }
        catch
        {
            setErrorMessage("Unable to connect to the server. Please try again.");
        }
        finally
        {
            setIsDeleting(false);
        }
    };

    /***********************************************************************
     * removeMember
     *
     * Requests confirmation before sending a request to remove the selected
     * member from the group. After a successful removal, the group data is
     * reloaded so that the displayed member list is updated. Any backend
     * or connection errors are displayed to the user.
     ***********************************************************************/
    const removeMember = async (memberUserId) =>
    {
        if (!window.confirm("Are you sure you want to remove this member?"))
            return;

        setActionMessage("");
        setErrorMessage("");

        try
        {
            const response = await fetch(
                `http://localhost:3000/groups/${groupId}/members/${memberUserId}`,
                {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: currentUserId })
                }
            );

            const data = await response.json();

            if (!response.ok)
            {
                setErrorMessage(data.message || "Unable to remove the member.");
                return;
            }

            setActionMessage("Member removed successfully.");
            setTimeout(() =>
            {
                setActionMessage("");
            }, 2000);
            await loadGroup();
        }
        catch
        {
            setErrorMessage("Unable to connect to the server. Please try again.");
        }
    };

    /***********************************************************************
     * updateRole
     *
     * Sends the selected member's new role to the backend. After a
     * successful role change, a confirmation message is displayed and the
     * group data is reloaded so that the updated roles are shown. Any
     * backend or connection errors are displayed to the user.
     ***********************************************************************/
    const updateRole = async (memberUserId, role) =>
    {
        setActionMessage("");
        setErrorMessage("");

        try
        {
            const response = await fetch(
                `http://localhost:3000/groups/${groupId}/members/${memberUserId}/role`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: currentUserId,
                        role
                    })
                }
            );

            const data = await response.json();

            if (!response.ok)
            {
                setErrorMessage(
                    data.message || "Unable to update the member role."
                );
                return;
            }

            setActionMessage("Role updated successfully.");
            setTimeout(() => setActionMessage(""), 2000);
            await loadGroup();
        }
        catch
        {
            setErrorMessage("Unable to connect to the server. Please try again.");
        }
    };

    useEffect(() =>
    {
        if (groupId)
            loadGroup();
    }, [groupId]);

    if (isLoading)
    {
        return (
            <main className="group-management-page">
                <section className="group-management-card">
                    <p>Loading group...</p>
                </section>
            </main>
        );
    }

    if (errorMessage && !group)
    {
        return (
            <main className="group-management-page">
                <section className="group-management-card">
                    <div className="message error-message" role="alert">
                        {errorMessage}
                    </div>
                </section>
            </main>
        );
    }

    if (!group)
    {
        return (
            <main className="group-management-page">
                <section className="group-management-card">
                    <div className="message error-message" role="alert">
                        Group could not be found.
                    </div>
                </section>
            </main>
        );
    }

    const currentMember = members.find(
        (member) => member.userId === currentUserId
    );
    const isOwner = currentMember?.role === "OWNER";

    return (
        <main className="group-management-page">
            <section className="group-management-card">

                <div className="group-management-header">
                    <p className="group-management-label">ACCOUNTABILITY GROUP</p>
                    <h1>{group.name}</h1>
                    <p>{group.description}</p>
                </div>

                {errorMessage && (
                    <div className="message error-message" role="alert">
                        {errorMessage}
                    </div>
                )}

                {actionMessage && (
                    <div className="success-toast" role="status">
                        {actionMessage}
                    </div>
                )}

                <div className="group-details">
                    <div className="group-detail">
                        <span className="detail-label">Members</span>
                        <span>{members.length} / {group.maxMembers}</span>
                    </div>

                    <div className="group-detail">
                        <span className="detail-label">Invitation Code</span>
                        <span>{group.invitationCode}</span>
                    </div>
                </div>

                <div className="member-section">
                    <h2>Members</h2>

                    <div className="member-list">
                        {members.map((member) => (
                            <div className="member-card" key={member.userId}>
                                <div className="member-information">
                                    <strong>{member.name}</strong>
                                    <span className={
                                        member.role === "OWNER"
                                            ? "member-role owner-role"
                                            : "member-role"
                                    }>
                                        {member.role}
                                    </span>
                                </div>

                                {isOwner && member.userId !== currentUserId && (
                                    <div className="member-actions">
                                        <button
                                            type="button"
                                            className="role-button"
                                            onClick={() => updateRole(
                                                member.userId,
                                                member.role === "OWNER"
                                                    ? "MEMBER"
                                                    : "OWNER"
                                            )}
                                        >
                                            {member.role === "OWNER"
                                                ? "Make member"
                                                : "Make owner"}
                                        </button>

                                        <button
                                            type="button"
                                            className="remove-member-button"
                                            onClick={() => removeMember(member.userId)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {isOwner && (
                    <div className="group-actions">
                        <button
                            type="button"
                            className="edit-group-button"
                            onClick={() =>
                            {
                                setErrorMessage("");
                                setActionMessage("");
                                setIsEditing(true);
                            }}
                        >
                            Edit Group
                        </button>

                        <button
                            type="button"
                            className="delete-group-button"
                            onClick={() => setShowDeleteConfirmation(true)}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting Group..." : "Delete Group"}
                        </button>
                    </div>
                )}

                {isEditing && (
                    <div className="group-settings-overlay">
                        <form
                            className="group-settings-modal"
                            onSubmit={saveSettings}
                        >
                            <div className="group-settings-header">
                                <div>
                                    <h3>Group Settings</h3>
                                    <p>
                                        Update your group's details and member limit.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="group-settings-close"
                                    onClick={() => setIsEditing(false)}
                                    aria-label="Close group settings"
                                >
                                    ×
                                </button>
                            </div>

                            {errorMessage && (
                                <div className="message error-message" role="alert">
                                    {errorMessage}
                                </div>
                            )}

                            <div className="group-settings-field">
                                <label htmlFor="group-name">Group name</label>
                                <input
                                    id="group-name"
                                    name="groupName"
                                    defaultValue={group.name}
                                    maxLength={100}
                                    required
                                />
                            </div>

                            <div className="group-settings-field">
                                <label htmlFor="group-description">Description</label>
                                <textarea
                                    id="group-description"
                                    name="description"
                                    defaultValue={group.description}
                                    required
                                />
                            </div>

                            <div className="group-settings-field">
                                <label htmlFor="max-members">Maximum members</label>
                                <select
                                    id="max-members"
                                    name="maxMembers"
                                    defaultValue={group.maxMembers}
                                >
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                </select>
                            </div>

                            <div className="group-settings-actions">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>

                                <button type="submit" disabled={isSaving}>
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {showDeleteConfirmation && (
                    <div className="delete-confirmation-overlay">
                        <div className="delete-confirmation-modal">
                            <h2>Delete Group</h2>
                            <p>Are you sure you want to delete this group?</p>

                            <div className="delete-confirmation-actions">
                                <button
                                    type="button"
                                    className="cancel-delete-button"
                                    onClick={() => setShowDeleteConfirmation(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="confirm-delete-button"
                                    onClick={() =>
                                    {
                                        setShowDeleteConfirmation(false);
                                        deleteGroup();
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </section>
        </main>
    );
}

export default GroupManagement;