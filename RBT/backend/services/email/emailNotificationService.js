const { sendEmail } = require("./emailService");
const { loadTemplate } = require("./emailTemplateLoader");

async function sendTemplateEmail({
  to,
  template,
  subject,
  text,
  variables,
}) {
  const html = loadTemplate(template, variables);

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
}

// ==================================================
// OTP
// ==================================================

function sendVerificationOtpEmail({
  to,
  otp,
  otpExpiry,
}) {
  return sendTemplateEmail({
    to,
    template: "otp/verification-otp.html",
    subject: "Your RBT Bank verification code",
    text: `Your RBT Bank verification code is ${otp}. It expires in ${otpExpiry} minutes.`,
    variables: {
      OTP: otp,
      OTP_EXPIRY: otpExpiry,
    },
  });
}

function sendLoginOtpEmail({
  to,
  otp,
  otpExpiry,
}) {
  return sendTemplateEmail({
    to,
    template: "otp/login-otp.html",
    subject: "Your RBT Bank login verification code",
    text: `Your RBT Bank login verification code is ${otp}. It expires in ${otpExpiry} minutes.`,
    variables: {
      OTP: otp,
      OTP_EXPIRY: otpExpiry,
    },
  });
}

function sendPaymentOtpEmail({
  to,
  otp,
  otpExpiry,
}) {
  return sendTemplateEmail({
    to,
    template: "otp/payment-otp.html",
    subject: "Your RBT Bank payment verification code",
    text: `Your RBT Bank payment verification code is ${otp}. It expires in ${otpExpiry} minutes.`,
    variables: {
      OTP: otp,
      OTP_EXPIRY: otpExpiry,
    },
  });
}

function sendUpiOtpEmail({
  to,
  otp,
  otpExpiry,
}) {
  return sendTemplateEmail({
    to,
    template: "otp/upi-otp.html",
    subject: "Your RBT Bank UPI verification code",
    text: `Your RBT Bank UPI verification code is ${otp}. It expires in ${otpExpiry} minutes.`,
    variables: {
      OTP: otp,
      OTP_EXPIRY: otpExpiry,
    },
  });
}

function sendGatewayOtpEmail({
  to,
  otp,
  otpExpiry,
}) {
  return sendTemplateEmail({
    to,
    template: "otp/gateway-otp.html",
    subject: "Your RBT Bank gateway verification code",
    text: `Your RBT Bank gateway verification code is ${otp}. It expires in ${otpExpiry} minutes.`,
    variables: {
      OTP: otp,
      OTP_EXPIRY: otpExpiry,
    },
  });
}

// ==================================================
// SECURITY
// ==================================================

function sendLoginAlertEmail({
  to,
  username,
  dateTime,
  ipAddress,
  device,
  browser,
  location,
}) {
  return sendTemplateEmail({
    to,
    template: "security/login-alert.html",
    subject: "RBT Bank login alert",
    text: `A login to your RBT Bank account was detected at ${dateTime}.`,
    variables: {
      USERNAME: username,
      DATE_TIME: dateTime,
      IP_ADDRESS: ipAddress,
      DEVICE: device,
      BROWSER: browser,
      LOCATION: location,
    },
  });
}

function sendNewLoginEmail({
  to,
  username,
  dateTime,
  ipAddress,
  device,
  browser,
  location,
}) {
  return sendTemplateEmail({
    to,
    template: "security/new-login.html",
    subject: "New login detected on your RBT Bank account",
    text: `A new login was detected at ${dateTime}.`,
    variables: {
      USERNAME: username,
      DATE_TIME: dateTime,
      IP_ADDRESS: ipAddress,
      DEVICE: device,
      BROWSER: browser,
      LOCATION: location,
    },
  });
}

function sendFailedLoginEmail({
  to,
  username,
  dateTime,
  ipAddress,
  device,
  browser,
  location,
}) {
  return sendTemplateEmail({
    to,
    template: "security/failed-login.html",
    subject: "Failed RBT Bank login attempt",
    text: `A failed login attempt was detected at ${dateTime}.`,
    variables: {
      USERNAME: username,
      DATE_TIME: dateTime,
      IP_ADDRESS: ipAddress,
      DEVICE: device,
      BROWSER: browser,
      LOCATION: location,
    },
  });
}

