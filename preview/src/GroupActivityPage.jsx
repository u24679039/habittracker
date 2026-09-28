// GroupActivityPage.jsx
// My part: Social Activity Feed & Notifications
//
// This represents the screen a user lands on after clicking
// "View full activity ->" from the Groups page (built by Shahd, Micro-
// Group & Invite System). I'm NOT rebuilding that whole Groups page here
// - group creation/joining/membership management is her ticket, not
// mine. This is specifically the destination for that one link: my
// activity feed, given a bit of page context (a group name and a way
// back) so it reads as sitting inside the real app rather than floating
// on a blank page.

import React from "react";
import ActivityFeedLiveDemo from "./ActivityFeedLiveDemo";
import "./GroupActivityPage.css";

/**
 * @param {{groupName?: string}} props
 */
function GroupActivityPage({ groupName = "Alpha Squad" }) {
  return (
    <div className="group-activity-page">
      <a href="#" className="group-activity-page__back">
        ← Back to Groups
      </a>
      <h2 className="group-activity-page__title">{groupName} — Activity</h2>
      <ActivityFeedLiveDemo />
    </div>
  );
}

export default GroupActivityPage;