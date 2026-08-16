const express = require("express");

const { requireAuth } = require("../middleware/auth");
const {
  requireBankContext,
} = require("../middleware/bankContext");

const {
  getMPINStatus,
  setMPIN,
  changeMPIN,
  requestMPINReset,
  verifyMPINResetOTP,
  completeMPINReset,
} = require("../services/mpinService");

const router = express.Router();

// ==================================================
// GET MPIN STATUS
// ==================================================

router.get(
  "/:bankId/accounts/:accountId/mpin",
  requireAuth,
  requireBankContext,
  async (req, res, next) => {
    try {
      const result = getMPINStatus({
        accountId: req.params.accountId,
        userId: req.user.userId,
      });

      res.json({
        success: true,
        data: {
          mpin: result,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================================================
// SET MPIN
// ==================================================

router.post(
  "/:bankId/accounts/:accountId/mpin",
  requireAuth,
  requireBankContext,
  async (req, res, next) => {
    try {
      const result = await setMPIN({
        accountId: req.params.accountId,
        userId: req.user.userId,
        mpin: req.body.mpin,
        confirmMpin: req.body.confirmMpin,
      });

      res.status(201).json({
        success: true,
        data: {
          mpin: result,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================================================
// CHANGE MPIN
// ==================================================

router.put(
  "/:bankId/accounts/:accountId/mpin",
  requireAuth,
  requireBankContext,
  async (req, res, next) => {
    try {
      const result = await changeMPIN({
        accountId: req.params.accountId,
        userId: req.user.userId,
        currentMpin: req.body.currentMpin,
        newMpin: req.body.newMpin,
        confirmMpin: req.body.confirmMpin,
      });

      res.json({
        success: true,
        data: {
          mpin: result,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================================================
// REQUEST MPIN RESET OTP
// ==================================================

router.post(
  "/:bankId/accounts/:accountId/mpin/reset/request",
  requireAuth,
  requireBankContext,
  async (req, res, next) => {
    try {
      const result = requestMPINReset({
        accountId: req.params.accountId,
        userId: req.user.userId,
      });

      res.json({
        success: true,
        data: {
          reset: result,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================================================
// VERIFY MPIN RESET OTP
// ==================================================

router.post(
  "/:bankId/accounts/:accountId/mpin/reset/verify",
  requireAuth,
  requireBankContext,
  async (req, res, next) => {
    try {
      const result = verifyMPINResetOTP({
        challengeId: req.body.challengeId,
        userId: req.user.userId,
        otp: req.body.otp,
      });

      res.json({
        success: true,
        data: {
          verification: result,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================================================
// COMPLETE MPIN RESET
// ==================================================

router.post(
  "/:bankId/accounts/:accountId/mpin/reset/complete",
  requireAuth,
  requireBankContext,
  async (req, res, next) => {
    try {
      const result = await completeMPINReset({
        challengeId: req.body.challengeId,
        userId: req.user.userId,
        accountId: req.params.accountId,
        newMpin: req.body.newMpin,
        confirmMpin: req.body.confirmMpin,
      });

      res.json({
        success: true,
        data: {
          mpin: result,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;