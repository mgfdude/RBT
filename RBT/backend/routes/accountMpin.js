const express = require("express");

const {
  requireAuth,
} = require("../middleware/auth");

const {
  getMPINStatus,
  setMPIN,
  changeMPIN,
  requestMPINReset,
  verifyMPINResetOTP,
  completeMPINReset,
} = require("../services/mpinService");

const router = express.Router();

// --------------------------------------------------
// GET MPIN STATUS
// --------------------------------------------------

router.get(
  "/accounts/:accountId/mpin",
  requireAuth,
  (req, res, next) => {
    try {
      const result = getMPINStatus({
        accountId: req.params.accountId,
        userId: req.user.userId,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// --------------------------------------------------
// SET MPIN
// --------------------------------------------------

router.post(
  "/accounts/:accountId/mpin",
  requireAuth,
  async (req, res, next) => {
    try {
      const {
        mpin,
        confirmMpin,
      } = req.body;

      const result = await setMPIN({
        accountId: req.params.accountId,
        userId: req.user.userId,
        mpin,
        confirmMpin,
      });

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// --------------------------------------------------
// CHANGE MPIN
// --------------------------------------------------

router.post(
  "/accounts/:accountId/mpin/change",
  requireAuth,
  async (req, res, next) => {
    try {
      const {
        currentMpin,
        newMpin,
        confirmMpin,
      } = req.body;

      const result = await changeMPIN({
        accountId: req.params.accountId,
        userId: req.user.userId,
        currentMpin,
        newMpin,
        confirmMpin,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// --------------------------------------------------
// REQUEST MPIN RESET OTP
// --------------------------------------------------

router.post(
  "/accounts/:accountId/mpin/reset/request",
  requireAuth,
  (req, res, next) => {
    try {
      const result = requestMPINReset({
        accountId: req.params.accountId,
        userId: req.user.userId,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// --------------------------------------------------
// VERIFY MPIN RESET OTP
// --------------------------------------------------

router.post(
  "/accounts/:accountId/mpin/reset/verify",
  requireAuth,
  (req, res, next) => {
    try {
      const {
        challengeId,
        otp,
      } = req.body;

      const result = verifyMPINResetOTP({
        challengeId,
        userId: req.user.userId,
        otp,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// --------------------------------------------------
// COMPLETE MPIN RESET
// --------------------------------------------------

router.post(
  "/accounts/:accountId/mpin/reset/complete",
  requireAuth,
  async (req, res, next) => {
    try {
      const {
        challengeId,
        newMpin,
        confirmMpin,
      } = req.body;

      const result =
        await completeMPINReset({
          challengeId,
          userId: req.user.userId,
          accountId: req.params.accountId,
          newMpin,
          confirmMpin,
        });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
