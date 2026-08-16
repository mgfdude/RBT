const rateLimit = require("express-rate-limit");

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    error: {
      code: "PASSWORD_RESET_RATE_LIMITED",
      message: "Too many password reset requests. Try again later.",
    },
  },
});

module.exports = {
  passwordResetLimiter,
};