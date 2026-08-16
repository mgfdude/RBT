const express = require("express");

const { requireAuth } = require("../middleware/auth");
const {
  requireBankContext,
} = require("../middleware/bankContext");
const { requireRole } = require("../middleware/role");

const {
  createAccountSchema,
} = require("../validators/accountSchemas");

const {
  createCustomerAccount,
  listCustomerAccounts,
  getCustomerAccount,
} = require("../services/accountService");

const router = express.Router();

// --------------------------------------------------
// CREATE ACCOUNT
// --------------------------------------------------

router.post(
  "/:bankId/accounts",
  requireAuth,
  requireBankContext,
  requireRole("CUSTOMER"),
  (req, res, next) => {
    try {
      const data = createAccountSchema.parse(req.body);

      const account = createCustomerAccount({
        bankId: req.params.bankId,
        userId: req.user.userId,
        accountType: data.accountType,
        currency: data.currency,
      });

      res.status(201).json({
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

// --------------------------------------------------
// LIST MY ACCOUNTS
// --------------------------------------------------

router.get(
  "/:bankId/accounts",
  requireAuth,
  requireBankContext,
  requireRole("CUSTOMER"),
  (req, res, next) => {
    try {
      const accounts = listCustomerAccounts({
        bankId: req.params.bankId,
        userId: req.user.userId,
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

// --------------------------------------------------
// GET ONE OF MY ACCOUNTS
// --------------------------------------------------

router.get(
  "/:bankId/accounts/:accountId",
  requireAuth,
  requireBankContext,
  requireRole("CUSTOMER"),
  (req, res, next) => {
    try {
      const account = getCustomerAccount({
        bankId: req.params.bankId,
        userId: req.user.userId,
        accountId: req.params.accountId,
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