const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const db = require("../database/database");
const { createAuditLog } = require("./auditService");

const MPIN_LENGTH = 6;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;

function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function generateOTP() {
  return crypto
    .randomInt(0, 1000000)
    .toString()
    .padStart(OTP_LENGTH, "0");
}

function hashOTP(otp) {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
}

function validateMPIN(mpin) {
  if (
    typeof mpin !== "string" ||
    !/^\d{6}$/.test(mpin)
  ) {
    const error = new Error(
      "MPIN must be exactly 6 digits"
    );

    error.code = "INVALID_MPIN";
    error.status = 400;

    throw error;
  }

  const weakPins = new Set([
    "000000",
    "111111",
    "222222",
    "333333",
    "444444",
    "555555",
    "666666",
    "777777",
    "888888",
    "999999",
    "123456",
    "654321",
  ]);

  if (weakPins.has(mpin)) {
    const error = new Error(
      "This MPIN is too easy to guess"
    );

    error.code = "WEAK_MPIN";
    error.status = 400;

    throw error;
  }
}

function getAccount(accountId) {
  return db.prepare(`
    SELECT
      account_id,
      bank_id,
      user_id,
      account_number,
      currency,
      status
    FROM accounts
    WHERE account_id = ?
  `).get(accountId);
}

function getMPIN(accountId) {
  return db.prepare(`
    SELECT
      mpin_id,
      account_id,
      mpin_hash,
      failed_attempts,
      locked_until,
      created_at,
      updated_at
    FROM account_mpins
    WHERE account_id = ?
  `).get(accountId);
}

// --------------------------------------------------
// Get MPIN status
// --------------------------------------------------

function getMPINStatus({
  accountId,
  userId,
}) {
  const account = getAccount(accountId);

  if (!account) {
    const error = new Error("Account not found");
    error.code = "ACCOUNT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (account.user_id !== userId) {
    const error = new Error(
      "You do not have access to this account"
    );

    error.code = "ACCOUNT_ACCESS_DENIED";
    error.status = 403;
    throw error;
  }

  return {
    accountId,
    configured: Boolean(getMPIN(accountId)),
  };
}

// --------------------------------------------------
// Set MPIN
// --------------------------------------------------

async function setMPIN({
  accountId,
  userId,
  mpin,
  confirmMpin,
}) {
  const account = getAccount(accountId);

  if (!account) {
    const error = new Error("Account not found");
    error.code = "ACCOUNT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (account.user_id !== userId) {
    const error = new Error(
      "You do not have access to this account"
    );

    error.code = "ACCOUNT_ACCESS_DENIED";
    error.status = 403;
    throw error;
  }

  if (account.status !== "ACTIVE") {
    const error = new Error(
      "Account is not active"
    );

    error.code = "ACCOUNT_NOT_ACTIVE";
    error.status = 403;
    throw error;
  }

  validateMPIN(mpin);

  if (mpin !== confirmMpin) {
    const error = new Error(
      "MPIN confirmation does not match"
    );

    error.code = "MPIN_MISMATCH";
    error.status = 400;
    throw error;
  }

  if (getMPIN(accountId)) {
    const error = new Error(
      "MPIN is already configured for this account"
    );

    error.code = "MPIN_ALREADY_CONFIGURED";
    error.status = 409;
    throw error;
  }

  const mpinHash = await bcrypt.hash(mpin, 12);

  const mpinId = generateId("MPIN");

  db.prepare(`
    INSERT INTO account_mpins (
      mpin_id,
      account_id,
      mpin_hash
    )
    VALUES (?, ?, ?)
  `).run(
    mpinId,
    accountId,
    mpinHash
  );

  createAuditLog({
    bankId: account.bank_id,
    userId,
    action: "MPIN_CREATED",
    resourceType: "ACCOUNT",
    resourceId: accountId,
    metadata: {
      accountId,
    },
  });

  return {
    accountId,
    configured: true,
  };
}

// --------------------------------------------------
// Verify MPIN
// --------------------------------------------------

