const db = require("../../database/database");
const {hasBankAccess,} = require("./providerBankService");

function getAccountByNumber({
  providerId,
  bankId,
  accountNumber,
}) {
  if (
    typeof bankId !== "string" ||
    !bankId.trim()
  ) {
    const error = new Error("Bank ID is required");
    error.code = "BANK_ID_REQUIRED";
    error.status = 400;
    throw error;
  }

  if (
    typeof accountNumber !== "string" ||
    !accountNumber.trim()
  ) {
    const error = new Error("Account number is required");
    error.code = "ACCOUNT_NUMBER_REQUIRED";
    error.status = 400;
    throw error;
  }

    if (
    typeof providerId !== "string" ||
    !providerId.trim()
  ) {
    const error = new Error(
      "Provider ID is required"
    );

    error.code = "PROVIDER_ID_REQUIRED";
    error.status = 401;
    throw error;
  }

  const authorized =
    hasBankAccess({
      providerId: providerId.trim(),
      bankId: bankId.trim(),
    });

  if (!authorized) {
    const error = new Error(
      "Provider does not have access to this bank"
    );

    error.code = "PROVIDER_BANK_ACCESS_DENIED";
    error.status = 403;
    throw error;
  }

  const account = db
    .prepare(`
      SELECT
        account_id,
        account_number,
        bank_id,
        account_type,
        currency,
        balance,
        status,
        created_at
      FROM accounts
      WHERE bank_id = ?
        AND account_number = ?
    `)
    .get(
      bankId.trim(),
      accountNumber.trim()
    );

  if (!account) {
    const error = new Error("Account not found");
    error.code = "ACCOUNT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  return account;
}

function getAccountBalance({
  providerId,
  bankId,
  accountNumber,
}) {
  const account = getAccountByNumber({
    providerId,
    bankId,
    accountNumber,
  });

  return {
    accountId: account.account_id,
    accountNumber: account.account_number,
    bankId: account.bank_id,
    currency: account.currency,
    balance: account.balance,
    status: account.status,
  };
}

module.exports = {
  getAccountByNumber,
  getAccountBalance,
};