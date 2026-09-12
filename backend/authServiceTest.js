const {
  register,
  login,
  updateProfile,
  deleteAccount,
  users
} = require("./authService");

async function runTests() {
  console.log("TEST 1: Valid registration");
  console.log(
    await register("Yingisani", "yingisani@example.com", "Password123")
  );

  console.log("\nTEST 2: Duplicate email");
  console.log(
    await register("Another User", "yingisani@example.com", "Password456")
  );

  console.log("\nTEST 3: Valid login");
  console.log(
    await login("yingisani@example.com", "Password123")
  );

  console.log("\nTEST 4: Wrong password");
  console.log(
    await login("yingisani@example.com", "WrongPassword")
  );

  console.log("\nTEST 5: Unknown email");
  console.log(
    await login("unknown@example.com", "Password123")
  );

  console.log("\nTEST 6: Empty email");
  console.log(
    await login("", "Password123")
  );

  console.log("\nTEST 7: Empty name registration");
  console.log(
    await register("", "newuser@example.com", "Password123")
  );

  console.log("\nTEST 8: Update profile");
  console.log(
    updateProfile(1, {
      name: "Yingisani Mabaso"
    })
  );

  console.log("\nUSER AFTER PROFILE UPDATE");
  console.log(users[0]);

  console.log("\nTEST 9: Delete account");
  console.log(
    deleteAccount(1)
  );

  console.log("\nUSERS AFTER DELETION");
  console.log(users);
}

runTests();