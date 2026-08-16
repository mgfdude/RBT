const { findBank } = require("../services/bankService");
const { createAuditLog } = require("../services/auditService");

function requireBankContext(req, res, next) {
  const requestedBankId = req.params.bankId;

  if (!requestedBankId) {
    return res.status(400).json({
      success: false,
      error: {
        code: "BANK_CONTEXT_REQUIRED",
        message: "Bank context is required",
      },
    });
  }

  const bank = findBank(requestedBankId);

  if (!bank) {
    return res.status(404).json({
      success: false,
      error: {
        code: "BANK_NOT_FOUND",
        message: "Bank not found",
      },
    });
  }

  if (bank.status !== "ACTIVE") {
    return res.status(403).json({
      success: false,
      error: {
        code: "BANK_INACTIVE",
        message: "Bank is not active",
      },
    });
  }

  // User must already be authenticated.
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required",
      },
    });
  }

  // Critical isolation check.
  if (req.user.bankId !== requestedBankId) {
  createAuditLog({
    bankId: requestedBankId,
    userId: req.user.userId,
    action: "BANK_ACCESS_DENIED",
    resourceType: "BANK",
    resourceId: requestedBankId,
    metadata: {
      userBankId: req.user.bankId,
    },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  return res.status(403).json({
    success: false,
    error: {
      code: "BANK_ACCESS_DENIED",
      message: "You do not have access to this bank",
    },
  });
}

  req.bank = bank;

  next();
}

module.exports = {
  requireBankContext,
};