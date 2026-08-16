const express = require("express");

const { requireAuth } = require("../middleware/auth");

const {
  verifyMPIN,
} = require("../services/mpinService");

const {
  requireBankContext,
} = require("../middleware/bankContext");

const {
  transferSchema,
} = require("../validators/transactionSchemas");

const {
  transferBetweenAccounts,
} = require("../services/transactionService");

const router = express.Router();

// ==================================================
// CUSTOMER — INTERNAL TRANSFER
// ==================================================

router.post(
  "/:bankId/transfers",
  requireAuth,
  requireBankContext,
  async (req, res, next) => {
    try {
      // ------------------------------------------------
      // Only customers can initiate customer transfers
      // ------------------------------------------------

      if (req.user.role !== "CUSTOMER") {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message:
              "Only customers can initiate transfers",
          },
        });
      }

      // ------------------------------------------------
      // Extract MPIN separately
      // Do NOT put MPIN into transactionSchema
      // ------------------------------------------------

      const {
        mpin,
      } = req.body;

      // ------------------------------------------------
      // Validate transfer request
      // ------------------------------------------------

      const data =
        transferSchema.parse(req.body);

      // ------------------------------------------------
      // Idempotency key
      // ------------------------------------------------

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

      // ------------------------------------------------
      // Verify account MPIN
      // ------------------------------------------------

      await verifyMPIN({
        accountId:
          data.sourceAccountId,

        userId:
          req.user.userId,

        mpin,
      });

      // ------------------------------------------------
      // Execute atomic transfer
      // Destination account is resolved by
      // IFSC + account number
      // ------------------------------------------------

      const result =
        transferBetweenAccounts({
          bankId:
            req.params.bankId,

          sourceAccountId:
            data.sourceAccountId,

          destinationAccountNumber:
            data.destinationAccountNumber,

          destinationIfscCode:
            data.destinationIfscCode,

          amount:
            data.amountPaise,

          currency: "INR",

          userId:
            req.user.userId,

          reference:
            data.reference || null,

          idempotencyKey,
        });

      // ------------------------------------------------
      // Response
      // ------------------------------------------------

      return res.status(201).json({
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