async function verifyMPIN({
  accountId,
  userId,
  mpin,
}) {
  const account = getAccount(accountId);

  if (!account) {
    const error = new Error("Account not found");
    error.code = "ACCOUNT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (account.user_id !== userId) {
    const error = new Error(
      "You do not have access to this account"
    );

    error.code = "ACCOUNT_ACCESS_DENIED";
    error.status = 403;
    throw error;
  }

  const record = getMPIN(accountId);

  if (!record) {
    const error = new Error(
      "MPIN is not configured for this account"
    );

    error.code = "MPIN_NOT_CONFIGURED";
    error.status = 403;
    throw error;
  }

  if (record.locked_until) {
    const lockedUntil =
      Date.parse(record.locked_until);

    if (
      !Number.isNaN(lockedUntil) &&
      lockedUntil > Date.now()
    ) {
      const error = new Error(
        "MPIN is temporarily locked"
      );

      error.code = "MPIN_LOCKED";
      error.status = 423;
      throw error;
    }

    db.prepare(`
      UPDATE account_mpins
      SET
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
    `).run(accountId);
  }

  const valid =
    await bcrypt.compare(
      mpin,
      record.mpin_hash
    );

  if (!valid) {
    const failedAttempts =
      record.failed_attempts + 1;

    if (
      failedAttempts >=
      MAX_FAILED_ATTEMPTS
    ) {
      const lockedUntil =
        new Date(
          Date.now() +
          LOCK_MINUTES * 60 * 1000
        ).toISOString();

      db.prepare(`
        UPDATE account_mpins
        SET
          failed_attempts = ?,
          locked_until = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = ?
      `).run(
        failedAttempts,
        lockedUntil,
        accountId
      );

      const error = new Error(
        "Too many incorrect MPIN attempts. MPIN is temporarily locked."
      );

      error.code = "MPIN_LOCKED";
      error.status = 423;

      throw error;
    }

    db.prepare(`
      UPDATE account_mpins
      SET
        failed_attempts = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
    `).run(
      failedAttempts,
      accountId
    );

    const error = new Error(
      "Incorrect MPIN"
    );

    error.code = "INVALID_MPIN";
    error.status = 401;

    throw error;
  }

  db.prepare(`
    UPDATE account_mpins
    SET
      failed_attempts = 0,
      locked_until = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE account_id = ?
  `).run(accountId);

  return {
    verified: true,
    accountId,
  };
}

// --------------------------------------------------
// Change MPIN
// --------------------------------------------------

async function changeMPIN({
  accountId,
  userId,
  currentMpin,
  newMpin,
  confirmMpin,
}) {
  await verifyMPIN({
    accountId,
    userId,
    mpin: currentMpin,
  });

  validateMPIN(newMpin);

  if (newMpin !== confirmMpin) {
    const error = new Error(
      "MPIN confirmation does not match"
    );

    error.code = "MPIN_MISMATCH";
    error.status = 400;

    throw error;
  }

  if (newMpin === currentMpin) {
    const error = new Error(
      "New MPIN must be different from current MPIN"
    );

    error.code = "MPIN_UNCHANGED";
    error.status = 400;

    throw error;
  }

  const mpinHash =
    await bcrypt.hash(newMpin, 12);

  db.prepare(`
    UPDATE account_mpins
    SET
      mpin_hash = ?,
      failed_attempts = 0,
      locked_until = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE account_id = ?
  `).run(
    mpinHash,
    accountId
  );

  const account = getAccount(accountId);

  createAuditLog({
    bankId: account.bank_id,
    userId,
    action: "MPIN_CHANGED",
    resourceType: "ACCOUNT",
    resourceId: accountId,
    metadata: {
      accountId,
    },
  });

  return {
    accountId,
    changed: true,
  };
}

// --------------------------------------------------
// Request MPIN reset
// --------------------------------------------------

