const {
  sendVerificationOtpEmail,
} = require("../services/email/emailNotificationService");

async function main() {
  await sendVerificationOtpEmail({
    to: process.env.SMTP_USER,
    otp: "482913",
    otpExpiry: "5",
  });

  console.log("OTP template email sent successfully");
}

main().catch((error) => {
  console.error("OTP email test failed:");
  console.error(error);
  process.exit(1);
});