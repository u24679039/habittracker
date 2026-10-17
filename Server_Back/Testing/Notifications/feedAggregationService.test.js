const { buildGroupFeed } = require("../../Notifications/feedAggregationService");

describe("Feed Aggregation Service", () => {
  // Controlled fake data injected for tests
  const fakeGetStreaks = (groupId) => {
    if (groupId === 1) {
      return [
        { userId: 1, name: "Alice", currentStreak: 7 }, // a milestone
        { userId: 2, name: "Bob", currentStreak: 5 },   // not a milestone
      ];
    }
    return []; // an unknown/empty group
  };

  const fakeHabitLogs = [
    { userId: 1, habitName: "Reading", value: "10 pages", completedAt: new Date("2026-01-01T10:00:00") },
    { userId: 2, habitName: "Running", value: "3km", completedAt: new Date("2026-01-02T10:00:00") },
    { userId: 99, habitName: "Coding", value: "1hr", completedAt: new Date("2026-01-03T10:00:00") }, // not in this group
  ];

  const fakeCheckMilestone = (streak) => (streak === 7 ? 7 : null);

  it("includes habit completion entries for group members", () => {
    const feed = buildGroupFeed(1, fakeGetStreaks, fakeHabitLogs, fakeCheckMilestone);
    const habitEntry = feed.find((entry) => entry.type === "habit_completed" && entry.userId === 1);
    
    expect(habitEntry).toBeDefined();
    expect(habitEntry.message).toContain("Reading");
  });

  it("excludes habit logs from users who are NOT in this group", () => {
    const feed = buildGroupFeed(1, fakeGetStreaks, fakeHabitLogs, fakeCheckMilestone);
    const outsiderEntry = feed.find((entry) => entry.userId === 99);
    
    expect(outsiderEntry).toBeUndefined();
  });

  it("includes a milestone entry for a member whose streak qualifies", () => {
    const feed = buildGroupFeed(1, fakeGetStreaks, fakeHabitLogs, fakeCheckMilestone);
    const milestoneEntry = feed.find((entry) => entry.type === "milestone" && entry.userId === 1);
    
    expect(milestoneEntry).toBeDefined();
    expect(milestoneEntry.message).toContain("7");
  });

  it("does NOT include a milestone entry for a member whose streak doesn't qualify", () => {
    const feed = buildGroupFeed(1, fakeGetStreaks, fakeHabitLogs, fakeCheckMilestone);
    const nonMilestoneEntry = feed.find((entry) => entry.type === "milestone" && entry.userId === 2);
    
    expect(nonMilestoneEntry).toBeUndefined();
  });

  it("entries are sorted newest first", () => {
    const feed = buildGroupFeed(1, fakeGetStreaks, fakeHabitLogs, fakeCheckMilestone);
    const habitEntries = feed.filter((entry) => entry.type === "habit_completed");
    
    expect(habitEntries[0].timestamp.getTime()).toBeGreaterThan(habitEntries[1].timestamp.getTime());
  });

  it("a group with no members returns a completely empty feed (edge case)", () => {
    const feed = buildGroupFeed(999, fakeGetStreaks, fakeHabitLogs, fakeCheckMilestone);
    
    expect(feed).toEqual([]);
  });
});