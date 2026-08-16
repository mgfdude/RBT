const express = require("express");

const { requireAuth } = require("../middleware/auth");
const {
  requireBankContext,
} = require("../middleware/bankContext");
const { requireRole } = require("../middleware/role");

const {
  listCustomerTransactions,
  getCustomerTransaction,
} = require("../services/transactionService");

const router = express.Router();

// ==================================================
// LIST CUSTOMER TRANSACTIONS
// ==================================================

router.get(
  "/:bankId/transactions",
  requireAuth,
  requireBankContext,
  requireRole("CUSTOMER"),
  (req, res, next) => {
    try {
      const limit = req.query.limit
        ? Number(req.query.limit)
        : 50;

      const offset = req.query.offset
        ? Number(req.query.offset)
        : 0;

      const transactions = listCustomerTransactions({
        bankId: req.params.bankId,
        userId: req.user.userId,
        accountId: req.query.accountId || null,
        limit,
        offset,
      });

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            limit,
            offset,
            count: transactions.length,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================================================
// GET SINGLE CUSTOMER TRANSACTION
// ==================================================

router.get(
  "/:bankId/transactions/:transactionId",
  requireAuth,
  requireBankContext,
  requireRole("CUSTOMER"),
  (req, res, next) => {
    try {
      const transaction = getCustomerTransaction({
        bankId: req.params.bankId,
        userId: req.user.userId,
        transactionId: req.params.transactionId,
      });

      res.json({
        success: true,
        data: {
          transaction,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;