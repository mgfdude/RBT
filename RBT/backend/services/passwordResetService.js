const crypto = require("crypto");

const db = require("../database/database");

const {
  hashPassword,
} = require("../utils/auth/password");

const {
  generateResetToken,
  hashResetToken,
  generateOtp,
  hashOtp,
} = require("../utils/auth/passwordReset");

const {
  createAuditLog,
} = require("./auditService");


function generateResetId() {
  return `RESET_${crypto.randomUUID()}`;
}


// --------------------------------------------------
// REQUEST PASSWORD RESET
// --------------------------------------------------

async function requestPasswordReset({ username }) {
  const user = db
    .prepare(`
      SELECT
        user_id,
        username,
        status
      FROM users
      WHERE username = ?
    `)
    .get(username);

  // Do not reveal whether username exists
  if (!user || user.status !== "ACTIVE") {
    return {
      accepted: true,
    };
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  const resetId = generateResetId();

  // OTP expires in 5 minutes
  const expiresAt = new Date(
    Date.now() + 5 * 60 * 1000
  ).toISOString();

  db.transaction(() => {
    // Invalidate previous reset attempts
    db.prepare(`
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND used_at IS NULL
    `).run(user.user_id);

    db.prepare(`
      INSERT INTO password_reset_tokens (
        reset_id,
        user_id,
        otp_hash,
        otp_attempts,
        expires_at
      )
      VALUES (?, ?, ?, 0, ?)
    `).run(
      resetId,
      user.user_id,
      otpHash,
      expiresAt
    );
  })();

  createAuditLog({
    userId: user.user_id,
    action: "PASSWORD_RESET_REQUESTED",
    resourceType: "USER",
    resourceId: user.user_id,
  });

  // DEVELOPMENT ONLY
  return {
    accepted: true,
    devOtp: otp,
    expiresAt,
  };
}


// --------------------------------------------------
// VERIFY OTP
// --------------------------------------------------

async function verifyPasswordResetOtp({
  username,
  otp,
}) {
  const user = db
    .prepare(`
      SELECT
        user_id,
        username,
        status
      FROM users
      WHERE username = ?
    `)
    .get(username);

  if (!user || user.status !== "ACTIVE") {
    throw createOtpError();
  }

  const reset = db
    .prepare(`
      SELECT
        reset_id,
        user_id,
        otp_hash,
        otp_attempts,
        expires_at,
        used_at,
        otp_verified_at
      FROM password_reset_tokens
      WHERE user_id = ?
        AND used_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `)
    .get(user.user_id);

  if (!reset) {
    throw createOtpError();
  }

  if (reset.otp_verified_at) {
    throw createOtpError();
  }

  if (
    new Date(reset.expires_at).getTime() <= Date.now()
  ) {
    throw createOtpError();
  }

  // Maximum 5 attempts
  if (reset.otp_attempts >= 5) {
    throw createOtpError();
  }

  const otpHash = hashOtp(otp);

  if (otpHash !== reset.otp_hash) {
    db.prepare(`
      UPDATE password_reset_tokens
      SET otp_attempts = otp_attempts + 1
      WHERE reset_id = ?
    `).run(reset.reset_id);

    createAuditLog({
      userId: user.user_id,
      action: "PASSWORD_RESET_OTP_FAILED",
      resourceType: "USER",
      resourceId: user.user_id,
    });

    throw createOtpError();
  }

  // OTP is valid
  const resetToken = generateResetToken();
  const resetTokenHash = hashResetToken(resetToken);

  db.prepare(`
    UPDATE password_reset_tokens
    SET
      token_hash = ?,
      otp_verified_at = CURRENT_TIMESTAMP
    WHERE reset_id = ?
  `).run(
    resetTokenHash,
    reset.reset_id
  );

  createAuditLog({
    userId: user.user_id,
    action: "PASSWORD_RESET_OTP_VERIFIED",
    resourceType: "USER",
    resourceId: user.user_id,
  });

  return {
    resetToken,
    expiresAt: reset.expires_at,
  };
}


// --------------------------------------------------
// RESET PASSWORD
// --------------------------------------------------

async function resetPassword({
  token,
  newPassword,
}) {
  const tokenHash = hashResetToken(token);

  const reset = db
    .prepare(`
      SELECT
        reset_id,
        user_id,
        expires_at,
        used_at,
        otp_verified_at
      FROM password_reset_tokens
      WHERE token_hash = ?
    `)
    .get(tokenHash);

  if (!reset) {
    throw createResetError();
  }

  if (reset.used_at) {
    throw createResetError();
  }

  if (!reset.otp_verified_at) {
    throw createResetError();
  }

  if (
    new Date(reset.expires_at).getTime() <= Date.now()
  ) {
    throw createResetError();
  }

  const passwordHash =
    await hashPassword(newPassword);

  db.transaction(() => {
    db.prepare(`
      UPDATE users
      SET
        password_hash = ?,
        token_version = token_version + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(
      passwordHash,
      reset.user_id
    );

    db.prepare(`
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE reset_id = ?
    `).run(reset.reset_id);
  })();

  createAuditLog({
    userId: reset.user_id,
    action: "PASSWORD_RESET_SUCCESS",
    resourceType: "USER",
    resourceId: reset.user_id,
  });

  return {
    success: true,
  };
}


// --------------------------------------------------
// ERRORS
// --------------------------------------------------

function createOtpError() {
  const error = new Error(
    "Invalid or expired OTP"
  );

  error.code = "INVALID_RESET_OTP";
  error.status = 400;

  return error;
}


function createResetError() {
  const error = new Error(
    "Invalid or expired reset token"
  );

  error.code = "INVALID_RESET_TOKEN";
  error.status = 400;

  return error;
}


module.exports = {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
};