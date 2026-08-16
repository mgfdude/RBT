const express = require("express");
const { requireAuth } = require("../middleware/auth");

const {
  registerSchema,
  loginSchema,
} = require("../validators/authSchemas");

const {
  registerCustomer,
  loginCustomer,
} = require("../services/authService");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const result = await registerCustomer(data);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const result = await loginCustomer(data);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

module.exports = router;