const express = require("express");

const {
  passwordResetLimiter,
} = require("../middleware/passwordResetLimiter");

const {
  passwordResetUsernameLimiter,
} = require("../middleware/passwordResetUsernameLimiter");

const {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
} = require("../services/passwordResetService");

const router = express.Router();

// --------------------------------------------------
// REQUEST PASSWORD RESET OTP
// --------------------------------------------------

router.post(
  "/password-reset/request",
  passwordResetLimiter,
  passwordResetUsernameLimiter,
  async (req, res, next) => {
    try {
      const { username } = req.body;

      if (
        typeof username !== "string" ||
        !username.trim()
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_USERNAME",
            message: "Username is required",
          },
        });
      }

      const result = await requestPasswordReset({
        username: username.trim(),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);


// --------------------------------------------------
// VERIFY PASSWORD RESET OTP
// --------------------------------------------------

router.post(
  "/password-reset/verify",
  async (req, res, next) => {
    try {
      const {
        username,
        otp,
      } = req.body;

      if (
        typeof username !== "string" ||
        !username.trim()
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_USERNAME",
            message: "Username is required",
          },
        });
      }

      if (
        typeof otp !== "string" ||
        !/^\d{6}$/.test(otp)
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_OTP_FORMAT",
            message: "OTP must be 6 digits",
          },
        });
      }

      const result =
        await verifyPasswordResetOtp({
          username: username.trim(),
          otp,
        });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);


// --------------------------------------------------
// CONFIRM PASSWORD RESET
// --------------------------------------------------

router.post(
  "/password-reset/confirm",
  async (req, res, next) => {
    try {
      const {
        token,
        newPassword,
      } = req.body;

      if (
        typeof token !== "string" ||
        !token.trim()
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_RESET_TOKEN",
            message: "Reset token is required",
          },
        });
      }

      if (
        typeof newPassword !== "string" ||
        newPassword.length < 8
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "WEAK_PASSWORD",
            message:
              "Password must be at least 8 characters",
          },
        });
      }

      const result = await resetPassword({
        token: token.trim(),
        newPassword,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);


module.exports = router;