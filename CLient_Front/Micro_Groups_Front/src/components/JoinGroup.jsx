import { useState } from "react";

/***********************************************************************
 * JoinGroup
 *
 * Pop-up modal allowing a user to join an accountability group using
 * an invitation code and returns to the groups view after a successful join.
 * Follows the same modal styling as the habits forms.
 ***********************************************************************/
function JoinGroup({ currentUserId, onSuccess, onClose })
{
    const [isJoining, setIsJoining] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (event) =>
    {
        event.preventDefault();

        setErrorMessage("");
        setIsJoining(true);

        const form = new FormData(event.currentTarget);

        const joinData = {
            invitationCode: form.get("invitationCode").trim().toUpperCase(),
            userId: currentUserId
        };

        try
        {
            const response = await fetch("/api/groups/join", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(joinData)
            });

            const result = await response.json();

            if (!response.ok)
            {
                setErrorMessage(result.message || "Unable to join group.");
                return;
            }

            setIsSuccess(true);
            setTimeout(() => {
                onSuccess?.();
            }, 800);
        }
        catch
        {
            setErrorMessage("Unable to connect to the server. Please try again.");
        }
        finally
        {
            setIsJoining(false);
        }
    };

    const handleDismiss = onClose || onSuccess;

    return (
        <div className="modal-backdrop" role="presentation" onMouseDown={handleDismiss}>
            <section
                className="modal-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="join-group-title"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <header className="modal-panel__header">
                    <h2 id="join-group-title">Join a Group</h2>
                    {handleDismiss && (
                        <button
                            className="modal-panel__close"
                            type="button"
                            onClick={handleDismiss}
                            disabled={isJoining}
                        >
                            ×
                        </button>
                    )}
                </header>

                {isSuccess ? (
                    <div className="modal-panel__body form">
                        <div
                            className="success-message"
                            role="status"
                            style={{ textAlign: "center", padding: "1.5rem 0" }}
                        >
                            <strong>Group joined successfully.</strong>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="modal-panel__body form">
                        <p className="habit-row__desc">
                            Enter the invitation code shared by your group administrator.
                        </p>

                        <label className="field" htmlFor="invitationCode">
                            Invitation Code
                            <input
                                id="invitationCode"
                                name="invitationCode"
                                maxLength={6}
                                pattern="[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}"
                                placeholder="e.g. KXGW8M"
                                autoComplete="off"
                                required
                                autoFocus
                            />
                        </label>

                        {errorMessage && (
                            <div className="form-error" role="alert">
                                {errorMessage}
                            </div>
                        )}

                        <div className="form-actions">
                            {handleDismiss && (
                                <button
                                    type="button"
                                    className="btn btn--ghost"
                                    onClick={handleDismiss}
                                    disabled={isJoining}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                className="btn btn--primary"
                                disabled={isJoining}
                            >
                                {isJoining ? "Joining Group..." : "Join Group"}
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </div>
    );
}

export default JoinGroup;