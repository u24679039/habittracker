// authService.js
// Part of: Authentication, Security & Admin (Yingisani Mabaso)
// Handles user registration, login, profile updates and account deletion.

require("dotenv").config();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { prisma } = require("../Server_Back/prisma/client");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment.");
}


/**
 * Registers a new user using Prisma.
 */
async function register(name, email, password) {
  if (!name || !email || !password) {
    return {
      success: false,
      message: "Name, email and password are required."
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: email
    }
  });

  if (existingUser) {
    return {
      success: false,
      message: "Email is already registered."
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: name,
      email: email,
      password: passwordHash,
      role: "USER"
    }
  });

  return {
    success: true,
    message: "Registration successful.",
    userId: user.id
  };
}


/**
 * Logs a user into the system using Prisma.
 */
async function login(email, password) {
  if (!email || !password) {
    return {
      success: false,
      message: "Email and password are required."
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: email
    }
  });

  if (!user) {
    return {
      success: false,
      message: "Invalid email or password."
    };
  }

  const passwordCorrect = await bcrypt.compare(
    password,
    user.password
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
 * Updates a user's profile using Prisma.
 */
async function updateProfile(userId, updates) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    return {
      success: false,
      message: "User not found."
    };
  }

  if (updates.email && updates.email !== user.email) {
    const emailTaken = await prisma.user.findUnique({
      where: {
        email: updates.email
      }
    });

    if (emailTaken) {
      return {
        success: false,
        message: "Email is already in use."
      };
    }
  }

  const dataToUpdate = {};

  if (updates.name) {
    dataToUpdate.name = updates.name;
  }

  if (updates.email) {
    dataToUpdate.email = updates.email;
  }

  await prisma.user.update({
    where: {
      id: userId
    },
    data: dataToUpdate
  });

  return {
    success: true,
    message: "Profile updated successfully."
  };
}


/**
 * Deletes a user's account using Prisma.
 */
async function deleteAccount(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    return {
      success: false,
      message: "User not found."
    };
  }

  await prisma.user.delete({
    where: {
      id: userId
    }
  });

  return {
    success: true,
    message: "Account deleted successfully."
  };
}


/**
 * Creates an administrator using Prisma.
 *
 * This is intended for controlled setup/testing only.
 * It is NOT exposed as a public registration endpoint.
 */
async function createAdmin(name, email, password) {
  if (!name || !email || !password) {
    return {
      success: false,
      message: "Name, email and password are required."
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: email
    }
  });

  if (existingUser) {
    return {
      success: false,
      message: "Email is already registered."
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      name: name,
      email: email,
      password: passwordHash,
      role: "ADMIN"
    }
  });

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
  createAdmin
};