const express = require("express");

const {
  requireAuth,
} = require("../middleware/auth");

const {
  requireBankContext,
} = require("../middleware/bankContext");

const {
  requireRole,
} = require("../middleware/role");

const {
  createCustomerAccountByAdmin,
} = require("../services/adminCustomerService");

const router = express.Router();

// ==================================================
// ADMIN / MANAGER — OPEN CUSTOMER ACCOUNT
// ==================================================

router.post(
  "/:bankId/admin/customers",
  requireAuth,
  requireBankContext,
  requireRole("ADMIN", "MANAGER"),
  (req, res, next) => {
    try {
      const {
        fullName,
        email,
        phone,
        username,
        accountType,
        currency,
        temporaryPassword,
      } = req.body;

      const result =
        createCustomerAccountByAdmin({
          bankId: req.params.bankId,

          createdByUserId:
            req.user.userId,

          fullName,
          email,
          phone,
          username,

          accountType:
            accountType || "SAVINGS",

          currency:
            currency || "INR",

          temporaryPassword,
        });

      res.status(201).json({
        success: true,

        data: {
          customer:
            result.customer,

          account:
            result.account,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;