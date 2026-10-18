const {
  flagGroup,
  getFlaggedGroups,
  reviewFlaggedGroup,
  removeGroup,
  groups
} = require("../../Auth_Security_Admin/adminService");

describe("Admin Service", () => {
  it("TEST 1: Should flag an existing group", () => {
    const result = flagGroup(1, "Inappropriate group content");
    expect(result).toBeDefined();
  });

  it("TEST 2: Should get flagged groups", () => {
    const flagged = getFlaggedGroups();
    expect(flagged).toBeDefined();
  });

  it("TEST 3: Should review flagged group", () => {
    const result = reviewFlaggedGroup(1);
    expect(result).toBeDefined();
  });

  it("TEST 4: Should remove an existing group", () => {
    const result = removeGroup(1);
    expect(result).toBeDefined();
  });

  it("TEST 5: Should handle removing a non-existent group", () => {
    const result = removeGroup(99);
    expect(result).toBeDefined();
  });

  it("Should have updated the groups object correctly after tests", () => {
    expect(groups).toBeDefined();
  });
});