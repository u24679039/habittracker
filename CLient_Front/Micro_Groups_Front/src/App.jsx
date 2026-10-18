import { useState } from "react";

import Groups from "./components/Groups";
import GroupCreation from "./components/GroupCreation";
import JoinGroup from "./components/JoinGroup";
import GroupManagement from "./components/GroupManagement";


function App({ currentUserId, onViewActivity })
{
    const [currentView, setCurrentView] = useState("groups");
    const [selectedGroupId, setSelectedGroupId] = useState(null);


    function openGroups()
    {
        setCurrentView("groups");
        setSelectedGroupId(null);
    }


    function openGroup(groupId)
    {
        setSelectedGroupId(groupId);
        setCurrentView("groupManagement");
    }


    return (
        <div className="micro-groups-app">

            {currentView === "groups" && (
                <Groups
                    currentUserId={currentUserId}
                    onManageGroup={openGroup}
                    onCreateGroup={() =>
                        setCurrentView("groupCreation")
                    }
                    onJoinGroup={() =>
                        setCurrentView("joinGroup")
                    }
                    onViewActivity={onViewActivity}
                />
            )}


            {currentView === "groupManagement" && (
                <div className="action-page">
                    <button
                        type="button"
                        className="btn btn--text back-link"
                        onClick={openGroups}
                    >
                        ← Back to Groups
                    </button>

                    <GroupManagement
                        groupId={selectedGroupId}
                        currentUserId={currentUserId}
                        onDelete={openGroups}
                    />
                </div>
            )}


            {currentView === "groupCreation" && (
                <div className="action-page">
                    <button
                        type="button"
                        className="btn btn--text back-link"
                        onClick={openGroups}
                    >
                        ← Back to Groups
                    </button>

                    <GroupCreation
                        currentUserId={currentUserId}
                    />
                </div>
            )}


            {currentView === "joinGroup" && (
                <div className="action-page">
                    <button
                        type="button"
                        className="btn btn--text back-link"
                        onClick={openGroups}
                    >
                        ← Back to Groups
                    </button>

                    <JoinGroup
                        currentUserId={currentUserId}
                        onSuccess={openGroups}
                    />
                </div>
            )}

        </div>
    );
}


export default App;