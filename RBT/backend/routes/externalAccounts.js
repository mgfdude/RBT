const express = require("express");

const {
  requireProviderAuth,
} = require("../middleware/providerAuth");

const {
  requireProviderPermission,
} = require("../middleware/providerPermission");

const {
  getAccountByNumber,
  getAccountBalance,
} = require("../services/provider/externalAccountService");

const router = express.Router();

router.get(
  "/accounts/:bankId/:accountNumber",
  requireProviderAuth,
  requireProviderPermission("ACCOUNTS_READ"),
  (req, res, next) => {
    try {
      const account = getAccountByNumber({
        providerId: req.provider.providerId,
        bankId: req.params.bankId,
        accountNumber: req.params.accountNumber,
      });

      return res.json({
        success: true,
        data: {
          account: {
            accountId: account.account_id,
            accountNumber: account.account_number,
            bankId: account.bank_id,
            accountType: account.account_type,
            currency: account.currency,
            status: account.status,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/accounts/:bankId/:accountNumber/balance",
  requireProviderAuth,
  requireProviderPermission("BALANCE_READ"),
  (req, res, next) => {
    try {
      const balance = getAccountBalance({
        providerId: req.provider.providerId,
        bankId: req.params.bankId,
        accountNumber: req.params.accountNumber,
      });

      return res.json({
        success: true,
        data: {
          balance,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;