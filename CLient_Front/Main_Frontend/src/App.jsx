import MicroGroups from "../../Micro_Groups_Front/src/App";
import HabitManagement from "../../HT_Client_Front/src/App";
import Dashboard from "../../D&A_Front/src/components/dashboard";
import Analytics from "../../D&A_Front/src/components/Analytics";
import Authentication from "../../Auth_Frontend/src/App";
import GroupActivityPage from "../../Notifications_Front/src/GroupActivityPage";
import SocialTab from "../../Notifications_Front/src/SocialTab";
import GlobalMilestoneNotifications from "./GlobalMilestoneNotifications";
import { useEffect, useState } from "react";
import "./App.css";

const pages = ["Dashboard", "Habits", "Groups", "Analytics"];
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function App() {
  const [currentPage, setCurrentPage] = useState(() => sessionStorage.getItem("habitTrackerPage") || "Dashboard");
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(() => Boolean(localStorage.getItem("token")));
  const [activeGroup, setActiveGroup] = useState(null);
  const [myGroups, setMyGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const currentUserId = authenticatedUser?.userId ?? authenticatedUser?.id;
  const showingAuthentication = !authenticatedUser || currentPage === "Profile & Settings";

  useEffect(() => {
    sessionStorage.setItem("habitTrackerPage", currentPage);
  }, [currentPage]);

  // Refresh memberships each time Notifications is opened.
  useEffect(() => {
    if (currentPage !== "Notifications" || !currentUserId) return;

    let cancelled = false;
    setGroupsLoading(true);

    async function loadGroups() {
      try {
        const response = await fetch(`${API_BASE}/api/groups/user/${currentUserId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if (!response.ok) throw new Error("Failed to load groups");

        const memberships = await response.json();
        if (!cancelled) {
          setMyGroups(memberships.filter(m => m.group).map(m => ({
            groupId: m.group.groupId,
            name: m.group.name
          })));
        }
      } catch (error) {
        console.error("Could not load groups:", error);
        if (!cancelled) setMyGroups([]);
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    }

    loadGroups();
    return () => { cancelled = true; };
  }, [currentPage, currentUserId]);

  function handleLogout() {
    setAuthenticatedUser(null);
    setCheckingSession(false);
    sessionStorage.removeItem("habitTrackerPage");
    setCurrentPage("Dashboard");
    setActiveGroup(null);
    setMyGroups([]);
  }

  return (
    <>
      {authenticatedUser && <GlobalMilestoneNotifications key={currentUserId} userId={currentUserId} />}
      {/* Keep Authentication mounted to preserve profile state. */}
      <div style={{ display: showingAuthentication && !checkingSession ? "block" : "none" }}>
        <Authentication
          onAuthenticated={(user) => {
            setAuthenticatedUser(user);
            setCheckingSession(false);
            setCurrentPage(sessionStorage.getItem("habitTrackerPage") || "Dashboard");
            setActiveGroup(null);
          }}
          onLogout={handleLogout}
          onSessionChecked={() => setCheckingSession(false)}
          onBackToDashboard={authenticatedUser ? () => setCurrentPage("Dashboard") : undefined}
        />
      </div>

      {(authenticatedUser || checkingSession) && currentPage !== "Profile & Settings" && (
        <div className="app-shell">
          <header className="site-header">
            <div className="brand" aria-label="HabitTracker home">HabitTracker</div>
            <nav className="main-nav" aria-label="Main navigation">
              {pages.map(page => (
                <button key={page} type="button" className={currentPage === page ? "nav-link active" : "nav-link"}
                  onClick={() => { setCurrentPage(page); setActiveGroup(null); }}
                  aria-current={currentPage === page ? "page" : undefined}>
                  {page}
                </button>
              ))}
            </nav>

            <div className="header-actions">
              <button type="button" className="header-button" aria-label="Notifications"
                onClick={() => { setCurrentPage("Notifications"); setActiveGroup(null); }}>
                Notifications
              </button>
              <button type="button" className="header-button"
                onClick={() => setCurrentPage("Profile & Settings")}>
                Profile
              </button>
            </div>
          </header>

          <main className="page-content">
            {!checkingSession && (currentPage === "Dashboard" ? (
              <Dashboard userId={currentUserId} onNavigate={(page) => {
                const destinations = { dashboard: "Dashboard", habits: "Habits", groups: "Groups", analytics: "Analytics" };
                setCurrentPage(destinations[page] || "Dashboard");
                setActiveGroup(null);
              }} />
            ) : currentPage === "Habits" ? (
              <HabitManagement currentUserId={currentUserId} />
            ) : currentPage === "Groups" ? (
              activeGroup ? (
                <div className="integration-activity-page">
                  <button type="button" className="integration-back-button" onClick={() => setActiveGroup(null)}>
                    &larr; Back to Groups
                  </button>
                  <GroupActivityPage groupId={activeGroup.groupId} groupName={activeGroup.groupName} backHref="#groups" />
                </div>
              ) : (
                <MicroGroups currentUserId={currentUserId}
                  onViewActivity={(group) => setActiveGroup(group)} />
              )
            ) : currentPage === "Analytics" ? (
              <Analytics userId={currentUserId} />
            ) : currentPage === "Notifications" ? (
              groupsLoading ? <p>Loading notifications...</p> :
              <SocialTab groups={myGroups} userId={currentUserId} />
            ) : (
              <>
                <h1>{currentPage}</h1>
                <div className="placeholder"><p>{currentPage} subsystem will be connected here.</p></div>
              </>
            ))}
          </main>
        </div>
      )}
    </>
  );
}

export default App;
