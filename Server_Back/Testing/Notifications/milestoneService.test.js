const {
  checkForMilestone,
  buildMilestoneMessage,
} = require("../../Notifications/milestoneService");

describe("Milestone Service", () => {
  describe("checkForMilestone", () => {
    it("7 is a real milestone", () => {
      expect(checkForMilestone(7)).toBe(7);
    });

    it("30 is a real milestone", () => {
      expect(checkForMilestone(30)).toBe(30);
    });

    it("5 is NOT a milestone (normal day)", () => {
      expect(checkForMilestone(5)).toBeNull();
    });

    it("0 is NOT a milestone (edge case)", () => {
      expect(checkForMilestone(0)).toBeNull();
    });

    it("a negative number is NOT a milestone (edge case)", () => {
      expect(checkForMilestone(-1)).toBeNull();
    });
  });

  describe("buildMilestoneMessage", () => {
    it("message mentions the person's name", () => {
      const message = buildMilestoneMessage("Monal", 7);
      expect(message).toContain("Monal");
    });

    it("message mentions the milestone number", () => {
      const message = buildMilestoneMessage("Monal", 30);
      expect(message).toContain("30");
    });
  });
});