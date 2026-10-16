import { useState } from "react";
import "./GroupCreation.css";

/***********************************************************************
 * GroupCreation
 *
 * Allows a user to create an accountability group and displays the
 * generated invitation code after successful creation.
 ***********************************************************************/
function GroupCreation({ currentUserId })
{
  const [isCreating, setIsCreating] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /***********************************************************************
   * handleSubmit
   *
   * Handles submission of the group creation form. It collects and
   * formats the entered group details, sends a request to the backend
   * to create the group, and displays the generated invitation code
   * when the group is created successfully. Any backend or connection
   * errors are displayed to the user.
   ***********************************************************************/
  const handleSubmit = async (event) =>
  {
    event.preventDefault();

    setInvitationCode("");
    setErrorMessage("");
    setIsCreating(true);

    const form = new FormData(event.currentTarget);

    const groupData = {
      name: form.get("groupName").trim(),
      description: form.get("description").trim(),
      maxMembers: Number(form.get("memberLimit")),
      creatorId: currentUserId
    };

    try
    {
      const response = await fetch("http://localhost:3000/groups", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify(groupData)
      });

      const result = await response.json();

      if (!response.ok)
      {
        setErrorMessage(result.message || "Group creation failed.");
        return;
      }

      setInvitationCode(result.invitationCode);
    }
    catch
    {
      setErrorMessage("Unable to connect to the server. Please try again.");
    }
    finally
    {
      setIsCreating(false);
    }
  };

  return (
    <main className="group-creation-page">
      <section className="group-creation-card">

        {invitationCode ? (
          <div className="success-message" role="status">
            <strong>Group created successfully.</strong>
            <span>Your invitation code is:</span>
            <span className="invitation-code">{invitationCode}</span>
            <span>Share this code with the people you want to invite.</span>
          </div>
        ) : (
          <>
            <div className="group-creation-header">
              <p className="group-creation-label">ACCOUNTABILITY GROUP</p>
              <h1>Create a Group</h1>
              <p>Create a group and invite your peers to work towards your goals together.</p>
            </div>

            <form onSubmit={handleSubmit} className="group-creation-form">
              <div className="form-field">
                <label htmlFor="groupName">Group Name</label>
                <input id="groupName" name="groupName" maxLength={100} required />
              </div>

              <div className="form-field">
                <label htmlFor="description">Description</label>
                <textarea id="description" name="description" rows={3} required />
              </div>

              <div className="form-field">
                <label htmlFor="memberLimit">Maximum Members</label>
                <select id="memberLimit" name="memberLimit" defaultValue="5">
                  <option value="3">3 members</option>
                  <option value="4">4 members</option>
                  <option value="5">5 members</option>
                </select>
                <span className="field-help">
                  Choose how many people can be part of this group.
                </span>
              </div>

              {errorMessage && (
                <div className="message error-message" role="alert">{errorMessage}</div>
              )}

              <button type="submit" className="create-group-button" disabled={isCreating}>
                {isCreating ? "Creating Group..." : "Create Group"}
              </button>
            </form>
          </>
        )}

      </section>
    </main>
  );
}

export default GroupCreation;