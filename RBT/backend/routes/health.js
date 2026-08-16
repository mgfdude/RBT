const express = require("express");
const db = require("../database/database");

const router = express.Router();

router.get("/", (req, res) => {
  let database = "disconnected";

  try {
    db.prepare("SELECT 1").get();
    database = "connected";
  } catch {
    database = "disconnected";
  }

  res.json({
    status: database === "connected" ? "ok" : "error",
    service: "rbt-bank-server",
    database,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;