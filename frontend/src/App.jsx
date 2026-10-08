import { useState } from "react";

import Groups from "./components/Groups";
import GroupCreation from "./components/GroupCreation";
import JoinGroup from "./components/JoinGroup";
import GroupManagement from "./components/GroupManagement";

import "./App.css";


function App()
{
    // Temporary user selection for demonstration.
    // Example: http://localhost:5173/?user=1
    const currentUserId =
        Number(new URLSearchParams(window.location.search).get("user")) || 1;

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
        <div className="app">

            <header className="app-header">
                <h1>HabitTrack</h1>

                <button
                    type="button"
                    className={
                        currentView === "groups"
                            ? "navigation-button active"
                            : "navigation-button"
                    }
                    onClick={openGroups}
                >
                    Groups
                </button>
            </header>


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
                />
            )}


            {currentView === "groupManagement" && (
                <main className="action-page">
                    <button
                        type="button"
                        onClick={openGroups}
                    >
                        ← Back to Groups
                    </button>

                    <GroupManagement
                        groupId={selectedGroupId}
                        currentUserId={currentUserId}
                        onDelete={openGroups}
                    />
                </main>
            )}


            {currentView === "groupCreation" && (
                <main className="action-page">
                    <button
                        type="button"
                        onClick={openGroups}
                    >
                        ← Back to Groups
                    </button>

                    <GroupCreation
                        currentUserId={currentUserId}
                    />
                </main>
            )}


            {currentView === "joinGroup" && (
                <main className="action-page">
                    <button
                        type="button"
                        onClick={openGroups}
                    >
                        ← Back to Groups
                    </button>

                    <JoinGroup
                        currentUserId={currentUserId}
                        onSuccess={openGroups}
                    />
                </main>
            )}

        </div>
    );
}


export default App;