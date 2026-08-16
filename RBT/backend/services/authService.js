const crypto = require("crypto");

const db = require("../database/database");
const { findBank } = require("./bankService");
const { createAuditLog } = require("./auditService");

const {
  hashPassword,
  verifyPassword,
} = require("../utils/auth/password");

const {
  generateAccessToken,
} = require("../utils/auth/jwt");

function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function registerCustomer({
  bankId,
  username,
  password,
  fullName,
  email,
  phone,
}) {
  const bank = findBank(bankId);

  if (!bank) {
    const error = new Error("Bank not found");
    error.code = "BANK_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (bank.status !== "ACTIVE") {
    const error = new Error("Bank is not active");
    error.code = "BANK_INACTIVE";
    error.status = 403;
    throw error;
  }

  const existingUser = db
    .prepare(`
      SELECT user_id
      FROM users
      WHERE username = ?
    `)
    .get(username);

  if (existingUser) {
    const error = new Error("Username already exists");
    error.code = "USERNAME_EXISTS";
    error.status = 409;
    throw error;
  }

  const userId = generateId("USER");
  const bankUserId = generateId("BANKUSER");

  const passwordHash = await hashPassword(password);

  const createCustomer = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (
        user_id,
        username,
        password_hash,
        full_name,
        email,
        phone,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
    `).run(
      userId,
      username,
      passwordHash,
      fullName,
      email || null,
      phone || null
    );

    db.prepare(`
      INSERT INTO bank_users (
        bank_user_id,
        bank_id,
        user_id,
        role
      )
      VALUES (?, ?, ?, 'CUSTOMER')
    `).run(
      bankUserId,
      bankId,
      userId
    );
  });

  createCustomer();

  // Audit successful registration
  createAuditLog({
    bankId,
    userId,
    action: "REGISTER_SUCCESS",
    resourceType: "USER",
    resourceId: userId,
  });

  return {
    userId,
    bankId,
    role: "CUSTOMER",
  };
}

async function loginCustomer({
  bankId,
  username,
  password,
}) {
  const bank = findBank(bankId);

  if (!bank) {
    createAuditLog({
      bankId,
      action: "LOGIN_FAILED",
      resourceType: "AUTH",
      metadata: {
        reason: "INVALID_CREDENTIALS",
      },
    });

    const error = new Error("Invalid bank or credentials");
    error.code = "INVALID_CREDENTIALS";
    error.status = 401;
    throw error;
  }

  const user = db
    .prepare(`
      SELECT
        u.user_id,
        u.username,
        u.password_hash,
        u.full_name,
        u.email,
        u.phone,
        u.status,
        u.token_version,
        bu.bank_id,
        bu.role
      FROM users u
      INNER JOIN bank_users bu
        ON bu.user_id = u.user_id
      WHERE u.username = ?
        AND bu.bank_id = ?
    `)
    .get(username, bankId);

  // User does not exist in this bank
  if (!user) {
    createAuditLog({
      bankId,
      action: "LOGIN_FAILED",
      resourceType: "AUTH",
      metadata: {
        reason: "INVALID_CREDENTIALS",
      },
    });

    const error = new Error("Invalid bank or credentials");
    error.code = "INVALID_CREDENTIALS";
    error.status = 401;
    throw error;
  }

  // User exists but is inactive/blocked
  if (user.status !== "ACTIVE") {
    createAuditLog({
      bankId: user.bank_id,
      userId: user.user_id,
      action: "LOGIN_FAILED",
      resourceType: "USER",
      resourceId: user.user_id,
      metadata: {
        reason: "USER_INACTIVE",
      },
    });

    const error = new Error("User account is not active");
    error.code = "USER_INACTIVE";
    error.status = 403;
    throw error;
  }

  const passwordValid = await verifyPassword(
    password,
    user.password_hash
  );

  // Wrong password
  if (!passwordValid) {
    createAuditLog({
      bankId: user.bank_id,
      userId: user.user_id,
      action: "LOGIN_FAILED",
      resourceType: "AUTH",
      resourceId: user.user_id,
      metadata: {
        reason: "INVALID_CREDENTIALS",
      },
    });

    const error = new Error("Invalid bank or credentials");
    error.code = "INVALID_CREDENTIALS";
    error.status = 401;
    throw error;
  }

  const accessToken = generateAccessToken({
    userId: user.user_id,
    bankId: user.bank_id,
    role: user.role,
    tokenVersion: user.token_version,
  });

  // Audit successful login
  createAuditLog({
    bankId: user.bank_id,
    userId: user.user_id,
    action: "LOGIN_SUCCESS",
    resourceType: "USER",
    resourceId: user.user_id,
  });

  return {
    accessToken,
    user: {
      userId: user.user_id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      bankId: user.bank_id,
      role: user.role,
    },
  };
}

module.exports = {
  registerCustomer,
  loginCustomer,
};