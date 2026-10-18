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
 */
function NotificationsMenu({ items = [] }) {
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

  useEffect(() => {
    sessionStorage.setItem("habitTrackerPage", currentPage);
  }, [currentPage]);

  const currentUserId = authenticatedUser?.userId ?? authenticatedUser?.id;
  const showingProfile = currentPage === PROFILE_PAGE;
  // Login/register when signed out; profile + admin when signed in and on Profile.
  const authVisible = !checkingSession && (!authenticatedUser || showingProfile);
  const headerVisible = Boolean(authenticatedUser || checkingSession);

  function handleLogout() {
    setAuthenticatedUser(null);
    setCheckingSession(false);
    sessionStorage.removeItem("habitTrackerPage");
    setCurrentPage("Dashboard");
    setActiveGroup(null);
  }

  function goTo(page) {
    setCurrentPage(page);
    setActiveGroup(null);
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
            <NotificationsMenu />

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
