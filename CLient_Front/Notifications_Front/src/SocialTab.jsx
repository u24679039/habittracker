// SocialTab.jsx
// My part: Social Activity Feed & Notifications
//
// EH-74: the "Notifications" tab in the main navigation. This is
// deliberately NOT the group activity feed (that already lives under
// Groups -> View Activity, handled by GroupFeed/GroupActivityPage). This
// tab is personal: it shows the current user's own milestones across every
// group they belong to, which is what the word "notifications" actually
// implies - things that happened TO the user, not a shared group timeline.
//
// It fetches each of the user's groups' feeds and keeps only the milestone
// entries that belong to this user, merged into one list, newest first.
// For a handful of groups this is simple and good enough; if someone ever
// belongs to a lot of groups, a dedicated "my notifications" API endpoint
// would be worth adding instead of fetching every group's feed client-side.

import React, { useState, useEffect } from "react";
import { formatRelativeTime, parseFeedEntries } from "./feedDisplayHelpers";

const DEFAULT_API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * @param {{groups?: Array<{groupId: number, name: string}>, userId: number, apiBase?: string}} props
 *   groups come from the shell (the same list the Groups page uses).
 *   userId is needed to tell "my" milestones apart from everyone else's.
 */
function SocialTab({ groups = [], userId, apiBase = DEFAULT_API_BASE }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      const results = await Promise.all(
        groups.map(async (group) => {
          try {
            const response = await fetch(`${apiBase}/api/groups/${group.groupId}/feed`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            if (!response.ok) return [];
            const data = await response.json();
            return parseFeedEntries(data)
              .map((entry) => ({ ...entry, groupName: group.name }));
          } catch {
            return []; // one group failing shouldn't blank out the others
          }
        })
      );

      if (!cancelled) {
        const seen = new Set();
        const merged = results.flat()
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .filter((entry) => {
            const key = `${entry.groupId || ''}|${entry.userId}|${entry.type}|${entry.message}|${String(entry.timestamp || "")}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        setNotifications(merged);
        setLoading(false);
      }
    }

    if (groups.length > 0) {
      loadNotifications();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [groups, userId, apiBase]);

  // Group notifications by groupName
  const groupedNotifications = notifications.reduce((acc, item) => {
    const groupTitle = item.groupName || "General Updates";
    if (!acc[groupTitle]) {
      acc[groupTitle] = [];
    }
    acc[groupTitle].push(item);
    return acc;
  }, {});

  const groupNames = Object.keys(groupedNotifications);

  return (
    <div className="group-activity-page">
      <h2 className="group-activity-page__title">Notifications</h2>

      {loading ? (
        <p className="activity-feed__empty">Loading…</p>
      ) : notifications.length === 0 ? (
        <p className="activity-feed__empty">
          No milestones yet — keep your streaks going!
        </p>
      ) : (
        <div className="notif-groups-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {groupNames.map((groupName) => (
            <div key={groupName} className="notif-group-card activity-feed-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '10px', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--olive-deep)' }}>{groupName}</h3>
                <span className="badge" style={{ background: 'var(--sage-soft)', color: 'var(--olive)', fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: '999px' }}>
                  {groupedNotifications[groupName].length} {groupedNotifications[groupName].length === 1 ? 'update' : 'updates'}
                </span>
              </div>
              <ul className="activity-feed">
                {groupedNotifications[groupName].map((entry, index) => {
                  const isMilestone = entry.type === "milestone";
                  const isHabit = entry.type === "habit_completed";
                  const avatar = isMilestone ? "🔥" : isHabit ? "✓" : "📣";
                  const badgeText = isMilestone
                    ? "🔥 Milestone"
                    : isHabit
                    ? "✓ Completed"
                    : "Update";

                  return (
                    <li key={index} className={`activity-feed__item activity-feed__item--${entry.type || 'milestone'}`}>
                      <span className="activity-feed__avatar" aria-hidden="true">
                        {avatar}
                      </span>
                      <div className="activity-feed__content">
                        <p className="activity-feed__message">
                          <span className="activity-feed__badge">{badgeText}</span>
                          {entry.message}
                        </p>
                        <span className="activity-feed__time">
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SocialTab;