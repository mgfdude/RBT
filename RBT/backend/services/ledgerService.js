const crypto = require("crypto");

const db = require("../database/database");

function generateTransactionId() {
  return `TXN_${crypto.randomUUID()}`;
}

function generateLedgerEntryId() {
  return `LEDGER_${crypto.randomUUID()}`;
}

function createLedgerEntry({
  transactionId,
  bankId,
  accountId,
  entryType,
  amount,
  currency = "INR",
}) {
  if (!["DEBIT", "CREDIT"].includes(entryType)) {
    const error = new Error("Invalid ledger entry type");
    error.code = "INVALID_LEDGER_ENTRY_TYPE";
    error.status = 400;
    throw error;
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    const error = new Error("Ledger amount must be a positive integer");
    error.code = "INVALID_LEDGER_AMOUNT";
    error.status = 400;
    throw error;
  }

  const ledgerEntryId = generateLedgerEntryId();

  db.prepare(`
    INSERT INTO ledger_entries (
      ledger_entry_id,
      transaction_id,
      bank_id,
      account_id,
      entry_type,
      amount,
      currency
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    ledgerEntryId,
    transactionId,
    bankId,
    accountId,
    entryType,
    amount,
    currency
  );

  return ledgerEntryId;
}

module.exports = {
  generateTransactionId,
  createLedgerEntry,
};