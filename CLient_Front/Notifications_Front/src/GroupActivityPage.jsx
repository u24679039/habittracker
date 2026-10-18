
// Destination for "View activity" on a group card: the group's real activity feed.
// The "Back to Groups" control is provided by the app shell, so it is not
// repeated here. Styling lives in Main_Frontend/styles/tokens.css.

import React from "react";
import GroupFeed from "./GroupFeed";

/**
 * Displays the real activity feed for the selected group.
 * @param {{groupId: number, groupName?: string}} props
 */
function GroupActivityPage({ groupId, groupName = "Group" }) {
  return (
    <div className="group-activity-page">
      <h2 className="group-activity-page__title">
        {groupName} — Activity
      </h2>
      <GroupFeed groupId={groupId} />
    </div>
  );
}

export default GroupActivityPage;
