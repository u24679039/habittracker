
import MicroGroups from "../../Micro_Groups_Front/src/App";
import HabitManagement from "../../HT_Client_Front/src/App";
import Dashboard from "../../D&A_Front/src/components/dashboard";
import Analytics from "../../D&A_Front/src/components/Analytics";
import Authentication from "../../Auth_Frontend/src/App";
import GroupActivityPage from "../../Notifications_Front/src/GroupActivityPage";

import { useEffect, useState } from "react";
import "./App.css";

// Shared application shell.
const pages = ["Dashboard", "Habits", "Groups", "Analytics"];

function App() {
  const [currentPage, setCurrentPage] = useState(
    () => sessionStorage.getItem("habitTrackerPage") || "Dashboard"
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(
    () => Boolean(localStorage.getItem("token"))
  );
  const [activeGroup, setActiveGroup] = useState(null);

  useEffect(() => {
    sessionStorage.setItem("habitTrackerPage", currentPage);
  }, [currentPage]);

  const currentUserId = authenticatedUser?.userId ?? authenticatedUser?.id;
  const showingAuthentication =
    !authenticatedUser || currentPage === "Profile & Settings";

  function handleLogout() {
    setAuthenticatedUser(null);
    setCheckingSession(false);
    sessionStorage.removeItem("habitTrackerPage");
    setCurrentPage("Dashboard");
    setActiveGroup(null);
    setNotificationsOpen(false);
  }

  return (
    <>
      {/* Keep Authentication mounted to preserve profile state. */}
      <div style={{
        display: showingAuthentication && !checkingSession ? "block" : "none"
      }}>

      <Authentication
        onAuthenticated={(user) => {
          setAuthenticatedUser(user);
          setCheckingSession(false);
          setCurrentPage(
            sessionStorage.getItem("habitTrackerPage") || "Dashboard"
          );
          setActiveGroup(null);
        }}
        onLogout={handleLogout}
        onSessionChecked={() => setCheckingSession(false)}
        onBackToDashboard={
          authenticatedUser
            ? () => setCurrentPage("Dashboard")
            : undefined
        }
/>
      </div>

      {(authenticatedUser || checkingSession) && currentPage !== "Profile & Settings" && (
        <div className="app-shell">
          <header className="site-header">
            <div className="brand" aria-label="HabitTracker home">
              HabitTracker
            </div>

            <nav className="main-nav" aria-label="Main navigation">
              {pages.map((page) => (
                <button
                  key={page}
                  type="button"
                  className={
                    currentPage === page
                      ? "nav-link active"
                      : "nav-link"
                  }
                  onClick={() => {
                    setCurrentPage(page);
                    setActiveGroup(null);
                    setNotificationsOpen(false);
                  }}
                  aria-current={
                    currentPage === page ? "page" : undefined
                  }
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
                onClick={() =>
                  setNotificationsOpen((open) => !open)
                }
              >
                Notifications
              </button>

              <button
                type="button"
                className="header-button"
                onClick={() => {
                  setCurrentPage("Profile & Settings");
                  setNotificationsOpen(false);
                }}
              >
                Profile
              </button>
            </div>
          </header>

          <main className="page-content">
            {!checkingSession && (currentPage === "Dashboard" ? (
              <Dashboard
                userId={currentUserId}
                onNavigate={(page) => {
                  const destinations = {
                    dashboard: "Dashboard",
                    habits: "Habits",
                    groups: "Groups",
                    analytics: "Analytics",
                  };

                  setCurrentPage(
                    destinations[page] || "Dashboard"
                  );
                  setActiveGroup(null);
                  setNotificationsOpen(false);
                }}
              />
            ) : currentPage === "Habits" ? (
              <HabitManagement currentUserId={currentUserId} />
            ) : currentPage === "Groups" ? (
              activeGroup ? (
                <div className="integration-activity-page">
                  <button
                    type="button"
                    className="integration-back-button"
                    onClick={() => setActiveGroup(null)}
                  >
                  &larr; Back to Groups
                  </button>

                  <GroupActivityPage
                    groupId={activeGroup.groupId}
                    groupName={activeGroup.groupName}
                    backHref="#groups"
                  />
                </div>
              ) : (
                <MicroGroups
                  currentUserId={currentUserId}
                  onViewActivity={(group) => {
                    setActiveGroup(group);
                    setNotificationsOpen(false);
                  }}
                />
              )
            ) : currentPage === "Analytics" ? (
              <Analytics userId={currentUserId} />
            ) : (
              <>
                <h1>{currentPage}</h1>
                <div className="placeholder">
                  <p>
                    {currentPage} subsystem will be connected here.
                  </p>
                </div>
              </>
            )) }
          </main>
        </div>
      )}
    </>
  );
}

export default App;
