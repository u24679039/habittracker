import { useEffect, useState } from "react";
import "./App.css";

function App({ onAuthenticated, onLogout }) {
  const [page, setPage] = useState("login");

  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [profile, setProfile] = useState(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: ""
  });

  const [flaggedGroups, setFlaggedGroups] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Restore an existing session after refreshing the shared application.
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) loadProfile(savedToken);
  }, []);

  function handleLoginChange(event) {
    setLoginData({
      ...loginData,
      [event.target.name]: event.target.value
    });
  }

  function handleRegisterChange(event) {
    setRegisterData({
      ...registerData,
      [event.target.name]: event.target.value
    });
  }

  function handleProfileChange(event) {
    setProfileForm({
      ...profileForm,
      [event.target.name]: event.target.value
    });
  }

  // ====================
  // LOGIN
  // ====================

  async function handleLogin(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);

      await loadProfile(data.token);

      setLoginData({
        email: "",
        password: ""
      });
    } catch (error) {
      setMessage(
        "Could not connect to the HabitTracker server."
      );
    }

    setLoading(false);
  }

  // ====================
  // REGISTER
  // ====================

  async function handleRegister(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(registerData)
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Registration failed."
        );

        setLoading(false);
        return;
      }

      setMessage(
        "Registration successful. You can now log in."
      );

      setLoginData({
        email: registerData.email,
        password: ""
      });

      setRegisterData({
        name: "",
        email: "",
        password: ""
      });

      setPage("login");
    } catch (error) {
      setMessage(
        "Could not connect to the HabitTracker server."
      );
    }

    setLoading(false);
  }

  // ====================
  // LOAD PROFILE
  // ====================

  async function loadProfile(token, notifyParent = true) {
    try {
      const response = await fetch("/api/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        localStorage.removeItem("token");

        setMessage(
          data.message || "Could not load profile."
        );

        setPage("login");
        onLogout?.();
        return;
      }

      const authenticatedId = data.user?.userId ?? data.user?.id;
      if (authenticatedId == null) {
        setMessage("The server did not provide a user ID.");
        setPage("login");
        return;
      }

      setProfile(data.user);

      setProfileForm({
        name: data.user.name,
        email: data.user.email
      });

      setMessage("");
      setPage("profile");
      if (notifyParent) onAuthenticated?.(data.user);
    } catch (error) {
      setMessage("Could not load your profile.");
    }
  }

  // ====================
  // UPDATE PROFILE
  // ====================

  async function handleProfileUpdate(event) {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please log in again.");
      setPage("login");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Profile update failed."
        );

        setLoading(false);
        return;
      }

      await loadProfile(token, false);

      setMessage("Profile updated successfully.");
    } catch (error) {
      setMessage("Could not update your profile.");
    }

    setLoading(false);
  }

  // ====================
  // DELETE ACCOUNT
  // ====================

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account?"
    );

    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please log in again.");
      setPage("login");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Account deletion failed."
        );

        setLoading(false);
        return;
      }

      localStorage.removeItem("token");

      setProfile(null);
      setFlaggedGroups([]);

      setProfileForm({
        name: "",
        email: ""
      });

      setPage("login");
      onLogout?.();
      setMessage("Account deleted successfully.");
    } catch (error) {
      setMessage("Could not delete your account.");
    }

    setLoading(false);
  }

  // ====================
  // LOGOUT
  // ====================

  function handleLogout() {
    localStorage.removeItem("token");

    setProfile(null);
    setFlaggedGroups([]);

    setProfileForm({
      name: "",
      email: ""
    });

    setLoginData({
      email: "",
      password: ""
    });

    setMessage("You have been logged out.");
    setPage("login");
    onLogout?.();
  }

  // ====================
  // ADMIN
  // ====================

  async function loadFlaggedGroups() {
    const token = localStorage.getItem("token");

    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/flagged-groups",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Could not load flagged groups."
        );
        return;
      }

      /*
       * adminService may return the array directly
       * or inside a result object.
       */
      if (Array.isArray(data)) {
        setFlaggedGroups(data);
      } else if (Array.isArray(data.groups)) {
        setFlaggedGroups(data.groups);
      } else {
        setFlaggedGroups([]);
      }
    } catch (error) {
      setMessage("Could not load flagged groups.");
    }
  }

  async function handleFlagDemoGroup() {
    const token = localStorage.getItem("token");

    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/groups/1/flag",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            reason: "Inappropriate group content"
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Could not flag group."
        );
        return;
      }

      setMessage("Demo group flagged successfully.");

      await loadFlaggedGroups();
    } catch (error) {
      setMessage("Could not flag the demo group.");
    }
  }

  async function handleReviewGroup(groupId) {
    const token = localStorage.getItem("token");

    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/groups/${groupId}/review`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Could not review group."
        );
        return;
      }

      setMessage("Group reviewed successfully.");

      await loadFlaggedGroups();
    } catch (error) {
      setMessage("Could not review the group.");
    }
  }

  async function handleRemoveGroup(groupId) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this group?"
    );

    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem("token");

    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/groups/${groupId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Could not remove group."
        );
        return;
      }

      setMessage("Group removed successfully.");

      await loadFlaggedGroups();
    } catch (error) {
      setMessage("Could not remove the group.");
    }
  }

  // ====================
  // PROFILE / ADMIN PAGE
  // ====================

  if (page === "profile" && profile) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <div className="dashboard-brand">
            <div className="small-logo">✓</div>

            <div>
              <h1>HabitTracker</h1>
              <span>
                Authentication, Security & Admin
              </span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="dashboard-content">
          <div className="welcome-card">
            <div>
              <p className="welcome-label">
                WELCOME BACK
              </p>

              <h2>{profile.name}</h2>

              <p>
                Manage your HabitTracker account and
                security settings.
              </p>
            </div>

            <div className="role-badge">
              {profile.role}
            </div>
          </div>

          <div className="profile-grid">
            <section className="profile-card">
              <div className="card-heading">
                <div className="card-icon">👤</div>

                <div>
                  <h3>Profile Settings</h3>

                  <p>
                    Update your personal account
                    information.
                  </p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate}>
                <label>Full name</label>

                <input
                  type="text"
                  name="name"
                  value={profileForm.name}
                  onChange={handleProfileChange}
                  required
                />

                <label>Email address</label>

                <input
                  type="email"
                  name="email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                  required
                />

                <button
                  className="primary-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </form>
            </section>

            <section className="account-card">
              <div className="card-heading">
                <div className="card-icon">🔒</div>

                <div>
                  <h3>Account Security</h3>

                  <p>
                    Authentication and authorization
                    information.
                  </p>
                </div>
              </div>

              <div className="account-information">
                <div className="info-row">
                  <span>Account ID</span>
                  <strong>#{profile.id}</strong>
                </div>

                <div className="info-row">
                  <span>Account role</span>
                  <strong>{profile.role}</strong>
                </div>

                <div className="info-row">
                  <span>Authentication</span>
                  <strong>JWT Protected</strong>
                </div>

                <div className="info-row">
                  <span>Password storage</span>
                  <strong>bcrypt Secured</strong>
                </div>
              </div>

              <div className="security-box">
                <strong>
                  🔐 Role-Based Security
                </strong>

                <p>
                  Protected API routes require a valid
                  JWT. Administrator routes also
                  require the ADMIN role.
                </p>
              </div>
            </section>
          </div>

          {profile.role === "ADMIN" && (
            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <p className="admin-label">
                    ADMINISTRATOR
                  </p>

                  <h2>Moderation Panel</h2>

                  <p>
                    Review and manage groups that have
                    been flagged for moderation.
                  </p>
                </div>

                <div className="admin-actions">
                  <button
                    className="secondary-button"
                    onClick={handleFlagDemoGroup}
                  >
                    Flag Demo Group
                  </button>

                  <button
                    className="primary-button"
                    onClick={loadFlaggedGroups}
                  >
                    Refresh Flags
                  </button>
                </div>
              </div>

              <div className="moderation-summary">
                <div>
                  <strong>
                    {flaggedGroups.length}
                  </strong>
                  <span>Flagged Groups</span>
                </div>

                <div>
                  <strong>
                    {
                      flaggedGroups.filter(
                        (group) => group.reviewed
                      ).length
                    }
                  </strong>
                  <span>Reviewed</span>
                </div>

                <div>
                  <strong>
                    {
                      flaggedGroups.filter(
                        (group) => !group.reviewed
                      ).length
                    }
                  </strong>
                  <span>Awaiting Review</span>
                </div>
              </div>

              {flaggedGroups.length === 0 ? (
                <div className="empty-admin-state">
                  <div>✓</div>

                  <h3>No flagged groups loaded</h3>

                  <p>
                    Use "Flag Demo Group" to create a
                    moderation example, or refresh the
                    flagged group list.
                  </p>
                </div>
              ) : (
                <div className="group-list">
                  {flaggedGroups.map((group) => (
                    <div
                      className="group-item"
                      key={group.id}
                    >
                      <div className="group-details">
                        <div className="group-title-row">
                          <h3>{group.name}</h3>

                          <span
                            className={
                              group.reviewed
                                ? "status-reviewed"
                                : "status-pending"
                            }
                          >
                            {group.reviewed
                              ? "REVIEWED"
                              : "PENDING"}
                          </span>
                        </div>

                        <p>
                          <strong>Flag reason:</strong>{" "}
                          {group.flagReason ||
                            "No reason supplied"}
                        </p>

                        <small>
                          Group ID: {group.id}
                        </small>
                      </div>

                      <div className="group-actions">
                        {!group.reviewed && (
                          <button
                            className="review-button"
                            onClick={() =>
                              handleReviewGroup(
                                group.id
                              )
                            }
                          >
                            Mark Reviewed
                          </button>
                        )}

                        <button
                          className="remove-button"
                          onClick={() =>
                            handleRemoveGroup(
                              group.id
                            )
                          }
                        >
                          Remove Group
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {message && (
            <div className="dashboard-message">
              {message}
            </div>
          )}

          <section className="danger-card">
            <div>
              <h3>Delete Account</h3>

              <p>
                Permanently delete your HabitTracker
                account and associated data.
              </p>
            </div>

            <button
              className="delete-button"
              onClick={handleDeleteAccount}
              disabled={loading}
            >
              Delete Account
            </button>
          </section>
        </main>
      </div>
    );
  }

  // ====================
  // LOGIN / REGISTER PAGE
  // ====================

  return (
    <div className="app">
      <div className="auth-container">
        <div className="brand-section">
          <div className="logo">✓</div>

          <h1>HabitTracker</h1>

          <p>
            Build better habits.
            <br />
            Track your progress.
            <br />
            Reach your goals.
          </p>

          <div className="security-note">
            🔒 Secure account authentication
          </div>
        </div>

        <div className="form-section">
          <div className="tabs">
            <button
              className={
                page === "login"
                  ? "active-tab"
                  : ""
              }
              onClick={() => {
                setPage("login");
                setMessage("");
              }}
            >
              Login
            </button>

            <button
              className={
                page === "register"
                  ? "active-tab"
                  : ""
              }
              onClick={() => {
                setPage("register");
                setMessage("");
              }}
            >
              Register
            </button>
          </div>

          {page === "login" ? (
            <>
              <h2>Welcome back</h2>

              <p className="subtitle">
                Sign in to continue to HabitTracker.
              </p>

              <form onSubmit={handleLogin}>
                <label>Email address</label>

                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  required
                />

                <label>Password</label>

                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  required
                />

                <button
                  className="primary-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>Create account</h2>

              <p className="subtitle">
                Start tracking your habits today.
              </p>

              <form onSubmit={handleRegister}>
                <label>Full name</label>

                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={registerData.name}
                  onChange={handleRegisterChange}
                  required
                />

                <label>Email address</label>

                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  required
                />

                <label>Password</label>

                <input
                  type="password"
                  name="password"
                  placeholder="Create a password"
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  required
                />

                <button
                  className="primary-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Creating account..."
                    : "Create account"}
                </button>
              </form>
            </>
          )}

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          <div className="footer-text">
            Authentication, Security & Admin
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;