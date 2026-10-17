// This is the piece that connects my feed UI to the real backend. It asks
// the API for a group's activity (GET /api/groups/:groupId/feed, served by
// notificationRoutes.js), shows it with ActivityFeed, and re-asks every few
// seconds so new activity appears without a page refresh. That polling is
// how I deliver the "real-time log feed updates" - it's near-real-time
// rather than server push, which would need websockets.
//
// It also hands any brand-new milestone to MilestoneToast so the popup
// fires when somebody hits a streak while the page is open.
//
// If the request fails (server down, group not found) it shows a message
// instead of crashing, and keeps showing the last feed it successfully
// loaded.

import React, { useState, useEffect } from "react";
import ActivityFeed from "./ActivityFeed";
import MilestoneToast from "./MilestoneToast";
import { parseFeedEntries, getRecentMilestones } from "./feedDisplayHelpers";

// Where the backend lives. Can be changed without touching this file by
// setting VITE_API_URL; otherwise it assumes the combined server on 3000.
const DEFAULT_API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Shows the live activity feed for one group.
 * @param {{groupId: number, apiBase?: string, refreshMs?: number}} props
 */
function GroupFeed({ groupId, apiBase = DEFAULT_API_BASE, refreshMs = 10000 }) {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Stops a slow response from updating the screen after this component
    // has gone away (or the group has changed).
    let cancelled = false;

    async function loadFeed() {
      try {
        const response = await fetch(`${apiBase}/api/groups/${groupId}/feed`);

        if (!response.ok) {
          // The backend answers failures with { message: "..." }
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || `Request failed (${response.status})`);
        }

        const data = await response.json();
        if (!cancelled) {
          setEntries(parseFeedEntries(data));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFeed(); // once straight away...
    const timer = setInterval(loadFeed, refreshMs); // ...then on a timer

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [groupId, apiBase, refreshMs]);

  if (loading) {
    return <p className="activity-feed__empty">Loading activity…</p>;
  }

  // Nothing has ever loaded, so there's no feed to fall back on.
  if (error && entries.length === 0) {
    return <p className="activity-feed__empty">Couldn’t load the feed: {error}</p>;
  }

  return (
    <div>
      {error && (
        <p className="activity-feed__empty">
          Couldn’t refresh just now — showing the last update.
        </p>
      )}
      <ActivityFeed entries={entries} />
      <MilestoneToast entries={getRecentMilestones(entries)} />
    </div>
  );
}

export default GroupFeed;