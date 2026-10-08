const {
  flagGroup,
  getFlaggedGroups,
  reviewFlaggedGroup,
  removeGroup,
  groups
} = require("./adminService");

function runTests() {
  console.log("TEST 1: Flag existing group");
  console.log(
    flagGroup(1, "Inappropriate group content")
  );

  console.log("\nTEST 2: Get flagged groups");
  console.log(
    getFlaggedGroups()
  );

  console.log("\nTEST 3: Review flagged group");
  console.log(
    reviewFlaggedGroup(1)
  );

  console.log("\nTEST 4: Remove existing group");
  console.log(
    removeGroup(1)
  );

  console.log("\nTEST 5: Remove non-existent group");
  console.log(
    removeGroup(99)
  );

  console.log("\nGROUPS AFTER TESTS");
  console.log(groups);
}

runTests();