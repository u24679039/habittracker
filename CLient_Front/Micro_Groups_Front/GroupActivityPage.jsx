// Destination for "View activity" on a group card: the group's activity feed.
// The "Back to Groups" control is provided by the app shell, so it is not
// repeated here. Styling lives in Main_Frontend/src/styles/tokens.css.

import React from "react";
import ActivityFeedLiveDemo from "./ActivityFeedLiveDemo";

/**
 * @param {{groupName?: string, groupId?: any, onNotify?: (message: string) => void}} props
 */
function GroupActivityPage({ groupName = "Alpha Squad", groupId, onNotify }) {
  return (
    <div className="group-activity-page">
      <h2 className="group-activity-page__title">{groupName} — Activity</h2>
      <ActivityFeedLiveDemo onNotify={onNotify} />
    </div>
  );
}

export default GroupActivityPage;