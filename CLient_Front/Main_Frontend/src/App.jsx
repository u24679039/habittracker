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
import { formatRelativeTime } from "../../Notifications_Front/src/feedDisplayHelpers";

// Shared application shell. All styling lives in styles/tokens.css.
const pages = ["Dashboard", "Habits", "Groups", "Analytics"];
const PROFILE_PAGE = "Profile & Settings";
const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * Notifications dropdown. Opens on hover (mouse only) or click/tap, and closes
 * on Escape or an outside click. Pass `items` as [{ id, message, time }]; with
 * none it shows the empty state. Pass `unreadCount` for the count badge, and
 * `onOpen` to clear the unread count once the panel has been opened and closed.
 * `onViewAll` opens the full SocialTab notifications page.
 */
function NotificationsMenu({ items = [], unreadCount = 0, onOpen, onViewAll }) {
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
            <div className="notif__header">
              <h2 className="notif__title">Notifications</h2>
              {onViewAll && (
                <button
                  type="button"
                  className="notif__view-all"
                  onClick={() => {
                    setHovering(false);
                    setPinned(false);
                    onViewAll();
                  }}
                >
                  View all notifications
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="notif__empty">You have no recent notifications.</p>
            ) : (
              <div className="notif__content-scroll" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {(() => {
                  const hasGroups = items.some((item) => item.groupName);
                  if (!hasGroups) {
                    return (
                      <ul className="notif__list">
                        {items.map((item) => (
                          <li className="notif__item" key={item.id}>
                            {item.message}
                            {item.time && <small>{item.time}</small>}
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  // Group by groupName
                  const groupsMap = items.reduce((acc, item) => {
                    const g = item.groupName || "General";
                    if (!acc[g]) acc[g] = [];
                    acc[g].push(item);
                    return acc;
                  }, {});

                  return Object.entries(groupsMap).map(([gName, gItems]) => (
                    <div key={gName} className="notif__group-section" style={{ borderBottom: '1px solid var(--line)' }}>
                      <div style={{ padding: '8px 16px', background: 'var(--surface-sunken)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--olive)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {gName}
                      </div>
                      <ul className="notif__list">
                        {gItems.map((item) => (
                          <li className="notif__item" key={item.id}>
                            {item.message}
                            {item.time && <small>{item.time}</small>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ));
                })()}
              </div>
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

  // Groups + milestone notifications fetched from the group feeds (Monal's SocialTab data)
  const [myGroups, setMyGroups] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);

  // --- Fix 1: Notification & Group Activity state ---
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [groupActivities, setGroupActivities] = useState([]);

  /** Helper to load read notification IDs from localStorage */
  function getReadKeys(userId) {
    if (!userId) return new Set();
    try {
      const stored = localStorage.getItem(`read_notifs_${userId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }

  /** Helper to save read notification IDs to localStorage */
  function saveReadKeys(userId, keysSet) {
    if (!userId) return;
    try {
      // Keep only up to the latest 100 read keys to avoid storage bloat
      const arr = Array.from(keysSet).slice(-100);
      localStorage.setItem(`read_notifs_${userId}`, JSON.stringify(arr));
    } catch {
      // Ignore localStorage errors
    }
  }

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

  /** Resets the unread counter and marks all current notifications as read when the panel is opened. */
  function clearUnread() {
    setUnreadCount(0);
    if (currentUserId && seenNotificationKeysRef.current) {
      saveReadKeys(currentUserId, seenNotificationKeysRef.current);
    }
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

  // Keep track of seen notification keys to know when new ones arrive
  const seenNotificationKeysRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);

  // Use the existing group feeds as the data source for notifications.
  // Re-runs periodically (10s) and when a habit is logged so new activities appear straight away.
  useEffect(() => {
    if (!currentUserId || checkingSession) {
      setMyGroups([]);
      setRecentNotifications([]);
      setUnreadCount(0);
      seenNotificationKeysRef.current.clear();
      initialLoadDoneRef.current = false;
      return;
    }

    // Load previously marked-as-read notification keys for this user
    const readKeys = getReadKeys(currentUserId);
    seenNotificationKeysRef.current = new Set(readKeys);

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

        const activities = responses.flatMap((result, idx) => {
          if (result.status !== "fulfilled") return [];
          const value = result.value;
          const groupName = groups[idx]?.name || "Group";
          const list = Array.isArray(value)
            ? value
            : Array.isArray(value?.entries)
            ? value.entries
            : Array.isArray(value?.feed)
            ? value.feed
            : Array.isArray(value?.activities)
            ? value.activities
            : [];
          return list.map((item) => ({ ...item, groupName }));
        });

        // Sort newest first
        activities.sort(
          (a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
        );

        const seenInBatch = new Set();
        const uniqueItems = [];
        let newEntriesCount = 0;

        for (const entry of activities) {
          const key = `${entry.groupId || ''}|${entry.userId}|${entry.type}|${entry.message}|${String(entry.timestamp || entry.createdAt || '')}`;
          if (seenInBatch.has(key)) continue;
          seenInBatch.add(key);

          // Check if this is a newly arrived unread notification
          if (!seenNotificationKeysRef.current.has(key)) {
            newEntriesCount += 1;
            // Trigger a global notification for this new activity
            addNotification(entry.message);
          }

          const timeDate = entry.timestamp || entry.createdAt ? new Date(entry.timestamp || entry.createdAt) : null;
          const timeFormatted = timeDate && !isNaN(timeDate.getTime())
            ? formatRelativeTime(timeDate)
            : "";

          uniqueItems.push({
            id: key,
            message: entry.message,
            groupName: entry.groupName || "Group",
            time: timeFormatted,
            rawDate: timeDate,
          });
        }

        if (!initialLoadDoneRef.current) {
          initialLoadDoneRef.current = true;
          // On first load, only count notifications that have never been read
          setUnreadCount(newEntriesCount);
        } else if (newEntriesCount > 0) {
          // Increment unread count as new notifications arrive
          setUnreadCount((prev) => prev + newEntriesCount);
        }

        // Record all received keys in our active session set
        for (const item of uniqueItems) {
          seenNotificationKeysRef.current.add(item.id);
        }

        setRecentNotifications(uniqueItems.slice(0, 15));
      } catch (error) {
        console.error("Notifications unavailable:", error);
        if (!cancelled) setRecentNotifications([]);
      }
    }

    refreshNotifications();
    const interval = setInterval(refreshNotifications, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUserId, checkingSession, habitLogCount]);

  // Combined notifications: local simulation / in-session events + group feed items
  const menuItems = [...notifications, ...recentNotifications].slice(0, 15);

  function handleLogout() {
    localStorage.removeItem("token");
    setAuthenticatedUser(null);
    setCheckingSession(false);
    sessionStorage.removeItem("habitTrackerPage");
    setCurrentPage("Dashboard");
    setActiveGroup(null);
    setMyGroups([]);
    setRecentNotifications([]);
    setNotifications([]);
    setUnreadCount(0);
    seenNotificationKeysRef.current.clear();
    initialLoadDoneRef.current = false;
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
            <NotificationsMenu
              items={menuItems}
              unreadCount={unreadCount}
              onOpen={clearUnread}
              onViewAll={() => goTo("Notifications")}
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
            loggedOut={!authenticatedUser}
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
              habitLogCount={habitLogCount}
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
