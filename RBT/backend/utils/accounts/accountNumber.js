const crypto = require("crypto");
const db = require("../../database/database");

const ACCOUNT_NUMBER_LENGTH = 12;
const MAX_ATTEMPTS = 10;

function generateRandomAccountNumber() {
  const min = 10 ** (ACCOUNT_NUMBER_LENGTH - 1);
  const max = 10 ** ACCOUNT_NUMBER_LENGTH;

  return String(
    crypto.randomInt(min, max)
  );
}

function generateUniqueAccountNumber() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const accountNumber = generateRandomAccountNumber();

    const existing = db
      .prepare(`
        SELECT account_id
        FROM accounts
        WHERE account_number = ?
      `)
      .get(accountNumber);

    if (!existing) {
      return accountNumber;
    }
  }

  const error = new Error(
    "Unable to generate a unique account number"
  );

  error.code = "ACCOUNT_NUMBER_GENERATION_FAILED";
  error.status = 500;

  throw error;
}

module.exports = {
  generateUniqueAccountNumber,
};