const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",

  port: Number(process.env.PORT) || 8080,

  databasePath: path.resolve(
    process.cwd(),
    process.env.DATABASE_PATH || "./database/banking.db"
  ),

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
    smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",

  smtpPort: Number(process.env.SMTP_PORT) || 465,

  smtpSecure:
    String(process.env.SMTP_SECURE).toLowerCase() === "true",

  smtpUser: process.env.SMTP_USER,

  smtpPass: process.env.SMTP_PASS,
};

if (!env.jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

module.exports = env;