// authService.js
// Part of: Authentication, Security & Admin (Yingisani Mabaso)
// Handles user registration, login, profile updates and account deletion.
require("dotenv").config();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Temporary user storage.
// This will later be replaced by PostgreSQL/Prisma.
const users = [];

// Temporary JWT secret.
// Later this should be stored in an environment variable.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment.");
}


/**
 * Registers a new user.
 */
async function register(name, email, password) {
  if (!name || !email || !password) {
    return {
      success: false,
      message: "Name, email and password are required."
    };
  }

  const existingUser = users.find(
    (user) => user.email === email
  );

  if (existingUser) {
    return {
      success: false,
      message: "Email is already registered."
    };
  }

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
 */
async function login(email, password) {
  if (!email || !password) {
    return {
      success: false,
      message: "Email and password are required."
    };
  }

  const user = users.find(
    (user) => user.email === email
  );

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


/**
 * Updates a user's profile.
 */
function updateProfile(userId, updates) {
  const user = users.find(
    (user) => user.id === userId
  );

  if (!user) {
    return {
      success: false,
      message: "User not found."
    };
  }

  if (updates.name) {
    user.name = updates.name;
  }

  if (updates.email) {
    const emailTaken = users.find(
      (existingUser) =>
        existingUser.email === updates.email &&
        existingUser.id !== userId
    );

    if (emailTaken) {
      return {
        success: false,
        message: "Email is already in use."
      };
    }

    user.email = updates.email;
  }

  return {
    success: true,
    message: "Profile updated successfully."
  };
}


/**
 * Deletes a user's account.
 */
function deleteAccount(userId) {
  const userIndex = users.findIndex(
    (user) => user.id === userId
  );

  if (userIndex === -1) {
    return {
      success: false,
      message: "User not found."
    };
  }

  users.splice(userIndex, 1);

  return {
    success: true,
    message: "Account deleted successfully."
  };
}

async function createAdmin(name, email, password) {
  if (!name || !email || !password) {
    return {
      success: false,
      message: "Name, email and password are required."
    };
  }

  const existingUser = users.find((user) => user.email === email);

  if (existingUser) {
    return {
      success: false,
      message: "Email is already registered."
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = {
    id: users.length + 1,
    name,
    email,
    passwordHash,
    role: "ADMIN"
  };

  users.push(admin);

  return {
    success: true,
    message: "Admin created successfully.",
    userId: admin.id
  };
}
module.exports = {
  register,
  login,
  updateProfile,
  deleteAccount,
  createAdmin,
  users
};