function sendPasswordChangedEmail({
  to,
  username,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "security/password-changed.html",
    subject: "Your RBT Bank password was changed",
    text: `Your RBT Bank password was changed at ${dateTime}.`,
    variables: {
      USERNAME: username,
      DATE_TIME: dateTime,
    },
  });
}

function sendPasswordResetEmail({
  to,
  username,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "security/password-reset.html",
    subject: "RBT Bank password reset",
    text: `A password reset was completed at ${dateTime}.`,
    variables: {
      USERNAME: username,
      DATE_TIME: dateTime,
    },
  });
}

function sendAccountLockedEmail({
  to,
  username,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "security/account-locked.html",
    subject: "Your RBT Bank account has been locked",
    text: `Your RBT Bank account was locked at ${dateTime}.`,
    variables: {
      USERNAME: username,
      DATE_TIME: dateTime,
    },
  });
}

function sendSuspiciousActivityEmail({
  to,
  username,
  dateTime,
  ipAddress,
  device,
  browser,
  location,
}) {
  return sendTemplateEmail({
    to,
    template: "security/suspicious-activity.html",
    subject: "Suspicious activity detected",
    text: `Suspicious activity was detected on your RBT Bank account at ${dateTime}.`,
    variables: {
      USERNAME: username,
      DATE_TIME: dateTime,
      IP_ADDRESS: ipAddress,
      DEVICE: device,
      BROWSER: browser,
      LOCATION: location,
    },
  });
}

// ==================================================
// TRANSACTIONS
// ==================================================

function sendTransactionEmail({
  to,
  template,
  subject,
  accountNumber,
  amount,
  currency,
  dateTime,
  reference,
  status,
  transactionId,
}) {
  return sendTemplateEmail({
    to,
    template,
    subject,
    text: `A ${status} transaction of ${currency} ${amount} was recorded on your RBT Bank account.`,
    variables: {
      ACCOUNT_NUMBER: accountNumber,
      AMOUNT: amount,
      CURRENCY: currency,
      DATE_TIME: dateTime,
      REFERENCE: reference,
      STATUS: status,
      TRANSACTION_ID: transactionId,
    },
  });
}

function sendDebitEmail(data) {
  return sendTransactionEmail({
    ...data,
    template: "transactions/debit.html",
    subject: "RBT Bank debit transaction",
  });
}

function sendCreditEmail(data) {
  return sendTransactionEmail({
    ...data,
    template: "transactions/credit.html",
    subject: "RBT Bank credit transaction",
  });
}

function sendTransferSuccessEmail(data) {
  return sendTransactionEmail({
    ...data,
    template: "transactions/transfer-success.html",
    subject: "RBT Bank transfer successful",
  });
}

function sendTransferFailedEmail(data) {
  return sendTransactionEmail({
    ...data,
    template: "transactions/transfer-failed.html",
    subject: "RBT Bank transfer failed",
  });
}

function sendTransferPendingEmail(data) {
  return sendTransactionEmail({
    ...data,
    template: "transactions/transfer-pending.html",
    subject: "RBT Bank transfer pending",
  });
}

function sendTransactionReversedEmail(data) {
  return sendTransactionEmail({
    ...data,
    template: "transactions/transaction-reversed.html",
    subject: "RBT Bank transaction reversed",
  });
}

// ==================================================
// UPI
// ==================================================

function sendUpiConnectionRequestEmail({
  to,
  gatewayName,
  vpa,
  accountNumber,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "upi/connection-request.html",
    subject: "UPI connection request",
    text: `${gatewayName} requested a UPI connection at ${dateTime}.`,
    variables: {
      GATEWAY_NAME: gatewayName,
      VPA: vpa,
      ACCOUNT_NUMBER: accountNumber,
      DATE_TIME: dateTime,
    },
  });
}

function sendUpiConnectionSuccessEmail({
  to,
  gatewayName,
  vpa,
  accountNumber,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "upi/connection-success.html",
    subject: "UPI connection successful",
    text: `Your UPI connection with ${gatewayName} was successful.`,
    variables: {
      GATEWAY_NAME: gatewayName,
      VPA: vpa,
      ACCOUNT_NUMBER: accountNumber,
      DATE_TIME: dateTime,
    },
  });
}

