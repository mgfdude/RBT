const express = require("express");

const { requireAuth } = require("../middleware/auth");
const {
  requireBankContext,
} = require("../middleware/bankContext");
const { requireRole } = require("../middleware/role");

const {
  updateAccountStatus,
} = require("../services/accountService");

const router = express.Router();

router.patch(
  "/:bankId/accounts/:accountId/status",
  requireAuth,
  requireBankContext,
  requireRole("ADMIN", "MANAGER"),
  (req, res, next) => {
    try {
      const { status } = req.body;

      const account = updateAccountStatus({
        bankId: req.params.bankId,
        accountId: req.params.accountId,
        status,
        changedByUserId: req.user.userId,
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