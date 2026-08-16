const db = require("../database/database");

// --------------------------------------------------
// ADMIN / MANAGER AUTHORIZATION
// --------------------------------------------------

function assertAdmin(bankId, userId) {
  const admin = db.prepare(`
    SELECT
      bu.user_id,
      bu.bank_id,
      bu.role,
      u.status
    FROM bank_users bu
    INNER JOIN users u
      ON u.user_id = bu.user_id
    WHERE bu.bank_id = ?
      AND bu.user_id = ?
  `).get(bankId, userId);

  if (!admin) {
    const error = new Error(
      "Administrator does not belong to this bank"
    );

    error.code = "ADMIN_BANK_ACCESS_DENIED";
    error.status = 403;

    throw error;
  }

  if (!["ADMIN", "MANAGER"].includes(admin.role)) {
    const error = new Error(
      "Administrative authorization required"
    );

    error.code = "ADMIN_AUTHORIZATION_DENIED";
    error.status = 403;

    throw error;
  }

  if (admin.status !== "ACTIVE") {
    const error = new Error(
      "Administrator account is not active"
    );

    error.code = "ADMIN_USER_INACTIVE";
    error.status = 403;

    throw error;
  }

  return admin;
}

// --------------------------------------------------
// DASHBOARD
// --------------------------------------------------

function getAdminDashboard({
  bankId,
  userId,
}) {
  assertAdmin(bankId, userId);

  const stats = db.prepare(`
    SELECT
      COUNT(*) AS accounts,

      COUNT(
        DISTINCT user_id
      ) AS customers,

      COALESCE(
        SUM(
          CASE
            WHEN status = 'ACTIVE'
            THEN 1
            ELSE 0
          END
        ),
        0
      ) AS activeAccounts,

      COALESCE(
        SUM(
          CASE
            WHEN status = 'BLOCKED'
            THEN 1
            ELSE 0
          END
        ),
        0
      ) AS blockedAccounts,

      COALESCE(
        SUM(
          CASE
            WHEN status = 'CLOSED'
            THEN 1
            ELSE 0
          END
        ),
        0
      ) AS closedAccounts,

      COALESCE(
        SUM(balance),
        0
      ) AS totalBalance

    FROM accounts

    WHERE bank_id = ?
  `).get(bankId);

  const recentTransactions = db.prepare(`
    SELECT
      transaction_id,
      bank_id,
      source_account_id,
      destination_account_id,
      amount,
      currency,
      type,
      status,
      reference,
      failure_reason,
      created_at,
      updated_at,
      completed_at

    FROM transactions

    WHERE bank_id = ?

    ORDER BY created_at DESC

    LIMIT 10
  `).all(bankId);

  return {
    bankId,

    stats: {
      customers: Number(stats.customers || 0),
      accounts: Number(stats.accounts || 0),
      activeAccounts: Number(
        stats.activeAccounts || 0
      ),
      blockedAccounts: Number(
        stats.blockedAccounts || 0
      ),
      closedAccounts: Number(
        stats.closedAccounts || 0
      ),
      totalBalance: Number(
        stats.totalBalance || 0
      ),
    },

    recentTransactions,
  };
}

// --------------------------------------------------
// LIST ACCOUNTS
// --------------------------------------------------

function listAdminAccounts({
  bankId,
  userId,
  search = "",
  status = null,
  limit = 50,
  offset = 0,
}) {
  assertAdmin(bankId, userId);

  limit = Math.min(
    Math.max(Number(limit) || 50, 1),
    100
  );

  offset = Math.max(
    Number(offset) || 0,
    0
  );

  let query = `
    SELECT
      a.account_id,
      a.account_number,
      a.account_type,
      a.currency,
      a.balance,
      a.status,
      a.created_at,
      a.updated_at,

      a.user_id,

      u.username,
      u.full_name,
      u.email,
      u.phone,
      u.status AS user_status

    FROM accounts a

    INNER JOIN users u
      ON u.user_id = a.user_id

    WHERE a.bank_id = ?
  `;

  const params = [bankId];

  if (status) {
    query += `
      AND a.status = ?
    `;

    params.push(status);
  }

  const normalizedSearch =
    String(search || "").trim();

  if (normalizedSearch) {
    query += `
      AND (
        a.account_id LIKE ?
        OR a.account_number LIKE ?
        OR u.username LIKE ?
        OR u.full_name LIKE ?
        OR u.email LIKE ?
        OR u.phone LIKE ?
      )
    `;

    const searchValue =
      `%${normalizedSearch}%`;

    params.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  query += `
    ORDER BY a.created_at DESC
    LIMIT ?
    OFFSET ?
  `;

  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

// --------------------------------------------------
// GET ACCOUNT
// --------------------------------------------------

function getAdminAccount({
  bankId,
  userId,
  accountId,
}) {
  assertAdmin(bankId, userId);

  const account = db.prepare(`
    SELECT
      a.account_id,
      a.bank_id,
      a.account_number,
      a.account_type,
      a.currency,
      a.balance,
      a.status,
      a.created_at,
      a.updated_at,

      u.user_id,
      u.username,
      u.full_name,
      u.email,
      u.phone,
      u.status AS user_status

    FROM accounts a

    INNER JOIN users u
      ON u.user_id = a.user_id

    WHERE a.bank_id = ?
      AND a.account_id = ?
  `).get(
    bankId,
    accountId
  );

  if (!account) {
    const error = new Error(
      "Account not found"
    );

    error.code = "ACCOUNT_NOT_FOUND";
    error.status = 404;

    throw error;
  }

  return account;
}

// --------------------------------------------------
// LIST TRANSACTIONS
// --------------------------------------------------

function listAdminTransactions({
  bankId,
  userId,
  accountId = null,
  limit = 50,
  offset = 0,
}) {
  assertAdmin(bankId, userId);

  limit = Math.min(
    Math.max(Number(limit) || 50, 1),
    100
  );

  offset = Math.max(
    Number(offset) || 0,
    0
  );

  let query = `
    SELECT
      t.transaction_id,
      t.bank_id,
      t.source_account_id,
      t.destination_account_id,
      t.amount,
      t.currency,
      t.type,
      t.status,
      t.reference,
      t.failure_reason,
      t.created_at,
      t.updated_at,
      t.completed_at

    FROM transactions t

    WHERE t.bank_id = ?
  `;

  const params = [bankId];

  if (accountId) {
    query += `
      AND (
        t.source_account_id = ?
        OR t.destination_account_id = ?
      )
    `;

    params.push(
      accountId,
      accountId
    );
  }

  query += `
    ORDER BY t.created_at DESC
    LIMIT ?
    OFFSET ?
  `;

  params.push(
    limit,
    offset
  );

  return db.prepare(query).all(...params);
}

module.exports = {
  assertAdmin,
  getAdminDashboard,
  listAdminAccounts,
  getAdminAccount,
  listAdminTransactions,
};
