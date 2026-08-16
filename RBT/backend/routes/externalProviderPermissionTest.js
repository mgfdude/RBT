const express = require("express");

const {
  requireProviderAuth,
} = require("../middleware/providerAuth");

const {
  requireProviderPermission,
} = require("../middleware/providerPermission");

const router = express.Router();

router.get(
  "/permission-test/payments",
  requireProviderAuth,
  requireProviderPermission("PAYMENTS_CREATE"),
  (req, res) => {
    return res.json({
      success: true,
      data: {
        message: "PAYMENTS_CREATE permission granted",
        provider: req.provider,
      },
    });
  }
);

router.get(
  "/permission-test/balance",
  requireProviderAuth,
  requireProviderPermission("BALANCE_READ"),
  (req, res) => {
    return res.json({
      success: true,
      data: {
        message: "BALANCE_READ permission granted",
        provider: req.provider,
      },
    });
  }
);

module.exports = router;