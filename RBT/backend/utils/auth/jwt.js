const jwt = require("jsonwebtoken");
const env = require("../../config/env");

function generateAccessToken({
  userId,
  bankId,
  role,
  tokenVersion = 0,
}) {
  return jwt.sign(
    {
      user_id: userId,
      bank_id: bankId,
      role,
      token_version: tokenVersion,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};