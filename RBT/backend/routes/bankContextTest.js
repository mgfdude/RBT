const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { requireBankContext } = require("../middleware/bankContext");
const { requireRole } = require("../middleware/role");

const router = express.Router();

router.get(
  "/:bankId/customer-test",
  requireAuth,
  requireBankContext,
  requireRole("CUSTOMER"),
  (req, res) => {
    res.json({
      success: true,
      data: {
        message: "Bank customer access verified",
        user: req.user,
        bank: {
          bankId: req.bank.bank_id,
          name: req.bank.name,
          code: req.bank.code,
        },
      },
    });
  }
);

module.exports = router;