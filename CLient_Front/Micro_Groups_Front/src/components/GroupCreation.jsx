import { useState } from "react";

/***********************************************************************
 * GroupCreation
 *
 * Pop-up modal allowing a user to create an accountability group and
 * displays the generated invitation code after successful creation.
 * Follows the same modal styling as the habits forms.
 ***********************************************************************/
function GroupCreation({ currentUserId, onClose, onSuccess })
{
  const [isCreating, setIsCreating] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
      const response = await fetch("/api/groups", {
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
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-create-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-panel__header">
          <h2 id="group-create-title">Create a Group</h2>
          {onClose && (
            <button
              className="modal-panel__close"
              type="button"
              onClick={onClose}
              disabled={isCreating}
            >
              ×
            </button>
          )}
        </header>

        {invitationCode ? (
          <div className="modal-panel__body form">
            <div className="success-message" role="status" style={{ textAlign: "center", padding: "1.25rem 0" }}>
              <p><strong>Group created successfully.</strong></p>
              <p style={{ marginTop: "0.5rem" }}>Your invitation code is:</p>
              <p
                className="invitation-code"
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  letterSpacing: "3px",
                  margin: "0.75rem 0",
                  color: "var(--olive-deep)",
                }}
              >
                {invitationCode}
              </p>
              <p className="field-help">Share this code with the peers you want to invite.</p>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--primary" onClick={onSuccess || onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-panel__body form">
            <p className="habit-row__desc">
              Create a group and invite your peers to work towards your goals together.
            </p>

            <label className="field" htmlFor="groupName">
              Group Name
              <input id="groupName" name="groupName" maxLength={100} required autoFocus />
            </label>

            <label className="field" htmlFor="description">
              Description
              <textarea id="description" name="description" rows={3} required />
            </label>

            <label className="field" htmlFor="memberLimit">
              Maximum Members
              <select id="memberLimit" name="memberLimit" defaultValue="5">
                <option value="3">3 members</option>
                <option value="4">4 members</option>
                <option value="5">5 members</option>
              </select>
              <span className="field-help">
                Choose how many people can be part of this group.
              </span>
            </label>

            {errorMessage && (
              <div className="form-error" role="alert">{errorMessage}</div>
            )}

            <div className="form-actions">
              {onClose && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={onClose}
                  disabled={isCreating}
                >
                  Cancel
                </button>
              )}
              <button type="submit" className="btn btn--primary" disabled={isCreating}>
                {isCreating ? "Creating Group..." : "Create Group"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default GroupCreation;