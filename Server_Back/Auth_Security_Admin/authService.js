require("dotenv").config();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { prisma } = require("../prisma/client");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment.");
}

// ====================
// REGISTER
// ====================

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

// ====================
// LOGIN
// ====================

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

// ====================
// GET PROFILE
// ====================

async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      CreatedAt: true
    }
  });

  if (!user) {
    return {
      success: false,
      message: "User not found."
    };
  }

  return {
    success: true,
    user: user
  };
}

// ====================
// UPDATE PROFILE
// ====================

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

  const dataToUpdate = {};

  if (updates.name) {
    dataToUpdate.name = updates.name;
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

// ====================
// DELETE ACCOUNT
// ====================

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

// ====================
// CREATE ADMIN
// ====================

// Used only for controlled setup/testing.
// Normal registration always creates a USER account.
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

// ====================
// EXPORTS
// ====================

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  createAdmin
};