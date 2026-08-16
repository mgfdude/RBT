const express = require("express");

const {
  requireProviderAuth,
} = require("../middleware/providerAuth");

const router = express.Router();

router.get(
  "/provider/me",
  requireProviderAuth,
  (req, res) => {
    return res.json({
      success: true,
      data: {
        provider: req.provider,
      },
    });
  }
);

module.exports = router;