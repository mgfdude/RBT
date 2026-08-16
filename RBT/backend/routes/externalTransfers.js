const express = require("express");

const {
  requireProviderAuth,
} = require("../middleware/providerAuth");

const {
  requireProviderPermission,
} = require("../middleware/providerPermission");

const {
  transferBetweenAccounts,
} = require("../services/transactionService");

const router = express.Router();

router.post(
  "/transfers",
    requireProviderAuth,
  requireProviderPermission("PAYMENTS_CREATE"),
  (req, res, next) => {
    try {
      if (!req.provider) {
        return res.status(401).json({
          success: false,
          error: {
            code: "PROVIDER_AUTHENTICATION_REQUIRED",
            message: "Provider authentication required",
          },
        });
      }

      const {
        bankId,
        sourceAccountId,
        destinationAccountNumber,
        destinationIfscCode,
        amount,
        currency = "INR",
        reference = null,
       } = req.body;

       const idempotencyKey =
        req.headers["idempotency-key"];

      const result =
        transferBetweenAccounts({
          bankId,
          sourceAccountId,
          destinationAccountNumber,
          destinationIfscCode,
          amount,
          currency,

          authorization: {
            type: "PROVIDER",
            providerId:
              req.provider.providerId,
          },

          reference,
          idempotencyKey,
        });

      return res.status(200).json({
        success: true,
        data: {
          transfer: result,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;