function sendUpiConnectionRevokedEmail({
  to,
  gatewayName,
  vpa,
  accountNumber,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "upi/connection-revoked.html",
    subject: "UPI connection revoked",
    text: `Your UPI connection with ${gatewayName} was revoked.`,
    variables: {
      GATEWAY_NAME: gatewayName,
      VPA: vpa,
      ACCOUNT_NUMBER: accountNumber,
      DATE_TIME: dateTime,
    },
  });
}

function sendUpiPaymentEmail({
  to,
  template,
  subject,
  vpa,
  accountNumber,
  amount,
  currency,
  dateTime,
  reference,
  status,
  transactionId,
}) {
  return sendTemplateEmail({
    to,
    template,
    subject,
    text: `UPI payment status: ${status}. Amount: ${currency} ${amount}.`,
    variables: {
      VPA: vpa,
      ACCOUNT_NUMBER: accountNumber,
      AMOUNT: amount,
      CURRENCY: currency,
      DATE_TIME: dateTime,
      REFERENCE: reference,
      STATUS: status,
      TRANSACTION_ID: transactionId,
    },
  });
}

function sendUpiPaymentSuccessEmail(data) {
  return sendUpiPaymentEmail({
    ...data,
    template: "upi/payment-success.html",
    subject: "UPI payment successful",
  });
}

function sendUpiPaymentFailedEmail(data) {
  return sendUpiPaymentEmail({
    ...data,
    template: "upi/payment-failed.html",
    subject: "UPI payment failed",
  });
}

function sendUpiPaymentPendingEmail(data) {
  return sendUpiPaymentEmail({
    ...data,
    template: "upi/payment-pending.html",
    subject: "UPI payment pending",
  });
}

function sendUpiPaymentReversedEmail(data) {
  return sendUpiPaymentEmail({
    ...data,
    template: "upi/payment-reversed.html",
    subject: "UPI payment reversed",
  });
}

// ==================================================
// GATEWAY
// ==================================================

function sendGatewayConnectionRequestEmail({
  to,
  gatewayName,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "gateway/connection-request.html",
    subject: "Gateway connection request",
    text: `${gatewayName} requested a connection at ${dateTime}.`,
    variables: {
      GATEWAY_NAME: gatewayName,
      DATE_TIME: dateTime,
    },
  });
}

function sendGatewayConnectionSuccessEmail({
  to,
  gatewayName,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "gateway/connection-success.html",
    subject: "Gateway connection successful",
    text: `Gateway ${gatewayName} was successfully connected.`,
    variables: {
      GATEWAY_NAME: gatewayName,
      DATE_TIME: dateTime,
    },
  });
}

function sendGatewayConnectionRevokedEmail({
  to,
  gatewayName,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "gateway/connection-revoked.html",
    subject: "Gateway connection revoked",
    text: `Gateway ${gatewayName} connection was revoked.`,
    variables: {
      GATEWAY_NAME: gatewayName,
      DATE_TIME: dateTime,
    },
  });
}

function sendGatewayApiKeyCreatedEmail({
  to,
  gatewayName,
  keyId,
  keyLast4,
  environment,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "gateway/api-key-created.html",
    subject: "Gateway API key created",
    text: `A gateway API key was created for ${gatewayName}.`,
    variables: {
      GATEWAY_NAME: gatewayName,
      KEY_ID: keyId,
      KEY_LAST4: keyLast4,
      ENVIRONMENT: environment,
      DATE_TIME: dateTime,
    },
  });
}

function sendGatewayApiKeyRevokedEmail({
  to,
  gatewayName,
  keyId,
  keyLast4,
  environment,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "gateway/api-key-revoked.html",
    subject: "Gateway API key revoked",
    text: `A gateway API key was revoked for ${gatewayName}.`,
    variables: {
      GATEWAY_NAME: gatewayName,
      KEY_ID: keyId,
      KEY_LAST4: keyLast4,
      ENVIRONMENT: environment,
      DATE_TIME: dateTime,
    },
  });
}

