// App.jsx
import MicroGroups from "../../Micro_Groups_Front/src/App";
import HabitManagement from "../../HT_Client_Front/src/App";
import Dashboard from "../../D&A_Front/src/components/dashboard";
import Analytics from "../../D&A_Front/src/components/Analytics";
import Authentication from "../../Auth_Frontend/src/App";
import GroupActivityPage from "../../Notifications_Front/src/GroupActivityPage";

import { useEffect, useRef, useState } from "react";

// Shared application shell. All styling lives in styles/tokens.css.
const pages = ["Dashboard", "Habits", "Groups", "Analytics"];
const PROFILE_PAGE = "Profile & Settings";

/**
 * Notifications dropdown. Opens on hover (mouse only) or click/tap, and closes
 * on Escape or an outside click. Pass `items` as [{ id, message, time }] once a
 * notification source exists; with none it shows the empty state.
 * Pass `unreadCount` for the count badge, and `onOpen` to clear the unread count
 * when the panel is opened.
 */
function NotificationsMenu({ items = [], unreadCount = 0, onOpen }) {
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef(null);
  const open = hovering || pinned;

  // Only clear unread count once the cursor has stopped hovering / panel closes
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
    } else if (wasOpen.current) {
      wasOpen.current = false;
      onOpen?.();
    }
  }, [open, onOpen]);

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
        {/* Bell SVG icon */}
        <svg
          className="notif__bell-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif__count" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
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

  // --- Fix 1: Notification & Group Activity state ---
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [groupActivities, setGroupActivities] = useState(() => [
    {
      activityId: "init-1",
      message: "Shahd logged Running: 5km",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      activityId: "init-2",
      message: "David logged Coding practice: 45 mins",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    },
  ]);

  /** Adds a group activity and also mirrors it to the global notifications */
  function addGroupActivity(entry) {
    const message = entry.message || (typeof entry === 'string' ? entry : '');
    const timestamp = entry.timestamp instanceof Date ? entry.timestamp.toISOString() : (entry.timestamp || new Date().toISOString());
    setGroupActivities((prev) => [
      { activityId: Date.now() + Math.random(), message, timestamp },
      ...prev,
    ]);
  }

  /** Prepends a new notification and increments the unread counter. */
  function addNotification(message) {
    setNotifications((prev) => [
      { id: Date.now(), message, time: new Date().toLocaleTimeString() },
      ...prev,
    ]);
    setUnreadCount((prev) => prev + 1);
  }

  /** Resets the unread counter when the notification panel is opened. */
  function clearUnread() {
    setUnreadCount(0);
  }

  // --- Fix 2: habitLogCount for reactive Dashboard/Analytics refresh ---
  const [habitLogCount, setHabitLogCount] = useState(0);

  function incrementHabitLogCount() {
    setHabitLogCount((prev) => prev + 1);
  }

  // --- Navigation options (e.g. open CRUD modal, apply filter) ---
  const [habitNavigationOptions, setHabitNavigationOptions] = useState(null);

  useEffect(() => {
    sessionStorage.setItem("habitTrackerPage", currentPage);
  }, [currentPage]);

  const currentUserId = authenticatedUser?.userId ?? authenticatedUser?.id;
  const showingProfile = currentPage === PROFILE_PAGE;
  // Login/register when signed out; profile + admin when signed in and on Profile.
  const authVisible = !checkingSession && (!authenticatedUser || showingProfile);
  const headerVisible = Boolean(authenticatedUser || checkingSession);

  function handleLogout() {
    localStorage.removeItem("token");
    setAuthenticatedUser(null);
    setCheckingSession(false);
    sessionStorage.removeItem("habitTrackerPage");
    setCurrentPage("Dashboard");
    setActiveGroup(null);
  }

  function goTo(page, options = null) {
    setCurrentPage(page);
    setActiveGroup(null);
    if (page === "Habits") {
      setHabitNavigationOptions(options);
    } else {
      setHabitNavigationOptions(null);
    }
  }

  return (
    <div className="app-shell">
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
            <NotificationsMenu
              items={notifications}
              unreadCount={unreadCount}
              onOpen={clearUnread}
            />

            <button
              type="button"
              className={showingProfile ? "header-button active" : "header-button"}
              aria-current={showingProfile ? "page" : undefined}
              aria-label="Profile"
              title="Profile"
              onClick={() => goTo(PROFILE_PAGE)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {authenticatedUser && (
              <button
                type="button"
                className="header-button"
                aria-label="Log out"
                title="Log out"
                onClick={handleLogout}
              >
                Log out
              </button>
            )}
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
            onBackToDashboard={() => goTo("Dashboard")}
            onSessionChecked={() => setCheckingSession(false)}
          />
        </div>

        {authenticatedUser && !checkingSession && !showingProfile && (
          currentPage === "Dashboard" ? (
            <Dashboard
              userId={currentUserId}
              habitLogCount={habitLogCount}
              onHabitLogged={incrementHabitLogCount}
              groupActivities={groupActivities}
              onNavigate={(page, options) => {
                const destinations = {
                  dashboard: "Dashboard",
                  habits: "Habits",
                  groups: "Groups",
                  analytics: "Analytics",
                };
                goTo(destinations[page] || "Dashboard", options);
              }}
            />
          ) : currentPage === "Habits" ? (
            <HabitManagement
              currentUserId={currentUserId}
              onHabitLogged={incrementHabitLogCount}
              navigationOptions={habitNavigationOptions}
              onClearNavigationOptions={() => setHabitNavigationOptions(null)}
            />
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
                  onNotify={addNotification}
                  onActivity={addGroupActivity}
                />
              </div>
            ) : (
              <MicroGroups
                currentUserId={currentUserId}
                onViewActivity={(group) => setActiveGroup(group)}
              />
            )
          ) : currentPage === "Analytics" ? (
            <Analytics userId={currentUserId} habitLogCount={habitLogCount} />
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