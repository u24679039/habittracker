// ActivityFeedLiveDemo.jsx
// Not a Jira ticket - for demo
// combines ActivityFeed/EH-59 and MilestoneToast/EH-60
// Shows them updating live when a habit gets logged,
// without needing the real backend running.
//
// NOTE: component fakes update locally, for demo purposes
// uses the same milestone thresholds as the real
// backend so the behaviour matches how it'll actually work once integrated.

import React, { useState } from "react";
import ActivityFeed from "./ActivityFeed";
import MilestoneToast from "./MilestoneToast";

const MILESTONE_THRESHOLDS = [7, 30, 100, 365]; // mirrors milestoneService.js

const INITIAL_ENTRIES = [
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

function ActivityFeedLiveDemo({ onNotify }) {
  const [entries, setEntries] = useState(INITIAL_ENTRIES);
  const [streak, setStreak] = useState(6); // one below a milestone, on purpose

  function simulateCheckIn() {
    const newStreak = streak + 1;
    setStreak(newStreak);

    const newEntries = [
      {
        type: "habit_completed",
        userId: 1,
        userName: "Monal",
        message: "Monal logged Reading: 15 pages",
        timestamp: new Date(),
      },
    ];

    if (MILESTONE_THRESHOLDS.includes(newStreak)) {
      newEntries.push({
        type: "milestone",
        userId: 1,
        userName: "Monal",
        message: `Monal just hit a ${newStreak}-day streak!`,
        timestamp: new Date(),
      });
    }

    // Notify the app shell for each new entry so the bell icon lights up.
    if (onNotify) {
      newEntries.forEach((entry) => onNotify(entry.message));
    }

    // Both the feed AND the toast read from this same "entries" state
    // MilestoneToast automatically picks up the newest milestone entry
    // whenever it appears, via getLatestMilestoneMessage.
    setEntries((previous) => [...newEntries, ...previous]);
  }

  return (
    <div className="activity-feed-demo">
      <button className="activity-feed-demo__button" onClick={simulateCheckIn}>
        Simulate habit logged (current streak: {streak})
      </button>
      <ActivityFeed entries={entries} />
      <MilestoneToast entries={entries} />
    </div>
  );
}

export default ActivityFeedLiveDemo;