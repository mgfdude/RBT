const { verifyAccessToken } = require("../utils/auth/jwt");
const { createAuditLog } = require("../services/auditService");
const db = require("../database/database");

function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        },
      });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_AUTHORIZATION",
          message: "Invalid authorization header",
        },
      });
    }

    // Verify JWT signature and expiration
    const payload = verifyAccessToken(token);

    // --------------------------------------------------
    // Verify user still exists
    // --------------------------------------------------

    const user = db
      .prepare(`
        SELECT
          user_id,
          token_version,
          status
        FROM users
        WHERE user_id = ?
      `)
      .get(payload.user_id);

    if (!user) {
      const error = new Error("User not found");
      error.code = "INVALID_TOKEN";
      error.status = 401;
      throw error;
    }

    // --------------------------------------------------
    // Verify user is still active
    // --------------------------------------------------

    if (user.status !== "ACTIVE") {
      const error = new Error("User account is not active");
      error.code = "USER_INACTIVE";
      error.status = 403;
      throw error;
    }

    // --------------------------------------------------
    // Verify JWT token version
    // --------------------------------------------------

    if (
      payload.token_version === undefined ||
      user.token_version !== payload.token_version
    ) {
      const error = new Error("Token has been revoked");
      error.code = "TOKEN_REVOKED";
      error.status = 401;
      throw error;
    }

    // --------------------------------------------------
    // Attach authenticated user
    // --------------------------------------------------

    req.user = {
      userId: payload.user_id,
      bankId: payload.bank_id,
      role: payload.role,
    };

    next();

  } catch (error) {
  createAuditLog({
    action: "AUTH_TOKEN_INVALID",
    resourceType: "AUTH",
    metadata: {
      reason:
        error.code === "TOKEN_REVOKED"
          ? "TOKEN_REVOKED"
          : "INVALID_OR_EXPIRED_TOKEN",
    },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  return res.status(error.status || 401).json({
    success: false,
    error: {
      code: error.code || "INVALID_TOKEN",
      message:
        error.code === "TOKEN_REVOKED"
          ? "Access token has been revoked"
          : error.code === "USER_INACTIVE"
            ? "User account is not active"
            : "Invalid or expired access token",
    },
  });
}
}

module.exports = {
  requireAuth,
};