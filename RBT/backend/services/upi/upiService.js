const crypto = require("crypto");

const db = require("../../database/database");
const { createAuditLog } = require("../auditService");

function generateVpaId() {
  return `VPA_${crypto.randomUUID()}`;
}

function normalizeVpa(vpa) {
  return String(vpa || "")
    .trim()
    .toLowerCase();
}

function validateVpaFormat(vpa) {
  // Basic VPA format for the RBT simulation:
  // local-part@handle
  const pattern = /^[a-z0-9._-]+@[a-z0-9.-]+$/;

  return pattern.test(vpa);
}

function createVpa({
  userId,
  bankId,
  accountId,
  vpa,
}) {
  const normalizedVpa = normalizeVpa(vpa);

  if (!validateVpaFormat(normalizedVpa)) {
    const error = new Error("Invalid VPA format");
    error.code = "INVALID_VPA";
    error.status = 400;
    throw error;
  }

  const result = db.transaction(() => {
    // ----------------------------------------------
    // Verify user
    // ----------------------------------------------

    const user = db
      .prepare(`
        SELECT
          user_id,
          status
        FROM users
        WHERE user_id = ?
      `)
      .get(userId);

    if (!user) {
      const error = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (user.status !== "ACTIVE") {
      const error = new Error("User is not active");
      error.code = "USER_NOT_ACTIVE";
      error.status = 403;
      throw error;
    }

    // ----------------------------------------------
    // Verify account ownership + bank
    // ----------------------------------------------

    const account = db
      .prepare(`
        SELECT
          account_id,
          account_number,
          user_id,
          bank_id,
          status
        FROM accounts
        WHERE account_id = ?
          AND user_id = ?
          AND bank_id = ?
      `)
      .get(accountId, userId, bankId);

    if (!account) {
      const error = new Error(
        "Account not found for this user and bank"
      );

      error.code = "ACCOUNT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (account.status !== "ACTIVE") {
      const error = new Error("Account is not active");
      error.code = "ACCOUNT_NOT_ACTIVE";
      error.status = 403;
      throw error;
    }

    // ----------------------------------------------
    // Check VPA uniqueness
    // ----------------------------------------------

    const existing = db
      .prepare(`
        SELECT vpa_id
        FROM upi_vpas
        WHERE vpa = ?
      `)
      .get(normalizedVpa);

    if (existing) {
      const error = new Error("VPA already exists");
      error.code = "VPA_ALREADY_EXISTS";
      error.status = 409;
      throw error;
    }

    // ----------------------------------------------
    // Create VPA
    // ----------------------------------------------

    const vpaId = generateVpaId();

    db.prepare(`
      INSERT INTO upi_vpas (
        vpa_id,
        user_id,
        bank_id,
        account_id,
        vpa,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'ACTIVE')
    `).run(
      vpaId,
      userId,
      bankId,
      accountId,
      normalizedVpa
    );

    return {
      vpaId,
      userId,
      bankId,
      accountId,
      vpa: normalizedVpa,
      status: "ACTIVE",
    };
  })();

  // ----------------------------------------------
  // Audit
  // ----------------------------------------------

  createAuditLog({
    bankId,
    userId,
    action: "UPI_VPA_CREATED",
    resourceType: "UPI_VPA",
    resourceId: result.vpaId,
    metadata: {
      vpa: result.vpa,
      accountId: result.accountId,
    },
  });

  return result;
}

function findVpa(vpa) {
  const normalizedVpa = normalizeVpa(vpa);

  return db
    .prepare(`
      SELECT
        v.vpa_id,
        v.user_id,
        v.bank_id,
        v.account_id,
        v.vpa,
        v.status,
        v.created_at,
        v.updated_at,
        b.name AS bank_name,
        b.ifsc_code,
        a.account_number
      FROM upi_vpas v
      JOIN banks b
        ON b.bank_id = v.bank_id
      JOIN accounts a
        ON a.account_id = v.account_id
      WHERE v.vpa = ?
    `)
    .get(normalizedVpa);
}

function findVpaByUser({
  userId,
}) {
  return db
    .prepare(`
      SELECT
        v.vpa_id,
        v.bank_id,
        v.account_id,
        v.vpa,
        v.status,
        v.created_at,
        v.updated_at,
        b.name AS bank_name,
        b.ifsc_code,
        a.account_number
      FROM upi_vpas v
      JOIN banks b
        ON b.bank_id = v.bank_id
      JOIN accounts a
        ON a.account_id = v.account_id
      WHERE v.user_id = ?
      ORDER BY v.created_at DESC
    `)
    .all(userId);
}

function deactivateVpa({
  userId,
  vpa,
}) {
  const normalizedVpa = normalizeVpa(vpa);

  const result = db.transaction(() => {
    const existing = db
      .prepare(`
        SELECT
          vpa_id,
          user_id,
          bank_id,
          status
        FROM upi_vpas
        WHERE vpa = ?
      `)
      .get(normalizedVpa);

    if (!existing) {
      const error = new Error("VPA not found");
      error.code = "VPA_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (existing.user_id !== userId) {
      const error = new Error("Not authorized");
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    if (existing.status === "CLOSED") {
      return existing;
    }

    db.prepare(`
      UPDATE upi_vpas
      SET
        status = 'CLOSED',
        updated_at = CURRENT_TIMESTAMP
      WHERE vpa_id = ?
    `).run(existing.vpa_id);

    return {
      ...existing,
      status: "CLOSED",
    };
  })();

  createAuditLog({
    bankId: result.bank_id,
    userId,
    action: "UPI_VPA_DEACTIVATED",
    resourceType: "UPI_VPA",
    resourceId: result.vpa_id,
    metadata: {
      vpa: normalizedVpa,
    },
  });

  return result;
}

module.exports = {
  createVpa,
  findVpa,
  findVpaByUser,
  deactivateVpa,
};