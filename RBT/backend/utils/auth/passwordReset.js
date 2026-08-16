const crypto = require("crypto");

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function generateOtp() {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
}

function hashOtp(otp) {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
}

module.exports = {
  generateResetToken,
  hashResetToken,
  generateOtp,
  hashOtp,
};