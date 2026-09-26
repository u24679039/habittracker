// ActivityFeed.jsx
// My part: Social Activity Feed & Notifications
//
// This handles EH-59: the actual UI that displays a group's shared
// activity feed. It takes a list of feed entries (the exact same shape
// that buildGroupFeed, EH-34, produces) and renders them, most recent
// first, styled differently for milestones vs habit completions.
//
// Note on the import below: feedDisplayHelpers.js is written using
// module.exports so it can be tested with plain Node (see
// test_feedDisplayHelpers.js). Most modern bundlers (Vite, Create React
// App) can import a CommonJS module like this directly, but if the real
// project's bundler complains once this is integrated, the fix is just
// changing that one file's export style - nothing here would need to change.

import React from "react";
import { formatRelativeTime } from "./feedDisplayHelpers";
import "./ActivityFeed.css";

// Default/demo data, shaped exactly like what buildGroupFeed (EH-34)
// returns. This lets the component be viewed and demoed on its own,
// before it's wired up to the real API.
const MOCK_FEED_ENTRIES = [
  {
    type: "milestone",
    userId: 1,
    userName: "Monal",
    message: "🎉 Monal just hit a 7-day streak!",
    timestamp: new Date(),
  },
  {
    type: "habit_completed",
    userId: 2,
    userName: "Shahd",
    message: "Shahd logged Running: 5km",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    type: "habit_completed",
    userId: 3,
    userName: "David",
    message: "David logged Coding practice: 45 mins",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20),
  },
];

/**
 * Renders the shared group activity feed.
 * @param {{entries?: Array}} props - defaults to mock data if none is passed in
 */
function ActivityFeed({ entries = MOCK_FEED_ENTRIES }) {
  if (entries.length === 0) {
    return (
      <p className="activity-feed__empty">
        No activity yet — log a habit to get things started.
      </p>
    );
  }

  return (
    <ul className="activity-feed">
      {entries.map((entry, index) => (
        <li
          key={index}
          className={`activity-feed__item activity-feed__item--${entry.type}`}
        >
          <span className="activity-feed__marker" aria-hidden="true">
            {entry.type === "milestone" ? "🔥" : "✓"}
          </span>
          <div className="activity-feed__content">
            <p className="activity-feed__message">{entry.message}</p>
            <span className="activity-feed__time">
              {formatRelativeTime(entry.timestamp)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default ActivityFeed;