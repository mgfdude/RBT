const crypto = require("crypto");

const db = require("../../database/database");

const {
  sendVerificationOtpEmail,
} = require("../email/emailNotificationService");

const { createAuditLog } = require("../auditService");

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
}

function generateChallengeId() {
  return `OTP_${crypto.randomUUID()}`;
}

async function createOtpChallenge({
  userId,
  purpose,
}) {
  // --------------------------------------------------
  // Validate user
  // --------------------------------------------------

  const user = db
    .prepare(`
      SELECT
        user_id,
        username,
        email,
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
    error.code = "USER_INACTIVE";
    error.status = 403;
    throw error;
  }

  if (!user.email) {
    const error = new Error(
      "User does not have a registered email"
    );

    error.code = "EMAIL_NOT_REGISTERED";
    error.status = 400;
    throw error;
  }

  // --------------------------------------------------
  // Generate OTP
  // --------------------------------------------------

  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  const challengeId = generateChallengeId();

  const expiresAt = new Date(
    Date.now() +
      OTP_EXPIRY_MINUTES * 60 * 1000
  ).toISOString();

  // --------------------------------------------------
  // Invalidate previous active challenges
  // --------------------------------------------------

  db.prepare(`
    UPDATE otp_challenges
    SET
      verified_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
      AND purpose = ?
      AND verified_at IS NULL
  `).run(
    userId,
    purpose
  );

  // --------------------------------------------------
  // Store OTP hash
  // --------------------------------------------------

  db.prepare(`
    INSERT INTO otp_challenges (
      challenge_id,
      user_id,
      purpose,
      otp_hash,
      expires_at,
      attempts,
      max_attempts
    )
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(
    challengeId,
    userId,
    purpose,
    otpHash,
    expiresAt,
    MAX_ATTEMPTS
  );

  // --------------------------------------------------
  // Send OTP
  // --------------------------------------------------

  await sendVerificationOtpEmail({
    to: user.email,
    otp,
    otpExpiry: OTP_EXPIRY_MINUTES,
  });

  // --------------------------------------------------
  // Audit
  // --------------------------------------------------

  createAuditLog({
    userId,
    action: "OTP_REQUESTED",
    resourceType: "OTP_CHALLENGE",
    resourceId: challengeId,
    metadata: {
      purpose,
    },
  });

  return {
    challengeId,
    expiresAt,
  };
}

async function verifyOtp({
  userId,
  challengeId,
  otp,
}) {
  // --------------------------------------------------
  // Find challenge
  // --------------------------------------------------

  const challenge = db
    .prepare(`
      SELECT
        challenge_id,
        user_id,
        purpose,
        otp_hash,
        expires_at,
        attempts,
        max_attempts,
        verified_at
      FROM otp_challenges
      WHERE challenge_id = ?
        AND user_id = ?
    `)
    .get(
      challengeId,
      userId
    );

  if (!challenge) {
    throw createOtpError();
  }

  // --------------------------------------------------
  // Already verified
  // --------------------------------------------------

  if (challenge.verified_at) {
    throw createOtpError();
  }

  // --------------------------------------------------
  // Expired
  // --------------------------------------------------

  if (
    new Date(challenge.expires_at).getTime() <=
    Date.now()
  ) {
    throw createOtpError();
  }

  // --------------------------------------------------
  // Attempts exceeded
  // --------------------------------------------------

  if (
    challenge.attempts >=
    challenge.max_attempts
  ) {
    throw createOtpError();
  }

  const submittedHash = hashOtp(
    String(otp)
  );

  const valid = crypto.timingSafeEqual(
    Buffer.from(submittedHash, "hex"),
    Buffer.from(challenge.otp_hash, "hex")
  );

  if (!valid) {
    db.prepare(`
      UPDATE otp_challenges
      SET attempts = attempts + 1
      WHERE challenge_id = ?
    `).run(challengeId);

    createAuditLog({
      userId,
      action: "OTP_VERIFICATION_FAILED",
      resourceType: "OTP_CHALLENGE",
      resourceId: challengeId,
      metadata: {
        purpose: challenge.purpose,
      },
    });

    throw createOtpError();
  }

  // --------------------------------------------------
  // Mark verified
  // --------------------------------------------------

  db.prepare(`
    UPDATE otp_challenges
    SET verified_at = CURRENT_TIMESTAMP
    WHERE challenge_id = ?
  `).run(challengeId);

  createAuditLog({
    userId,
    action: "OTP_VERIFICATION_SUCCESS",
    resourceType: "OTP_CHALLENGE",
    resourceId: challengeId,
    metadata: {
      purpose: challenge.purpose,
    },
  });

  return {
    verified: true,
    purpose: challenge.purpose,
  };
}

function createOtpError() {
  const error = new Error(
    "Invalid or expired OTP"
  );

  error.code = "INVALID_OTP";
  error.status = 400;

  return error;
}

module.exports = {
  createOtpChallenge,
  verifyOtp,
};