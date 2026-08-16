const crypto = require("crypto");

const db = require("../database/database");
const { findBank } = require("./bankService");
const { createAuditLog } = require("./auditService");
const {
  generateUniqueAccountNumber,
} = require("../utils/accounts/accountNumber");

function generateAccountId() {
  return `ACC_${crypto.randomUUID()}`;
}

function createCustomerAccount({
  bankId,
  userId,
  accountType = "SAVINGS",
  currency = "INR",
}) {
  // --------------------------------------------------
  // 1. Verify bank
  // --------------------------------------------------

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

  // --------------------------------------------------
  // 2. Verify user belongs to this bank
  // --------------------------------------------------

  const bankUser = db
    .prepare(`
      SELECT
        bu.bank_user_id,
        bu.user_id,
        bu.bank_id,
        bu.role,
        u.status
      FROM bank_users bu
      INNER JOIN users u
        ON u.user_id = bu.user_id
      WHERE bu.bank_id = ?
        AND bu.user_id = ?
    `)
    .get(bankId, userId);

  if (!bankUser) {
    const error = new Error(
      "User does not belong to this bank"
    );

    error.code = "BANK_MEMBERSHIP_REQUIRED";
    error.status = 403;

    throw error;
  }

  // --------------------------------------------------
  // 3. Verify user is active
  // --------------------------------------------------

  if (bankUser.status !== "ACTIVE") {
    const error = new Error(
      "User account is not active"
    );

    error.code = "USER_INACTIVE";
    error.status = 403;

    throw error;
  }

  // --------------------------------------------------
  // 4. Only customers can create customer accounts
  // --------------------------------------------------

  if (bankUser.role !== "CUSTOMER") {
    const error = new Error(
      "Only customers can create customer accounts"
    );

    error.code = "INVALID_ACCOUNT_CREATION_ROLE";
    error.status = 403;

    throw error;
  }

  // --------------------------------------------------
  // 5. Validate account type
  // --------------------------------------------------

  if (!["SAVINGS", "CURRENT"].includes(accountType)) {
    const error = new Error(
      "Invalid account type"
    );

    error.code = "INVALID_ACCOUNT_TYPE";
    error.status = 400;

    throw error;
  }

  // --------------------------------------------------
  // 6. Validate currency
  // --------------------------------------------------

  if (currency !== "INR") {
    const error = new Error(
      "Only INR accounts are supported"
    );

    error.code = "UNSUPPORTED_CURRENCY";
    error.status = 400;

    throw error;
  }

  // --------------------------------------------------
  // 7. Generate account identifiers
  // --------------------------------------------------

  const accountId = generateAccountId();
  const accountNumber = generateUniqueAccountNumber();

  // --------------------------------------------------
  // 8. Create account
  // --------------------------------------------------

  const createAccount = db.transaction(() => {
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

  createAccount();

  // --------------------------------------------------
  // 9. Audit
  // --------------------------------------------------

  createAuditLog({
    bankId,
    userId,
    action: "ACCOUNT_CREATED",
    resourceType: "ACCOUNT",
    resourceId: accountId,
    metadata: {
      accountType,
      currency,
    },
  });

  // --------------------------------------------------
  // 10. Return safe account data
  // --------------------------------------------------

  return {
    accountId,
    accountNumber,
    bankId,
    accountType,
    currency,
    balance: 0,
    status: "ACTIVE",
  };
}

function listCustomerAccounts({
  bankId,
  userId,
}) {
  const accounts = db
    .prepare(`
      SELECT
        account_id,
        account_number,
        account_type,
        currency,
        balance,
        status,
        created_at,
        updated_at
      FROM accounts
      WHERE bank_id = ?
        AND user_id = ?
      ORDER BY created_at DESC
    `)
    .all(bankId, userId);

  return accounts;
}

function getCustomerAccount({
  bankId,
  userId,
  accountId,
}) {
  const account = db
    .prepare(`
      SELECT
        account_id,
        account_number,
        bank_id,
        user_id,
        account_type,
        currency,
        balance,
        status,
        created_at,
        updated_at
      FROM accounts
      WHERE account_id = ?
        AND bank_id = ?
        AND user_id = ?
    `)
    .get(
      accountId,
      bankId,
      userId
    );

  if (!account) {
    const error = new Error("Account not found");
    error.code = "ACCOUNT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  return account;
}

function updateAccountStatus({
  bankId,
  accountId,
  status,
  changedByUserId,
}) {
  if (!["ACTIVE", "BLOCKED", "CLOSED"].includes(status)) {
    const error = new Error("Invalid account status");
    error.code = "INVALID_ACCOUNT_STATUS";
    error.status = 400;
    throw error;
  }

  const account = db
    .prepare(`
      SELECT
        account_id,
        bank_id,
        user_id,
        account_number,
        account_type,
        currency,
        balance,
        status
      FROM accounts
      WHERE account_id = ?
        AND bank_id = ?
    `)
    .get(accountId, bankId);

  if (!account) {
    const error = new Error("Account not found");
    error.code = "ACCOUNT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (account.status === "CLOSED") {
    const error = new Error("Closed account cannot be modified");
    error.code = "ACCOUNT_CLOSED";
    error.status = 409;
    throw error;
  }

  if (account.status === status) {
    return account;
  }

  const updateAccount = db.transaction(() => {
    db.prepare(`
      UPDATE accounts
      SET
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
        AND bank_id = ?
    `).run(
      status,
      accountId,
      bankId
    );
  });

  updateAccount();

  createAuditLog({
    bankId,
    userId: changedByUserId,
    action: "ACCOUNT_STATUS_CHANGED",
    resourceType: "ACCOUNT",
    resourceId: accountId,
    metadata: {
      previousStatus: account.status,
      newStatus: status,
    },
  });

  return {
    ...account,
    status,
  };
}

function requireAccountOperational(account) {
  if (account.status !== "ACTIVE") {
    const error = new Error("Account is not active");
    error.code = "ACCOUNT_NOT_ACTIVE";
    error.status = 403;
    throw error;
  }

  return account;
}

module.exports = {
  createCustomerAccount,
  listCustomerAccounts,
  getCustomerAccount,
  updateAccountStatus,
  requireAccountOperational,
};
