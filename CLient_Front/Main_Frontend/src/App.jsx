import MicroGroups from "../../Micro_Groups_Front/src/App";
import HabitManagement from "../../HT_Client_Front/src/App";
import Dashboard from "../../D&A_Front/src/components/dashboard";
import Analytics from "../../D&A_Front/src/components/Analytics";
import ActivityFeedLiveDemo from "../../Notifications_Front/src/ActivityFeedLiveDemo";
import Authentication from "../../Auth_Frontend/src/App";

import { useState } from "react";
import "./App.css";

// Shared application shell. Subsystem owners replace the page placeholders.
const pages = ["Dashboard", "Habits", "Groups", "Analytics"];

function App() {
  const [currentPage, setCurrentPage] = useState("Dashboard");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const currentUserId = authenticatedUser?.userId ?? authenticatedUser?.id;
  const showingAuthentication = !authenticatedUser || currentPage === "Profile & Settings";

  function handleLogout() {
    setAuthenticatedUser(null);
    setCurrentPage("Dashboard");
    setNotificationsOpen(false);
  }

  return (
    <>
      {/* Keep the authentication component mounted to preserve its profile state. */}
      <div style={{ display: showingAuthentication ? "block" : "none" }}>
        {authenticatedUser && currentPage === "Profile & Settings" && (
          <button type="button" onClick={() => setCurrentPage("Dashboard")}
            style={{ margin: "12px 7%" }}>
            ← Back to Dashboard
          </button>
        )}
        <Authentication
          onAuthenticated={(user) => {
            setAuthenticatedUser(user);
            setCurrentPage("Dashboard");
          }}
          onLogout={handleLogout}
        />
      </div>

      {authenticatedUser && currentPage !== "Profile & Settings" && (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand" aria-label="HabitTracker home">HabitTracker</div>
        <nav className="main-nav" aria-label="Main navigation">
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              className={currentPage === page ? "nav-link active" : "nav-link"}
              onClick={() => {
                setCurrentPage(page);
                setNotificationsOpen(false);
              }}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="header-button"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            Notifications
          </button>
          <button
            type="button"
            className={currentPage === "Profile & Settings" ? "header-button active" : "header-button"}
            onClick={() => {
              setCurrentPage("Profile & Settings");
              setNotificationsOpen(false);
            }}
          >
            Profile
          </button>
        </div>
      </header>

      {notificationsOpen && (
        <aside className="notification-panel" aria-label="Notifications panel">
          <h2>Notifications</h2>
          <ActivityFeedLiveDemo />
        </aside>
      )}

      <main className="page-content">
        {currentPage === "Dashboard" ? (
          <Dashboard
            userId={currentUserId}
            onNavigate={(page) => {
              const destinations = {
                dashboard: "Dashboard",
                habits: "Habits",
                groups: "Groups",
                analytics: "Analytics",
              };
              setCurrentPage(destinations[page] || "Dashboard");
            }}
          />
        ) : currentPage === "Habits" ? (
          <HabitManagement />
        ) : currentPage === "Groups" ? (
          <MicroGroups currentUserId={currentUserId} />
        ) : currentPage === "Analytics" ? (
          <Analytics userId={currentUserId} />
        ) : (
          <>
            <h1>{currentPage}</h1>
            <div className="placeholder">
              <p>{currentPage} subsystem will be connected here.</p>
            </div>
          </>
        )}
      </main>
    </div>
      )}
    </>
  );
}

export default App;
