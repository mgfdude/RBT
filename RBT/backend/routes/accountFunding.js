const express = require("express");

const { requireAuth } = require("../middleware/auth");
const {
  requireBankContext,
} = require("../middleware/bankContext");
const { requireRole } = require("../middleware/role");

const {
  seedAccountSchema,
} = require("../validators/transactionSchemas");

const {
  seedAccount,
  withdrawAccount,
} = require("../services/transactionService");

const router = express.Router();

// ==================================================
// ADMIN / MANAGER — SEED ACCOUNT
// ==================================================

router.post(
  "/:bankId/accounts/:accountId/seed",
  requireAuth,
  requireBankContext,
  requireRole("ADMIN", "MANAGER"),
  (req, res, next) => {
    try {
      // ----------------------------------------------
      // Validate request body
      // ----------------------------------------------

      const data = seedAccountSchema.parse(req.body);

      // ----------------------------------------------
      // Idempotency key
      // ----------------------------------------------

      const idempotencyKey =
        req.get("Idempotency-Key");

      if (!idempotencyKey) {
        return res.status(400).json({
          success: false,
          error: {
            code: "IDEMPOTENCY_KEY_REQUIRED",
            message:
              "Idempotency-Key header is required",
          },
        });
      }

      // ----------------------------------------------
      // Seed account
      // ----------------------------------------------

      const result = seedAccount({
        bankId: req.params.bankId,
        accountId: req.params.accountId,
        amount: data.amountPaise,
        currency: "INR",
        createdByUserId: req.user.userId,
        reference: data.reference || null,
        idempotencyKey,
      });

      res.status(201).json({
        success: true,
        data: {
          transaction: result,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================================================
// CUSTOMER — WITHDRAW FROM OWN ACCOUNT
// ==================================================

router.post(
  "/:bankId/accounts/:accountId/withdraw",
  requireAuth,
  requireBankContext,
  (req, res, next) => {
    try {
      // ----------------------------------------------
      // Only customers can use customer withdrawal
      // ----------------------------------------------

      if (req.user.role !== "CUSTOMER") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message:
              "Only customers can withdraw from accounts",
          },
        });
      }

      // ----------------------------------------------
      // Validate request body
      // ----------------------------------------------

      const data = seedAccountSchema.parse(req.body);

      // ----------------------------------------------
      // Idempotency key
      // ----------------------------------------------

      const idempotencyKey =
        req.get("Idempotency-Key");

      if (!idempotencyKey) {
        return res.status(400).json({
          success: false,
          error: {
            code: "IDEMPOTENCY_KEY_REQUIRED",
            message:
              "Idempotency-Key header is required",
          },
        });
      }

      // ----------------------------------------------
      // Withdraw
      // ----------------------------------------------

      const result = withdrawAccount({
        bankId: req.params.bankId,
        accountId: req.params.accountId,
        amount: data.amountPaise,
        currency: "INR",
        userId: req.user.userId,
        reference: data.reference || null,
        idempotencyKey,
      });

      res.status(201).json({
        success: true,
        data: {
          transaction: result,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);


module.exports = router;