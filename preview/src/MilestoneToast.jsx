// MilestoneToast.jsx
// My part: Social Activity Feed & Notifications
//
// This handles EH-60: a small toast/banner that appears when someone
// hits a milestone. It looks through the feed entries for the most
// recent milestone (using getLatestMilestoneMessage) and shows it,
// auto-dismissing after a few seconds, or closeable early.

import React, { useState, useEffect } from "react";
import { getLatestMilestoneMessage } from "./feedDisplayHelpers";
import "./MilestoneToast.css";

/**
 * Shows a temporary toast when a milestone has been hit.
 * @param {{entries?: Array, autoDismissMs?: number}} props
 */
function MilestoneToast({ entries = [], autoDismissMs = 5000 }) {
  const message = getLatestMilestoneMessage(entries);
  const [visible, setVisible] = useState(Boolean(message));

  // Whenever the entries (and therefore the message) change, show the
  // toast again and start a fresh auto-dismiss timer.
  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;

    const timer = setTimeout(() => setVisible(false), autoDismissMs);
    return () => clearTimeout(timer); // clean up if the component disappears early
  }, [message, autoDismissMs]);

  if (!visible || !message) {
    return null; // nothing to show right now
  }

  return (
    <div className="milestone-toast" role="status">
      <span className="milestone-toast__message">{message}</span>
      <button
        className="milestone-toast__close"
        onClick={() => setVisible(false)}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

export default MilestoneToast;