function sendGatewayPaymentEmail({
  to,
  template,
  subject,
  gatewayName,
  amount,
  currency,
  dateTime,
  reference,
  status,
  transactionId,
}) {
  return sendTemplateEmail({
    to,
    template,
    subject,
    text: `Gateway payment status: ${status}. Amount: ${currency} ${amount}.`,
    variables: {
      GATEWAY_NAME: gatewayName,
      AMOUNT: amount,
      CURRENCY: currency,
      DATE_TIME: dateTime,
      REFERENCE: reference,
      STATUS: status,
      TRANSACTION_ID: transactionId,
    },
  });
}

function sendGatewayPaymentSuccessEmail(data) {
  return sendGatewayPaymentEmail({
    ...data,
    template: "gateway/payment-success.html",
    subject: "Gateway payment successful",
  });
}

function sendGatewayPaymentFailedEmail(data) {
  return sendGatewayPaymentEmail({
    ...data,
    template: "gateway/payment-failed.html",
    subject: "Gateway payment failed",
  });
}

// ==================================================
// MERCHANT
// ==================================================

function sendMerchantConnectionEmail({
  to,
  template,
  subject,
  merchantName,
  merchantId,
  gatewayName,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template,
    subject,
    text: `${merchantName} (${merchantId}) has a gateway connection update.`,
    variables: {
      MERCHANT_NAME: merchantName,
      MERCHANT_ID: merchantId,
      GATEWAY_NAME: gatewayName,
      DATE_TIME: dateTime,
    },
  });
}

function sendMerchantConnectedEmail(data) {
  return sendMerchantConnectionEmail({
    ...data,
    template: "merchant/connected.html",
    subject: "Merchant connected",
  });
}

function sendMerchantDisconnectedEmail(data) {
  return sendMerchantConnectionEmail({
    ...data,
    template: "merchant/disconnected.html",
    subject: "Merchant disconnected",
  });
}

function sendMerchantPaymentEmail({
  to,
  template,
  subject,
  merchantName,
  merchantId,
  gatewayName,
  amount,
  currency,
  dateTime,
  reference,
  status,
  transactionId,
}) {
  return sendTemplateEmail({
    to,
    template,
    subject,
    text: `Merchant payment status: ${status}. Amount: ${currency} ${amount}.`,
    variables: {
      MERCHANT_NAME: merchantName,
      MERCHANT_ID: merchantId,
      GATEWAY_NAME: gatewayName,
      AMOUNT: amount,
      CURRENCY: currency,
      DATE_TIME: dateTime,
      REFERENCE: reference,
      STATUS: status,
      TRANSACTION_ID: transactionId,
    },
  });
}

function sendMerchantPaymentSuccessEmail(data) {
  return sendMerchantPaymentEmail({
    ...data,
    template: "merchant/payment-success.html",
    subject: "Merchant payment successful",
  });
}

function sendMerchantPaymentFailedEmail(data) {
  return sendMerchantPaymentEmail({
    ...data,
    template: "merchant/payment-failed.html",
    subject: "Merchant payment failed",
  });
}

// ==================================================
// ACCOUNT
// ==================================================

function sendAccountEmail({
  to,
  template,
  subject,
  username,
  customerName,
  accountNumber,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template,
    subject,
    text: `${subject}.`,
    variables: {
      USERNAME: username,
      CUSTOMER_NAME: customerName,
      ACCOUNT_NUMBER: accountNumber,
      DATE_TIME: dateTime,
    },
  });
}

function sendAccountCreatedEmail(data) {
  return sendAccountEmail({
    ...data,
    template: "account/account-created.html",
    subject: "Bank account created",
  });
}

function sendAccountActivatedEmail(data) {
  return sendAccountEmail({
    ...data,
    template: "account/account-activated.html",
    subject: "Bank account activated",
  });
}

function sendAccountBlockedEmail(data) {
  return sendAccountEmail({
    ...data,
    template: "account/account-blocked.html",
    subject: "Bank account blocked",
  });
}

