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
            <Groups
                currentUserId={currentUserId}
                onManageGroup={openGroup}
                onCreateGroup={() => setCurrentView("groupCreation")}
                onJoinGroup={() => setCurrentView("joinGroup")}
                onViewActivity={onViewActivity}
            />

            {/* In-place modal popups matching habit forms */}
            {currentView === "groupCreation" && (
                <GroupCreation
                    currentUserId={currentUserId}
                    onClose={openGroups}
                />
            )}

            {currentView === "joinGroup" && (
                <JoinGroup
                    currentUserId={currentUserId}
                    onSuccess={openGroups}
                    onClose={openGroups}
                />
            )}

            {currentView === "groupManagement" && (
                <div className="modal-backdrop" role="presentation" onMouseDown={openGroups}>
                    <section
                        className="modal-panel"
                        style={{ maxWidth: '640px' }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="group-manage-modal-title"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <header className="modal-panel__header">
                            <h2 id="group-manage-modal-title">Group Settings</h2>
                            <button
                                className="modal-panel__close"
                                type="button"
                                onClick={openGroups}
                            >
                                ×
                            </button>
                        </header>
                        <div className="modal-panel__body">
                            <GroupManagement
                                groupId={selectedGroupId}
                                currentUserId={currentUserId}
                                onDelete={openGroups}
                            />
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

export default App;