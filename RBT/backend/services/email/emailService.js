const nodemailer = require("nodemailer");
const env = require("../../config/env");
const logger = require("../../utils/logger");

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
});

async function verifyEmailConnection() {
  await transporter.verify();

  logger.info(
    {
      smtpHost: env.smtpHost,
      smtpUser: env.smtpUser,
    },
    "SMTP connection verified"
  );

  return true;
}

async function sendEmail({
  to,
  subject,
  text,
  html,
}) {
  if (!to) {
    const error = new Error("Recipient email is required");
    error.code = "EMAIL_RECIPIENT_REQUIRED";
    error.status = 400;
    throw error;
  }

  const info = await transporter.sendMail({
    from: `"RBT Bank" <${env.smtpUser}>`,
    to,
    subject,
    text,
    html,
  });

  logger.info(
    {
      messageId: info.messageId,
      to,
      subject,
    },
    "Email sent"
  );

  return {
    messageId: info.messageId,
  };
}

module.exports = {
  verifyEmailConnection,
  sendEmail,
};