// authService.js
// Part of: Authentication, Security & Admin (Yingisani Mabaso)
// Handles basic user registration and login authentication.

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Temporary user storage.
// This will later be replaced by the PostgreSQL/Prisma database.
const users = [];

// Secret used to create JWT tokens.
// Later this should be stored securely in an environment variable.
const JWT_SECRET = "habittracker_secret";

/**
 * Registers a new user.
 *
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>}
 */
async function register(name, email, password) {
  // Check that all required information was provided.
  if (!name || !email || !password) {
    return {
      success: false,
      message: "Name, email and password are required."
    };
  }

  // Check whether the email is already registered.
  const existingUser = users.find((user) => user.email === email);

  if (existingUser) {
    return {
      success: false,
      message: "Email is already registered."
    };
  }

  // Never store the original password.
  // bcrypt converts it into a secure password hash.
  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    id: users.length + 1,
    name: name,
    email: email,
    passwordHash: passwordHash,
    role: "USER"
  };

  users.push(user);

  return {
    success: true,
    message: "Registration successful.",
    userId: user.id
  };
}

/**
 * Logs a user into the system.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>}
 */
async function login(email, password) {
  if (!email || !password) {
    return {
      success: false,
      message: "Email and password are required."
    };
  }

  const user = users.find((user) => user.email === email);

  if (!user) {
    return {
      success: false,
      message: "Invalid email or password."
    };
  }

  const passwordCorrect = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordCorrect) {
    return {
      success: false,
      message: "Invalid email or password."
    };
  }

  // Create a token proving that this user successfully logged in.
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: "1h"
    }
  );

  return {
    success: true,
    message: "Login successful.",
    token: token
  };
}

module.exports = {
  register,
  login,
  users
};