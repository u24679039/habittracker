// App.jsx
import MicroGroups from "../../Micro_Groups_Front/src/App";
import HabitManagement from "../../HT_Client_Front/src/App";
import Dashboard from "../../D&A_Front/src/components/dashboard";
import Analytics from "../../D&A_Front/src/components/Analytics";
import Authentication from "../../Auth_Frontend/src/App";
import GroupActivityPage from "../../Notifications_Front/src/GroupActivityPage";
import SocialTab from "../../Notifications_Front/src/SocialTab";
import GlobalMilestoneNotifications from "./GlobalMilestoneNotifications";

import { useEffect, useRef, useState } from "react";

// Shared application shell. All styling lives in styles/tokens.css.
const pages = ["Dashboard", "Habits", "Groups", "Analytics"];
const PROFILE_PAGE = "Profile & Settings";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Notifications dropdown. Opens on mouse hover or click/tap and closes on
 * Escape or an outside click. Shows recent milestone notifications from the
 * user's group activity feeds; View all opens Monal's full SocialTab page.
 */
function NotificationsMenu({ items = [], onViewAll }) {
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef(null);
  const open = hovering || pinned;

  useEffect(() => {
    if (!open) return undefined;

    function handleKey(event) {
      if (event.key === "Escape") {
        setHovering(false);
        setPinned(false);
      }
    }
    function handlePointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setHovering(false);
        setPinned(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  return (
    <div
      className="notif"
      ref={ref}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovering(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setHovering(false)}
    >
      <button
        type="button"
        className={open ? "header-button active" : "header-button"}
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setPinned((value) => !value)}
      >
        Notifications
        {items.length > 0 && <span className="notif__dot" aria-hidden="true" />}
      </button>

      {open && (
        <div className="notif__panel">
          <div className="notif__box" role="region" aria-label="Recent notifications">
            <h2 className="notif__title">Notifications</h2>
            {items.length === 0 ? (
              <p className="notif__empty">You have no recent notifications.</p>
            ) : (
              <ul className="notif__list">
                {items.map((item) => (
                  <li className="notif__item" key={item.id}>
                    {item.message}
                    {item.time && <small>{item.time}</small>}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="btn btn--text"
              onClick={() => {
                setHovering(false);
                setPinned(false);
                onViewAll();
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState(
    () => sessionStorage.getItem("habitTrackerPage") || "Dashboard"
  );
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(
    () => Boolean(localStorage.getItem("token"))
  );
  const [activeGroup, setActiveGroup] = useState(null);
  const [myGroups, setMyGroups] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);

  useEffect(() => {
    sessionStorage.setItem("habitTrackerPage", currentPage);
  }, [currentPage]);

  const currentUserId = authenticatedUser?.userId ?? authenticatedUser?.id;
  const showingProfile = currentPage === PROFILE_PAGE;
  // Login/register when signed out; profile + admin when signed in and on Profile.
  const authVisible = !checkingSession && (!authenticatedUser || showingProfile);
  const headerVisible = Boolean(authenticatedUser || checkingSession);

  // Use the existing group feeds as the data source for Monal's milestones.
  useEffect(() => {
    if (!currentUserId || checkingSession) {
      setMyGroups([]);
      setRecentNotifications([]);
      return;
    }

    let cancelled = false;
    async function refreshNotifications() {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      try {
        const membershipsResponse = await fetch(`${API_BASE}/api/groups/user/${currentUserId}`, { headers });
        if (!membershipsResponse.ok) throw new Error("Could not fetch group memberships");
        const memberships = await membershipsResponse.json();
        const groups = memberships.filter((member) => member.group).map((member) => ({
          groupId: member.group.groupId,
          name: member.group.name,
        }));
        if (cancelled) return;
        setMyGroups(groups);
        const responses = await Promise.allSettled(groups.map(async (group) => {
          const response = await fetch(`${API_BASE}/api/groups/${group.groupId}/feed`, { headers });
          if (!response.ok) throw new Error(`Could not fetch activity for group ${group.groupId}`);
          return response.json();
        }));
        if (cancelled) return;
        const activities = responses.flatMap((result) => {
          if (result.status !== "fulfilled") return [];
          const value = result.value;
          return Array.isArray(value) ? value : Array.isArray(value?.entries) ? value.entries : Array.isArray(value?.feed) ? value.feed : Array.isArray(value?.activities) ? value.activities : [];
        });
        const milestones = activities
          .filter((entry) => entry.type === "milestone" && String(entry.userId) === String(currentUserId))
          .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
        const seen = new Set();
        const items = milestones.filter((entry) => {
          const key = `${entry.userId}|${entry.message}|${String(entry.timestamp || entry.createdAt || "").slice(0, 10)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 5).map((entry, index) => ({
          id: `${entry.userId}-${entry.message}-${index}`,
          message: entry.message,
          time: entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : "",
        }));
        setRecentNotifications(items);
      } catch (error) {
        console.error("Notifications unavailable:", error);
        if (!cancelled) setRecentNotifications([]);
      }
    }

    refreshNotifications();
    const interval = setInterval(refreshNotifications, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUserId, checkingSession]);

  function handleLogout() {
    setAuthenticatedUser(null);
    setCheckingSession(false);
    sessionStorage.removeItem("habitTrackerPage");
    setCurrentPage("Dashboard");
    setActiveGroup(null);
    setMyGroups([]);
    setRecentNotifications([]);
  }

  function goTo(page) {
    setCurrentPage(page);
    setActiveGroup(null);
  }

  return (
    <div className="app-shell">
      {authenticatedUser && <GlobalMilestoneNotifications key={currentUserId} userId={currentUserId} />}
      {headerVisible && (
        <header className="site-header">
          <div className="brand" aria-label="HabitTracker home">
            HabitTracker
          </div>

          <nav className="main-nav" aria-label="Main navigation">
            {pages.map((page) => (
              <button
                key={page}
                type="button"
                className={currentPage === page ? "nav-link active" : "nav-link"}
                onClick={() => goTo(page)}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            ))}
          </nav>

          <div className="header-actions">
            <NotificationsMenu items={recentNotifications} onViewAll={() => goTo("Notifications")} />

            <button
              type="button"
              className={showingProfile ? "header-button active" : "header-button"}
              aria-current={showingProfile ? "page" : undefined}
              onClick={() => goTo(PROFILE_PAGE)}
            >
              Profile
            </button>
          </div>
        </header>
      )}

      <main className={authenticatedUser ? "page-content" : "page-content page-content--auth"}>
        {/* Authentication stays mounted so profile state survives page changes. */}
        <div className="auth-slot" hidden={!authVisible}>
          <Authentication
            onAuthenticated={(user) => {
              setAuthenticatedUser(user);
              setCheckingSession(false);
              setCurrentPage(sessionStorage.getItem("habitTrackerPage") || "Dashboard");
              setActiveGroup(null);
            }}
            onLogout={handleLogout}
            onSessionChecked={() => setCheckingSession(false)}
          />
        </div>

        {authenticatedUser && !checkingSession && !showingProfile && (
          currentPage === "Dashboard" ? (
            <Dashboard
              userId={currentUserId}
              onNavigate={(page) => {
                const destinations = {
                  dashboard: "Dashboard",
                  habits: "Habits",
                  groups: "Groups",
                  analytics: "Analytics",
                };
                goTo(destinations[page] || "Dashboard");
              }}
            />
          ) : currentPage === "Habits" ? (
            <HabitManagement currentUserId={currentUserId} />
          ) : currentPage === "Groups" ? (
            activeGroup ? (
              <div className="subpage">
                <button
                  type="button"
                  className="btn btn--text back-link"
                  onClick={() => setActiveGroup(null)}
                >
                  &larr; Back to Groups
                </button>

                <GroupActivityPage
                  groupId={activeGroup.groupId}
                  groupName={activeGroup.groupName}
                />
              </div>
            ) : (
              <MicroGroups
                currentUserId={currentUserId}
                onViewActivity={(group) => setActiveGroup(group)}
              />
            )
          ) : currentPage === "Analytics" ? (
            <Analytics userId={currentUserId} />
          ) : currentPage === "Notifications" ? (
            <div className="subpage">

              <SocialTab groups={myGroups} userId={currentUserId} />
            </div>
          ) : (
            <>
              <h1 className="page-title">{currentPage}</h1>
              <p className="state-message">{currentPage} subsystem will be connected here.</p>
            </>
          )
        )}
      </main>
    </div>
  );
}

export default App;
