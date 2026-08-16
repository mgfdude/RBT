const express = require("express");

const { requireAuth } = require("../middleware/auth");
const {
  requireBankContext,
} = require("../middleware/bankContext");
const { requireRole } = require("../middleware/role");

const {
  getAdminDashboard,
  listAdminAccounts,
  getAdminAccount,
  listAdminTransactions,
} = require("../services/adminDashboardService");

const {
  seedAccount,
  adminWithdrawAccount,
  transferBetweenAccounts,
} = require("../services/transactionService");

const {
  updateAccountStatus,
} = require("../services/accountService");

const router = express.Router();

const adminOnly = [
  requireAuth,
  requireBankContext,
  requireRole("ADMIN", "MANAGER"),
];

// ==================================================
// ADMIN DASHBOARD
// ==================================================

router.get(
  "/:bankId/admin/dashboard",
  ...adminOnly,
  (req, res, next) => {
    try {
      const dashboard =
        getAdminDashboard({
          bankId: req.params.bankId,
          userId: req.user.userId,
        });

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================================================
// LIST ACCOUNTS
// ==================================================

router.get(
  "/:bankId/admin/accounts",
  ...adminOnly,
  (req, res, next) => {
    try {
      const accounts =
        listAdminAccounts({
          bankId: req.params.bankId,
          userId: req.user.userId,
          search: req.query.search || "",
          status: req.query.status || null,
          limit: req.query.limit,
          offset: req.query.offset,
        });

      res.json({
        success: true,
        data: {
          accounts,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================================================
// GET ONE ACCOUNT
// ==================================================

router.get(
  "/:bankId/admin/accounts/:accountId",
  ...adminOnly,
  (req, res, next) => {
    try {
      const account =
        getAdminAccount({
          bankId: req.params.bankId,
          userId: req.user.userId,
          accountId:
            req.params.accountId,
        });

      res.json({
        success: true,
        data: {
          account,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================================================
// LIST TRANSACTIONS
// ==================================================

router.get(
  "/:bankId/admin/transactions",
  ...adminOnly,
  (req, res, next) => {
    try {
      const transactions =
        listAdminTransactions({
          bankId: req.params.bankId,
          userId: req.user.userId,
          accountId:
            req.query.accountId || null,
          limit: req.query.limit,
          offset: req.query.offset,
        });

      res.json({
        success: true,
        data: {
          transactions,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================================================
// DEPOSIT
// ==================================================

router.post(
  "/:bankId/admin/accounts/:accountId/deposit",
  ...adminOnly,
  (req, res, next) => {
    try {
      const amountPaise =
        Number(req.body.amountPaise);

      const idempotencyKey =
        req.get("Idempotency-Key");

      if (!idempotencyKey) {
        return res.status(400).json({
          success: false,
          error: {
            code:
              "IDEMPOTENCY_KEY_REQUIRED",
            message:
              "Idempotency-Key header is required",
          },
        });
      }

      const result =
        seedAccount({
          bankId: req.params.bankId,
          accountId:
            req.params.accountId,
          amount: amountPaise,
          currency: "INR",
          createdByUserId:
            req.user.userId,
          reference:
            req.body.reference ||
            "ADMIN DEPOSIT",
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
// WITHDRAW
// ==================================================

router.post(
  "/:bankId/admin/accounts/:accountId/withdraw",
  ...adminOnly,
  (req, res, next) => {
    try {
      const amountPaise =
        Number(req.body.amountPaise);

      const idempotencyKey =
        req.get("Idempotency-Key");

      if (!idempotencyKey) {
        return res.status(400).json({
          success: false,
          error: {
            code:
              "IDEMPOTENCY_KEY_REQUIRED",
            message:
              "Idempotency-Key header is required",
          },
        });
      }

      const result =
        adminWithdrawAccount({
          bankId: req.params.bankId,
          accountId:
            req.params.accountId,
          amount: amountPaise,
          currency: "INR",
          adminUserId:
            req.user.userId,
          reference:
            req.body.reference ||
            "ADMIN WITHDRAWAL",
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
// ADMIN TRANSFER
// ==================================================

router.post(
  "/:bankId/admin/transfers",
  ...adminOnly,
  (req, res, next) => {
    try {
      const idempotencyKey =
        req.get("Idempotency-Key");

      if (!idempotencyKey) {
        return res.status(400).json({
          success: false,
          error: {
            code:
              "IDEMPOTENCY_KEY_REQUIRED",
            message:
              "Idempotency-Key header is required",
          },
        });
      }

      const result =
        transferBetweenAccounts({
          bankId: req.params.bankId,

          sourceAccountId:
            req.body.sourceAccountId,

          destinationAccountNumber:
            req.body.destinationAccountNumber,

          destinationIfscCode:
            req.body.destinationIfscCode,

          amount:
            Number(req.body.amountPaise),

          currency: "INR",

          authorization: {
            type: "ADMIN",
            userId: req.user.userId,
          },

          reference:
            req.body.reference ||
            "ADMIN TRANSFER",

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
// BLOCK / UNBLOCK / CLOSE ACCOUNT
// ==================================================

router.patch(
  "/:bankId/admin/accounts/:accountId/status",
  ...adminOnly,
  (req, res, next) => {
    try {
      const account =
        updateAccountStatus({
          bankId: req.params.bankId,
          accountId:
            req.params.accountId,
          status: req.body.status,
          changedByUserId:
            req.user.userId,
        });

      res.json({
        success: true,
        data: {
          account,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
