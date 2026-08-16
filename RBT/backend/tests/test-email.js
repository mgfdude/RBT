const {
  verifyEmailConnection,
  sendEmail,
} = require("../services/email/emailService");

async function main() {
  await verifyEmailConnection();

  await sendEmail({
    to: process.env.SMTP_USER,
    subject: "RBT Bank SMTP Test",
    text: "This is a test email from the RBT Banking Core.",
    html: `
      <h2>RBT Bank SMTP Test</h2>
      <p>If you received this email, Gmail SMTP is working correctly.</p>
    `,
  });

  console.log("Test email sent successfully");
}

main().catch((error) => {
  console.error("Email test failed:");
  console.error(error);
  process.exit(1);
});