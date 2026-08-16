const express = require("express");
const http = require("http");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");

const env = require("./config/env");
const logger = require("./utils/logger");
const healthRouter = require("./routes/health");
const authRouter = require("./routes/auth");
const bankContextTestRouter = require("./routes/bankContextTest");
const accountsRouter = require("./routes/accounts");
const accountFundingRouter = require("./routes/accountFunding");
const accountTransfersRouter = require("./routes/accountTransfers");
const transactionsRouter = require("./routes/transactions");
const accountAdminRouter = require("./routes/accountAdmin");
const passwordResetRouter = require("./routes/passwordReset");
const upiRouter = require("./routes/upi/upi");
const externalProviderRouter = require("./routes/externalProvider");
const externalProviderPermissionTestRouter = require("./routes/externalProviderPermissionTest");
const externalAccountsRouter = require("./routes/externalAccounts");
const externalTransfersRouter = require("./routes/externalTransfers");

// Initialize database
require("./database/database");

const { initializeBanks } = require("./services/bankService");

initializeBanks();

const app = express();
const server = http.createServer(app);

app.disable("x-powered-by");

// --------------------------------------------------
// GLOBAL MIDDLEWARE
// --------------------------------------------------

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Parse request bodies BEFORE routes
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// HTTP logging BEFORE routes
app.use(
  pinoHttp({
    logger,
  })
);

// --------------------------------------------------
// ROUTES
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    service: "RBT Bank Server",
    status: "running",
    environment: env.nodeEnv,
  });
});

app.use("/health", healthRouter);

app.use("/api/auth", authRouter);

app.use("/api/auth", passwordResetRouter);

app.use("/api/banks", bankContextTestRouter);

app.use("/api/banks", accountsRouter);

app.use("/api/banks", accountFundingRouter);

app.use("/api/banks", accountTransfersRouter);

app.use("/api/banks", transactionsRouter);

app.use("/api/banks", accountAdminRouter);

app.use("/api/upi", upiRouter);

app.use("/api/external/v1", externalProviderRouter);

app.use("/api/external/v1", externalProviderPermissionTestRouter);

app.use("/api/external/v1",externalAccountsRouter);

app.use("/api/external/v1",externalTransfersRouter);

// --------------------------------------------------
// 404
// --------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use((err, req, res, next) => {
  logger.error(
    {
      error: err.message,
      stack: err.stack,
    },
    "Request error"
  );

  if (err.name === "ZodError") {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  const status = err.status || 500;

  res.status(status).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message:
        status >= 500
          ? "Internal server error"
          : err.message,
    },
  });
});

// --------------------------------------------------
// SERVER
// --------------------------------------------------

server.listen(env.port, () => {
  logger.info(
    {
      port: env.port,
      environment: env.nodeEnv,
    },
    "RBT Bank Server started"
  );
});