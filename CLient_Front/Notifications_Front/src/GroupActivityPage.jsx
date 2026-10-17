// This is the screen a user lands on after clicking "View full activity ->"
// on the Groups page (built by Shahd). I'm NOT rebuilding that page here -
// group creation, joining and membership are her ticket. This is only the
// destination for that one link: my live activity feed for a single group.
//
// Whoever builds the app shell only needs to render it with the group the
// user clicked on:
//
//   <GroupActivityPage groupId={group.groupId} groupName={group.name} />

import React from "react";
import GroupFeed from "./GroupFeed";
import "./GroupActivityPage.css";

/**
 * @param {{groupId: number, groupName?: string, backHref?: string}} props
 *   backHref is where the "Back to Groups" link goes - the app shell sets
 *   this once it has a Groups route.
 */

function GroupActivityPage({ groupId, groupName = "Your Group" }) {
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