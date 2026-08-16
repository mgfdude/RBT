const rateLimit = require("express-rate-limit");

const passwordResetUsernameLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,

  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    const username = req.body?.username;

    if (typeof username === "string" && username.trim()) {
      return `password-reset-user:${username.trim().toLowerCase()}`;
    }

    // Invalid/missing usernames are handled by the route validation.
    return "password-reset-user:unknown";
  },

  message: {
    success: false,
    error: {
      code: "PASSWORD_RESET_ACCOUNT_RATE_LIMITED",
      message: "Too many password reset requests. Try again later.",
    },
  },
});

module.exports = {
  passwordResetUsernameLimiter,
};