function requestMPINReset({
  accountId,
  userId,
}) {
  const account = getAccount(accountId);

  if (!account) {
    const error = new Error("Account not found");
    error.code = "ACCOUNT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (account.user_id !== userId) {
    const error = new Error(
      "You do not have access to this account"
    );

    error.code = "ACCOUNT_ACCESS_DENIED";
    error.status = 403;
    throw error;
  }

  if (!getMPIN(accountId)) {
    const error = new Error(
      "MPIN is not configured for this account"
    );

    error.code = "MPIN_NOT_CONFIGURED";
    error.status = 400;
    throw error;
  }

  const otp = generateOTP();

  const otpHash = hashOTP(otp);

  const challengeId =
    generateId("MPINRESET");

  const expiresAt =
    new Date(
      Date.now() +
      OTP_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

  db.prepare(`
    INSERT INTO mpin_reset_challenges (
      challenge_id,
      user_id,
      otp_hash,
      expires_at
    )
    VALUES (?, ?, ?, ?)
  `).run(
    challengeId,
    userId,
    otpHash,
    expiresAt
  );

  /*
   * DEVELOPMENT ONLY
   *
   * Replace this with your real SMS/OTP provider.
   */
  console.log(
    `[MPIN OTP] user=${userId} otp=${otp}`
  );

  return {
    challengeId,
    expiresAt,
  };
}

// --------------------------------------------------
// Verify reset OTP
// --------------------------------------------------

function verifyMPINResetOTP({
  challengeId,
  userId,
  otp,
}) {
  const challenge = db.prepare(`
    SELECT
      challenge_id,
      user_id,
      otp_hash,
      expires_at,
      attempts,
      max_attempts,
      verified_at
    FROM mpin_reset_challenges
    WHERE challenge_id = ?
      AND user_id = ?
  `).get(
    challengeId,
    userId
  );

  if (!challenge) {
    const error = new Error(
      "Reset challenge not found"
    );

    error.code = "RESET_CHALLENGE_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (challenge.verified_at) {
    const error = new Error(
      "OTP has already been verified"
    );

    error.code = "OTP_ALREADY_VERIFIED";
    error.status = 409;
    throw error;
  }

  if (
    Date.parse(challenge.expires_at) <=
    Date.now()
  ) {
    const error = new Error(
      "OTP has expired"
    );

    error.code = "OTP_EXPIRED";
    error.status = 400;
    throw error;
  }

  if (
    challenge.attempts >=
    challenge.max_attempts
  ) {
    const error = new Error(
      "Maximum OTP attempts exceeded"
    );

    error.code = "OTP_ATTEMPTS_EXCEEDED";
    error.status = 429;
    throw error;
  }

  const valid =
    hashOTP(otp) === challenge.otp_hash;

  if (!valid) {
    db.prepare(`
      UPDATE mpin_reset_challenges
      SET attempts = attempts + 1
      WHERE challenge_id = ?
    `).run(challengeId);

    const error = new Error(
      "Invalid OTP"
    );

    error.code = "INVALID_OTP";
    error.status = 401;

    throw error;
  }

  db.prepare(`
    UPDATE mpin_reset_challenges
    SET
      verified_at = CURRENT_TIMESTAMP
    WHERE challenge_id = ?
  `).run(challengeId);

  return {
    verified: true,
    challengeId,
  };
}

// --------------------------------------------------
// Complete MPIN reset
// --------------------------------------------------

async function completeMPINReset({
  challengeId,
  userId,
  accountId,
  newMpin,
  confirmMpin,
}) {
  const challenge = db.prepare(`
    SELECT
      challenge_id,
      user_id,
      verified_at
    FROM mpin_reset_challenges
    WHERE challenge_id = ?
      AND user_id = ?
  `).get(
    challengeId,
    userId
  );

  if (!challenge) {
    const error = new Error(
      "Reset challenge not found"
    );

    error.code = "RESET_CHALLENGE_NOT_FOUND";
    error.status = 404;

    throw error;
  }

  if (!challenge.verified_at) {
    const error = new Error(
      "OTP verification is required"
    );

    error.code = "OTP_VERIFICATION_REQUIRED";
    error.status = 403;

    throw error;
  }

  const account = getAccount(accountId);

  if (!account) {
    const error = new Error("Account not found");
    error.code = "ACCOUNT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (account.user_id !== userId) {
    const error = new Error(
      "You do not have access to this account"
    );

    error.code = "ACCOUNT_ACCESS_DENIED";
    error.status = 403;

    throw error;
  }

  validateMPIN(newMpin);

  if (newMpin !== confirmMpin) {
    const error = new Error(
      "MPIN confirmation does not match"
    );

    error.code = "MPIN_MISMATCH";
    error.status = 400;

    throw error;
  }

  const mpinHash =
    await bcrypt.hash(newMpin, 12);

  db.transaction(() => {
    db.prepare(`
      UPDATE account_mpins
      SET
        mpin_hash = ?,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
    `).run(
      mpinHash,
      accountId
    );

    db.prepare(`
      DELETE FROM mpin_reset_challenges
      WHERE challenge_id = ?
    `).run(challengeId);
  })();

  createAuditLog({
    bankId: account.bank_id,
    userId,
    action: "MPIN_RESET",
    resourceType: "ACCOUNT",
    resourceId: accountId,
    metadata: {
      accountId,
      challengeId,
    },
  });

  return {
    accountId,
    reset: true,
  };
}

module.exports = {
  getMPINStatus,
  setMPIN,
  verifyMPIN,
  changeMPIN,
  requestMPINReset,
  verifyMPINResetOTP,
  completeMPINReset,
};