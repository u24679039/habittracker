import { useState } from "react";
import "./JoinGroup.css";

/***********************************************************************
 * JoinGroup
 *
 * Allows a user to join an accountability group using an invitation
 * code and returns to the groups view after a successful join.
 ***********************************************************************/
function JoinGroup({ currentUserId, onSuccess })
{
    const [isJoining, setIsJoining] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    /***********************************************************************
     * handleSubmit
     *
     * Handles submission of the join group form. It formats the entered
     * invitation code and sends it with the current user's ID to the
     * backend to join the group. On success, it displays a confirmation
     * message and returns to the groups view. Any backend or connection
     * errors are displayed to the user.
     ***********************************************************************/
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
            const response = await fetch("http://localhost:3000/groups/join", {
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
            setTimeout(onSuccess, 1000);
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

    return (
        <main className="join-group-page">
            <section className="join-group-card">

                {isSuccess ? (
                    <div className="success-message" role="status">
                        Group joined successfully.
                    </div>
                ) : (
                    <>
                        <div className="join-group-header">
                            <p className="join-group-label">ACCOUNTABILITY GROUP</p>
                            <h1>Join a Group</h1>
                            <p>Enter the invitation code shared by your group administrator.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="join-group-form">
                            <div className="form-field">
                                <label htmlFor="invitationCode">Invitation Code</label>
                                <input
                                    id="invitationCode"
                                    name="invitationCode"
                                    maxLength={6}
                                    pattern="[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}"
                                    placeholder="e.g. KXGW8M"
                                    autoComplete="off"
                                    required
                                />
                            </div>

                            {errorMessage && (
                                <div className="message error-message" role="alert">
                                    {errorMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="join-group-button"
                                disabled={isJoining}
                            >
                                {isJoining ? "Joining Group..." : "Join Group"}
                            </button>
                        </form>
                    </>
                )}

            </section>
        </main>
    );
}

export default JoinGroup;