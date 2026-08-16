const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const db = require("../database/database");
const { findBank } = require("./bankService");
const { createAuditLog } = require("./auditService");
const {
  generateUniqueAccountNumber,
} = require("../utils/accounts/accountNumber");

function generateUserId() {
  return `USER_${crypto.randomUUID()}`;
}

function generateBankUserId() {
  return `BANKUSER_${crypto.randomUUID()}`;
}

function generateAccountId() {
  return `ACC_${crypto.randomUUID()}`;
}

function normalizeOptional(value) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  return value.trim();
}

function validateInput({
  fullName,
  email,
  phone,
  username,
  accountType,
  currency,
  temporaryPassword,
}) {
  if (
    typeof fullName !== "string" ||
    fullName.trim().length < 2
  ) {
    const error = new Error(
      "Full name must contain at least 2 characters"
    );

    error.code = "INVALID_FULL_NAME";
    error.status = 400;
    throw error;
  }

  if (
    typeof phone !== "string" ||
    !phone.trim() ||
    !/^[0-9+\-\s()]{7,20}$/.test(
      phone.trim()
    )
  ) {
    const error = new Error(
      "Enter a valid phone number"
    );

    error.code = "INVALID_PHONE";
    error.status = 400;
    throw error;
  }

  if (
    typeof username !== "string" ||
    !/^[a-zA-Z0-9_.-]{3,30}$/.test(
      username.trim()
    )
  ) {
    const error = new Error(
      "Invalid username"
    );

    error.code = "INVALID_USERNAME";
    error.status = 400;
    throw error;
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    const error = new Error(
      "Invalid email address"
    );

    error.code = "INVALID_EMAIL";
    error.status = 400;
    throw error;
  }

  if (
    !["SAVINGS", "CURRENT"].includes(
      accountType
    )
  ) {
    const error = new Error(
      "Invalid account type"
    );

    error.code = "INVALID_ACCOUNT_TYPE";
    error.status = 400;
    throw error;
  }

  if (currency !== "INR") {
    const error = new Error(
      "Only INR accounts are supported"
    );

    error.code = "UNSUPPORTED_CURRENCY";
    error.status = 400;
    throw error;
  }

  if (
    typeof temporaryPassword !== "string" ||
    temporaryPassword.length < 8
  ) {
    const error = new Error(
      "Temporary password must contain at least 8 characters"
    );

    error.code = "WEAK_PASSWORD";
    error.status = 400;
    throw error;
  }
}

// ==================================================
// ADMIN — CREATE CUSTOMER + ACCOUNT
// ==================================================

function createCustomerAccountByAdmin({
  bankId,
  createdByUserId,

  fullName,
  email,
  phone,
  username,

  accountType = "SAVINGS",
  currency = "INR",

  temporaryPassword,
}) {
  // ------------------------------------------------
  // 1. Verify bank
  // ------------------------------------------------

  const bank = findBank(bankId);

  if (!bank) {
    const error = new Error(
      "Bank not found"
    );

    error.code = "BANK_NOT_FOUND";
    error.status = 404;

    throw error;
  }

  if (bank.status !== "ACTIVE") {
    const error = new Error(
      "Bank is not active"
    );

    error.code = "BANK_INACTIVE";
    error.status = 403;

    throw error;
  }

  // ------------------------------------------------
  // 2. Validate request
  // ------------------------------------------------

  const normalizedFullName =
    fullName.trim();

  const normalizedEmail =
    normalizeOptional(email);

  const normalizedPhone =
    phone.trim();

  const normalizedUsername =
    username.trim();

  validateInput({
    fullName: normalizedFullName,
    email: normalizedEmail,
    phone: normalizedPhone,
    username: normalizedUsername,
    accountType,
    currency,
    temporaryPassword,
  });

  // ------------------------------------------------
  // 3. Check username
  // ------------------------------------------------

  const existingUsername = db
    .prepare(`
      SELECT
        user_id,
        username
      FROM users
      WHERE LOWER(username) = LOWER(?)
      LIMIT 1
    `)
    .get(normalizedUsername);

  if (existingUsername) {
    const error = new Error(
      "Username is already in use"
    );

    error.code = "USERNAME_ALREADY_EXISTS";
    error.status = 409;

    throw error;
  }

  // ------------------------------------------------
  // 4. Check email if supplied
  // ------------------------------------------------

  if (normalizedEmail) {
    const existingEmail = db
      .prepare(`
        SELECT
          user_id,
          email
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `)
      .get(normalizedEmail);

    if (existingEmail) {
      const error = new Error(
        "Email address is already in use"
      );

      error.code = "EMAIL_ALREADY_EXISTS";
      error.status = 409;

      throw error;
    }
  }

  // ------------------------------------------------
  // 5. Check phone
  // ------------------------------------------------

  const existingPhone = db
    .prepare(`
      SELECT
        user_id,
        phone
      FROM users
      WHERE phone = ?
      LIMIT 1
    `)
    .get(normalizedPhone);

  if (existingPhone) {
    const error = new Error(
      "Phone number is already registered"
    );

    error.code = "PHONE_ALREADY_EXISTS";
    error.status = 409;

    throw error;
  }

  // ------------------------------------------------
  // 6. Hash temporary password
  // ------------------------------------------------

  const passwordHash =
    bcrypt.hashSync(
      temporaryPassword,
      12
    );

  // ------------------------------------------------
  // 7. Generate IDs
  // ------------------------------------------------

  const userId = generateUserId();

  const bankUserId =
    generateBankUserId();

  const accountId =
    generateAccountId();

  const accountNumber =
    generateUniqueAccountNumber();

  // ------------------------------------------------
  // 8. Atomic creation
  // ------------------------------------------------

  const createEverything =
    db.transaction(() => {
      // --------------------------------------------
      // USER
      // --------------------------------------------

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
        normalizedUsername,
        passwordHash,
        normalizedFullName,
        normalizedEmail,
        normalizedPhone
      );

      // --------------------------------------------
      // BANK MEMBERSHIP
      // --------------------------------------------

      db.prepare(`
        INSERT INTO bank_users (
          bank_user_id,
          user_id,
          bank_id,
          role
        )
        VALUES (?, ?, ?, 'CUSTOMER')
      `).run(
        bankUserId,
        userId,
        bankId
      );

      // --------------------------------------------
      // BANK ACCOUNT
      // --------------------------------------------

      db.prepare(`
        INSERT INTO accounts (
          account_id,
          bank_id,
          user_id,
          account_number,
          account_type,
          currency,
          balance,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, 'ACTIVE')
      `).run(
        accountId,
        bankId,
        userId,
        accountNumber,
        accountType,
        currency
      );
    });

  createEverything();

  // ------------------------------------------------
  // 9. Audit
  // ------------------------------------------------

  createAuditLog({
    bankId,
    userId: createdByUserId,
    action: "CUSTOMER_ACCOUNT_OPENED",
    resourceType: "ACCOUNT",
    resourceId: accountId,
    metadata: {
      customerUserId: userId,
      username: normalizedUsername,
      accountNumber,
      accountType,
      currency,
    },
  });

  // ------------------------------------------------
  // 10. Return safe information
  // ------------------------------------------------

  return {
    customer: {
      userId,
      username: normalizedUsername,
      fullName: normalizedFullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      role: "CUSTOMER",
      status: "ACTIVE",
    },

    account: {
      accountId,
      accountNumber,
      bankId,
      accountType,
      currency,
      balance: 0,
      status: "ACTIVE",
    },
  };
}

module.exports = {
  createCustomerAccountByAdmin,
};