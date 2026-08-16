const express = require("express");

const {
  createVpa,
  findVpa,
  findVpaByUser,
  deactivateVpa,
} = require("../../services/upi/upiService");

const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

// --------------------------------------------------
// Create VPA
// --------------------------------------------------

router.post("/vpas", requireAuth, async (req, res, next) => {
  try {
    const {
      vpa,
      accountId,
    } = req.body;

    const result = await createVpa({
      userId: req.user.userId,
      bankId: req.user.bankId,
      accountId,
      vpa,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// Get own VPAs
// --------------------------------------------------

router.get("/vpas/me", requireAuth, async (req, res, next) => {
  try {
    const result = await findVpaByUser({
      userId: req.user.userId,
    });

    return res.json({
      success: true,
      data: {
        vpas: result,
      },
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// Lookup VPA
// --------------------------------------------------

router.get("/vpas/:vpa", async (req, res, next) => {
  try {
    const result = await findVpa(req.params.vpa);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: "VPA_NOT_FOUND",
          message: "VPA not found",
        },
      });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// --------------------------------------------------
// Deactivate own VPA
// --------------------------------------------------

router.delete(
  "/vpas/:vpa",
  requireAuth,
  async (req, res, next) => {
    try {
      const result = await deactivateVpa({
        userId: req.user.userId,
        vpa: req.params.vpa,
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