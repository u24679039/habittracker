// streakQueryService.test.js
// Jest tests for EH-30
// Run with: npx jest streakQueryService.test.js

const { getCurrentStreaksForGroup } = require("../../Notifications/streakQueryService");

// Passing in our own small set of fake users/memberships rather than relying
// on the built-in stub data, so the tests don't silently break if the default
// stub values ever change.
const fakeUsers = [
  { userId: 1, name: "Alice", currentStreak: 10 },
  { userId: 2, name: "Bob", currentStreak: 5 },
  { userId: 3, name: "Carol", currentStreak: 0 },
];

const fakeMemberships = [
  { groupId: 1, userId: 1 },
  { groupId: 1, userId: 2 },
  { groupId: 2, userId: 3 },
];

describe("getCurrentStreaksForGroup (EH-30)", () => {
  test("returns exactly the members of the requested group", () => {
    const result = getCurrentStreaksForGroup(1, fakeUsers, fakeMemberships);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
    expect(result[1].name).toBe("Bob");
  });

  test("does NOT include users from a different group", () => {
    const result = getCurrentStreaksForGroup(1, fakeUsers, fakeMemberships);
    const names = result.map((user) => user.name);

    expect(names).not.toContain("Carol");
  });

  test("a group with zero members returns an empty array, not an error", () => {
    const result = getCurrentStreaksForGroup(999, fakeUsers, fakeMemberships);

    expect(result).toEqual([]);
  });

  test("a user with a 0-day streak (edge case) is still returned correctly", () => {
    const result = getCurrentStreaksForGroup(2, fakeUsers, fakeMemberships);

    expect(result).toHaveLength(1);
    expect(result[0].currentStreak).toBe(0);
  });

  test("works using the real default stub data too, when no fake data is passed in", () => {
    // group 100 from the real stub data; proves the default parameters work
    const result = getCurrentStreaksForGroup(100);

    expect(result).toHaveLength(3);
  });
});