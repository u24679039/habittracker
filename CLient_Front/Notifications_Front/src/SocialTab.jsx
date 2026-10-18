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

const DEFAULT_API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
            const response = await fetch(`${apiBase}/api/groups/${group.groupId}/feed`);
            if (!response.ok) return [];
            const data = await response.json();
            return parseFeedEntries(data)
              .filter((entry) => entry.type === "milestone" && entry.userId === userId)
              .map((entry) => ({ ...entry, groupName: group.name }));
          } catch {
            return []; // one group failing shouldn't blank out the others
          }
        })
      );

      if (!cancelled) {
        const merged = results.flat().sort((a, b) => b.timestamp - a.timestamp);
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
        <ul className="activity-feed">
          {notifications.map((entry, index) => (
            <li key={index} className="activity-feed__item activity-feed__item--milestone">
              <span className="activity-feed__avatar" aria-hidden="true">
                🔥
              </span>
              <div className="activity-feed__content">
                <p className="activity-feed__message">
                  <span className="activity-feed__badge">🔥 Milestone</span>
                  {entry.message} — {entry.groupName}
                </p>
                <span className="activity-feed__time">
                  {formatRelativeTime(entry.timestamp)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SocialTab;