function sendAccountClosedEmail(data) {
  return sendAccountEmail({
    ...data,
    template: "account/account-closed.html",
    subject: "Bank account closed",
  });
}

function sendEmailChangedEmail({
  to,
  username,
  customerName,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "account/email-changed.html",
    subject: "RBT Bank email address changed",
    text: `The email address for your RBT Bank account was changed at ${dateTime}.`,
    variables: {
      USERNAME: username,
      CUSTOMER_NAME: customerName,
      DATE_TIME: dateTime,
    },
  });
}

function sendMobileChangedEmail({
  to,
  username,
  customerName,
  dateTime,
}) {
  return sendTemplateEmail({
    to,
    template: "account/mobile-changed.html",
    subject: "RBT Bank mobile number changed",
    text: `The mobile number for your RBT Bank account was changed at ${dateTime}.`,
    variables: {
      USERNAME: username,
      CUSTOMER_NAME: customerName,
      DATE_TIME: dateTime,
    },
  });
}

// ==================================================
// NOTIFICATIONS
// ==================================================

function sendNotificationEmail({
  to,
  template,
  subject,
  title,
  message,
  dateTime,
  status,
}) {
  return sendTemplateEmail({
    to,
    template,
    subject,
    text: `${title}\n\n${message}`,
    variables: {
      TITLE: title,
      MESSAGE: message,
      DATE_TIME: dateTime,
      STATUS: status,
    },
  });
}

function sendGeneralNotificationEmail(data) {
  return sendNotificationEmail({
    ...data,
    template: "notifications/general.html",
    subject: data.title || "RBT Bank notification",
  });
}

function sendMaintenanceEmail(data) {
  return sendNotificationEmail({
    ...data,
    template: "notifications/maintenance.html",
    subject: data.title || "RBT Bank maintenance notification",
  });
}

function sendOutageEmail(data) {
  return sendNotificationEmail({
    ...data,
    template: "notifications/outage.html",
    subject: data.title || "RBT Bank service outage",
  });
}

function sendServiceRestoredEmail(data) {
  return sendNotificationEmail({
    ...data,
    template: "notifications/service-restored.html",
    subject: data.title || "RBT Bank service restored",
  });
}

function sendSecurityNotificationEmail(data) {
  return sendNotificationEmail({
    ...data,
    template: "notifications/security.html",
    subject: data.title || "RBT Bank security notification",
  });
}

module.exports = {
  sendVerificationOtpEmail,
  sendLoginOtpEmail,
  sendPaymentOtpEmail,
  sendUpiOtpEmail,
  sendGatewayOtpEmail,

  sendLoginAlertEmail,
  sendNewLoginEmail,
  sendFailedLoginEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendAccountLockedEmail,
  sendSuspiciousActivityEmail,

  sendDebitEmail,
  sendCreditEmail,
  sendTransferSuccessEmail,
  sendTransferFailedEmail,
  sendTransferPendingEmail,
  sendTransactionReversedEmail,

  sendUpiConnectionRequestEmail,
  sendUpiConnectionSuccessEmail,
  sendUpiConnectionRevokedEmail,
  sendUpiPaymentSuccessEmail,
  sendUpiPaymentFailedEmail,
  sendUpiPaymentPendingEmail,
  sendUpiPaymentReversedEmail,

  sendGatewayConnectionRequestEmail,
  sendGatewayConnectionSuccessEmail,
  sendGatewayConnectionRevokedEmail,
  sendGatewayApiKeyCreatedEmail,
  sendGatewayApiKeyRevokedEmail,
  sendGatewayPaymentSuccessEmail,
  sendGatewayPaymentFailedEmail,

  sendMerchantConnectedEmail,
  sendMerchantDisconnectedEmail,
  sendMerchantPaymentSuccessEmail,
  sendMerchantPaymentFailedEmail,

  sendAccountCreatedEmail,
  sendAccountActivatedEmail,
  sendAccountBlockedEmail,
  sendAccountClosedEmail,
  sendEmailChangedEmail,
  sendMobileChangedEmail,

  sendGeneralNotificationEmail,
  sendMaintenanceEmail,
  sendOutageEmail,
  sendServiceRestoredEmail,
  sendSecurityNotificationEmail,
};