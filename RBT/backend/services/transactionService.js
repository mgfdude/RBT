const crypto = require("crypto");

const db = require("../database/database");
const { createAuditLog } = require("./auditService");
const { assertPositiveAmount } = require("../utils/money/amount");
const { createLedgerEntry } = require("./ledgerService");
const { findBankByIfsc } = require("./bankService");

const {
  hasBankAccess,
} = require("./provider/providerBankService");

const {
  getAccountAuthorization,
} = require("./provider/providerAccountAuthorizationService");

2

function generateTransactionId() {
  return `TXN_${crypto.randomUUID()}`;
}

// --================================================
// Resolve destination account by IFSC + account number
// --================================================
//
// This function looks up a destination account using:
// 1. IFSC code to find the bank
// 2. Account number within that bank
//
// Returns the account details or throws error if not found
function resolveDestinationAccount({
  ifscCode,
  accountNumber,
}) {
  // ------------------------------------------------
  // Validate input
  // ------------------------------------------------

  if (!ifscCode || typeof ifscCode !== "string") {
    const error = new Error("IFSC code is required");
    error.code = "INVALID_IFSC";
    error.status = 400;
    throw error;
  }

  if (!accountNumber || typeof accountNumber !== "string") {
    const error = new Error("Account number is required");
    error.code = "INVALID_ACCOUNT_NUMBER";
    error.status = 400;
    throw error;
  }

  // ------------------------------------------------
  // Find bank by IFSC
  // ------------------------------------------------

  const bank = findBankByIfsc(ifscCode);

  if (!bank) {
    const error = new Error(
      "Bank with specified IFSC code not found"
    );

    error.code = "BANK_NOT_FOUND_BY_IFSC";
    error.status = 404;
    throw error;
  }

  if (bank.status !== "ACTIVE") {
    const error = new Error(
      "Bank is not active"
    );

    error.code = "BANK_INACTIVE";
    error.status = 403;
    throw error;
  }

  // ------------------------------------------------
  // Find account by number within this bank
  // ------------------------------------------------

  const account = db
    .prepare(`
      SELECT
        account_id,
        account_number,
        bank_id,
        user_id,
        currency,
        balance,
        status
      FROM accounts
      WHERE account_number = ?
        AND bank_id = ?
    `)
    .get(
      accountNumber.trim(),
      bank.bank_id
    );

  if (!account) {
    const error = new Error(
      "Destination account not found"
    );

    error.code = "DESTINATION_ACCOUNT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  // ------------------------------------------------
  // Verify account status
  // ------------------------------------------------

  if (account.status === "BLOCKED") {
    const error = new Error(
      "Destination account is blocked"
    );

    error.code = "DESTINATION_ACCOUNT_BLOCKED";
    error.status = 403;
    throw error;
  }

  if (account.status === "CLOSED") {
    const error = new Error(
      "Destination account is closed"
    );

    error.code = "DESTINATION_ACCOUNT_CLOSED";
    error.status = 403;
    throw error;
  }

  if (account.status !== "ACTIVE") {
    const error = new Error(
      "Destination account is not active"
    );

    error.code = "DESTINATION_ACCOUNT_NOT_ACTIVE";
    error.status = 403;
    throw error;
  }

  return account;
}

function seedAccount({
  bankId,
  accountId,
  amount,
  currency = "INR",
  createdByUserId,
  reference = null,
  idempotencyKey,
}) {
  // --------------------------------------------------
  // 1. Validate amount
  // --------------------------------------------------

  assertPositiveAmount(amount);

  // --------------------------------------------------
  // 2. Validate currency
  // --------------------------------------------------

  if (currency !== "INR") {
    const error = new Error("Only INR is supported");
    error.code = "UNSUPPORTED_CURRENCY";
    error.status = 400;
    throw error;
  }

  // --------------------------------------------------
  // 3. Validate idempotency key
  // --------------------------------------------------

  if (
    typeof idempotencyKey !== "string" ||
    idempotencyKey.trim().length < 8 ||
    idempotencyKey.trim().length > 100
  ) {
    const error = new Error(
      "Valid idempotency key is required"
    );

    error.code = "IDEMPOTENCY_KEY_REQUIRED";
    error.status = 400;

    throw error;
  }

  idempotencyKey = idempotencyKey.trim();

  // --------------------------------------------------
  // 4. Generate transaction ID
  // --------------------------------------------------

  const transactionId = generateTransactionId();

  // --------------------------------------------------
  // 5. Atomic money operation
  // --------------------------------------------------

  const result = db.transaction(() => {
    // ----------------------------------------------
    // Check for previous request with same key
    // ----------------------------------------------

    const existingTransaction = db
      .prepare(`
        SELECT
          transaction_id,
          bank_id,
          destination_account_id,
          amount,
          currency,
          type,
          status,
          reference
        FROM transactions
        WHERE bank_id = ?
          AND idempotency_key = ?
      `)
      .get(
        bankId,
        idempotencyKey
      );

    if (existingTransaction) {
      // --------------------------------------------
      // Same key must represent same operation
      // --------------------------------------------

      if (
        existingTransaction.destination_account_id !== accountId ||
        existingTransaction.amount !== amount ||
        existingTransaction.currency !== currency ||
        existingTransaction.type !== "SEED"
      ) {
        const error = new Error(
          "Idempotency key was already used for a different operation"
        );

        error.code = "IDEMPOTENCY_CONFLICT";
        error.status = 409;

        throw error;
      }

      return {
        transactionId:
          existingTransaction.transaction_id,

        accountId,

        amount:
          existingTransaction.amount,

        currency:
          existingTransaction.currency,

        status:
          existingTransaction.status,

        reference:
          existingTransaction.reference,

        idempotentReplay: true,
      };
    }

    // ----------------------------------------------
    // Find account
    // ----------------------------------------------

    const account = db
      .prepare(`
        SELECT
          account_id,
          bank_id,
          account_number,
          currency,
          balance,
          status
        FROM accounts
        WHERE account_id = ?
          AND bank_id = ?
      `)
      .get(
        accountId,
        bankId
      );

    if (!account) {
      const error = new Error("Account not found");
      error.code = "ACCOUNT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // ----------------------------------------------
    // Account must be active
    // ----------------------------------------------

    if (account.status !== "ACTIVE") {
      const error = new Error(
        "Account is not active"
      );

      error.code = "ACCOUNT_NOT_ACTIVE";
      error.status = 403;
      throw error;
    }

    // ----------------------------------------------
    // Currency check
    // ----------------------------------------------

    if (account.currency !== currency) {
      const error = new Error(
        "Currency mismatch"
      );

      error.code = "CURRENCY_MISMATCH";
      error.status = 400;
      throw error;
    }

    // ----------------------------------------------
    // Prevent integer overflow
    // ----------------------------------------------

    const newBalance =
      account.balance + amount;

    if (!Number.isSafeInteger(newBalance)) {
      const error = new Error(
        "Balance limit exceeded"
      );

      error.code = "BALANCE_LIMIT_EXCEEDED";
      error.status = 400;
      throw error;
    }

    // ----------------------------------------------
    // Create transaction
    // ----------------------------------------------

    db.prepare(`
      INSERT INTO transactions (
        transaction_id,
        bank_id,
        source_account_id,
        destination_account_id,
        amount,
        currency,
        type,
        status,
        reference,
        idempotency_key
      )
      VALUES (
        ?,
        ?,
        NULL,
        ?,
        ?,
        ?,
        'SEED',
        'PROCESSING',
        ?,
        ?
      )
    `).run(
      transactionId,
      bankId,
      accountId,
      amount,
      currency,
      reference,
      idempotencyKey
    );

    // ----------------------------------------------
    // Update account balance
    // ----------------------------------------------

    db.prepare(`
      UPDATE accounts
      SET
        balance = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
        AND bank_id = ?
    `).run(
      newBalance,
      accountId,
      bankId
    );

    // ----------------------------------------------
    // Create CREDIT ledger entry
    // ----------------------------------------------

    createLedgerEntry({
      transactionId,
      bankId,
      accountId,
      entryType: "CREDIT",
      amount,
      currency,
    });

    // ----------------------------------------------
    // Mark transaction successful
    // ----------------------------------------------

    db.prepare(`
      UPDATE transactions
      SET
        status = 'SUCCESS',
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE transaction_id = ?
    `).run(transactionId);

    return {
      transactionId,
      accountId,
      accountNumber:
        account.account_number,
      amount,
      currency,
      previousBalance:
        account.balance,
      newBalance,
      status: "SUCCESS",
      reference,
      idempotentReplay: false,
    };
  })();

  // --------------------------------------------------
  // 6. Audit only original operation
  // --------------------------------------------------

  if (!result.idempotentReplay) {
    createAuditLog({
      bankId,
      userId: createdByUserId,
      action: "ACCOUNT_SEEDED",
      resourceType: "TRANSACTION",
      resourceId: result.transactionId,
      metadata: {
        accountId: result.accountId,
        amount: result.amount,
        currency: result.currency,
        reference: reference || null,
        idempotencyKey,
      },
    });
  }

  return result;
}

function withdrawAccount({
  bankId,
  accountId,
  amount,
  currency = "INR",
  userId,
  reference = null,
  idempotencyKey,
}) {
  // --------------------------------------------------
  // 1. Validate amount
  // --------------------------------------------------

  assertPositiveAmount(amount);

  // --------------------------------------------------
  // 2. Validate currency
  // --------------------------------------------------

  if (currency !== "INR") {
    const error = new Error("Only INR is supported");
    error.code = "UNSUPPORTED_CURRENCY";
    error.status = 400;
    throw error;
  }

  // --------------------------------------------------
  // 3. Validate idempotency key
  // --------------------------------------------------

  if (
    typeof idempotencyKey !== "string" ||
    idempotencyKey.trim().length < 8 ||
    idempotencyKey.trim().length > 100
  ) {
    const error = new Error(
      "Valid idempotency key is required"
    );

    error.code = "IDEMPOTENCY_KEY_REQUIRED";
    error.status = 400;

    throw error;
  }

  idempotencyKey = idempotencyKey.trim();

  // --------------------------------------------------
  // 4. Atomic withdrawal
  // --------------------------------------------------

  const transactionId = generateTransactionId();

  const result = db.transaction(() => {
    // ----------------------------------------------
    // Check previous request
    // ----------------------------------------------

    const existingTransaction = db
      .prepare(`
        SELECT
          transaction_id,
          bank_id,
          source_account_id,
          amount,
          currency,
          type,
          status,
          reference
        FROM transactions
        WHERE bank_id = ?
          AND idempotency_key = ?
      `)
      .get(
        bankId,
        idempotencyKey
      );

    if (existingTransaction) {
      // --------------------------------------------
      // Same key must represent same operation
      // --------------------------------------------

      if (
        existingTransaction.source_account_id !== accountId ||
        existingTransaction.amount !== amount ||
        existingTransaction.currency !== currency ||
        existingTransaction.type !== "DEBIT"
      ) {
        const error = new Error(
          "Idempotency key was already used for a different operation"
        );

        error.code = "IDEMPOTENCY_CONFLICT";
        error.status = 409;

        throw error;
      }

      return {
        transactionId:
          existingTransaction.transaction_id,

        accountId,

        amount:
          existingTransaction.amount,

        currency:
          existingTransaction.currency,

        status:
          existingTransaction.status,

        reference:
          existingTransaction.reference,

        idempotentReplay: true,
      };
    }

    // ----------------------------------------------
    // Find account owned by requesting user
    // ----------------------------------------------

    const account = db
      .prepare(`
        SELECT
          account_id,
          bank_id,
          user_id,
          account_number,
          currency,
          balance,
          status
        FROM accounts
        WHERE account_id = ?
          AND bank_id = ?
          AND user_id = ?
      `)
      .get(
        accountId,
        bankId,
        userId
      );

    if (!account) {
      const error = new Error("Account not found");
      error.code = "ACCOUNT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // ----------------------------------------------
    // Account must be active
    // ----------------------------------------------

    if (account.status !== "ACTIVE") {
      const error = new Error(
        "Account is not active"
      );

      error.code = "ACCOUNT_NOT_ACTIVE";
      error.status = 403;
      throw error;
    }

    // ----------------------------------------------
    // Currency check
    // ----------------------------------------------

    if (account.currency !== currency) {
      const error = new Error(
        "Currency mismatch"
      );

      error.code = "CURRENCY_MISMATCH";
      error.status = 400;
      throw error;
    }

    // ----------------------------------------------
    // Sufficient balance
    // ----------------------------------------------

    if (account.balance < amount) {
      const error = new Error(
        "Insufficient account balance"
      );

      error.code = "INSUFFICIENT_FUNDS";
      error.status = 400;
      throw error;
    }

    // ----------------------------------------------
    // Calculate new balance
    // ----------------------------------------------

    const newBalance =
      account.balance - amount;

    // ----------------------------------------------
    // Create DEBIT transaction
    // ----------------------------------------------

    db.prepare(`
      INSERT INTO transactions (
        transaction_id,
        bank_id,
        source_account_id,
        destination_account_id,
        amount,
        currency,
        type,
        status,
        reference,
        idempotency_key
      )
      VALUES (
        ?,
        ?,
        ?,
        NULL,
        ?,
        ?,
        'DEBIT',
        'PROCESSING',
        ?,
        ?
      )
    `).run(
      transactionId,
      bankId,
      accountId,
      amount,
      currency,
      reference,
      idempotencyKey
    );

    // ----------------------------------------------
    // Decrease balance
    // ----------------------------------------------

    db.prepare(`
      UPDATE accounts
      SET
        balance = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
        AND bank_id = ?
        AND user_id = ?
    `).run(
      newBalance,
      accountId,
      bankId,
      userId
    );

    // ----------------------------------------------
    // Create DEBIT ledger entry
    // ----------------------------------------------

    createLedgerEntry({
      transactionId,
      bankId,
      accountId,
      entryType: "DEBIT",
      amount,
      currency,
    });

    // ----------------------------------------------
    // Mark transaction successful
    // ----------------------------------------------

    db.prepare(`
      UPDATE transactions
      SET
        status = 'SUCCESS',
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE transaction_id = ?
    `).run(transactionId);

    return {
      transactionId,
      accountId,
      accountNumber:
        account.account_number,
      amount,
      currency,
      previousBalance:
        account.balance,
      newBalance,
      status: "SUCCESS",
      reference,
      idempotentReplay: false,
    };
  })();

  // --------------------------------------------------
  // 5. Audit original operation only
  // --------------------------------------------------

  if (!result.idempotentReplay) {
    createAuditLog({
      bankId,
      userId,
      action: "ACCOUNT_WITHDRAWAL",
      resourceType: "TRANSACTION",
      resourceId: result.transactionId,
      metadata: {
        accountId: result.accountId,
        amount: result.amount,
        currency: result.currency,
        reference: reference || null,
        idempotencyKey,
      },
    });
  }

  return result;
}

function transferBetweenAccounts({
  bankId,
  sourceAccountId,
  destinationAccountNumber,
  destinationIfscCode,
  amount,
  currency = "INR",

  authorization,

  reference = null,
  idempotencyKey,
}) {
  // --------------------------------------------------
  // 1. Validate authorization context
  // --------------------------------------------------

  if (
    !authorization ||
    typeof authorization !== "object"
  ) {
    const error = new Error(
      "Authorization context is required"
    );

    error.code = "AUTHORIZATION_REQUIRED";
    error.status = 401;

    throw error;
  }

  const authorizationType =
    authorization.type;

  if (
    authorizationType !== "USER" &&
    authorizationType !== "PROVIDER"
  ) {
    const error = new Error(
      "Invalid authorization type"
    );

    error.code = "INVALID_AUTHORIZATION_TYPE";
    error.status = 401;

    throw error;
  }

  // --------------------------------------------------
  // 2. Resolve authorization identity
  // --------------------------------------------------

  let userId = null;
  let providerId = null;

  // --------------------------------------------------
  // USER authorization
  // --------------------------------------------------

  if (authorizationType === "USER") {
    if (
      typeof authorization.userId !== "string" ||
      !authorization.userId.trim()
    ) {
      const error = new Error(
        "User ID is required"
      );

      error.code = "USER_ID_REQUIRED";
      error.status = 401;

      throw error;
    }

    userId =
      authorization.userId.trim();
  }

 // --------------------------------------------------
// PROVIDER authorization
// --------------------------------------------------

if (authorizationType === "PROVIDER") {
  if (
    typeof authorization.providerId !== "string" ||
    !authorization.providerId.trim()
  ) {
    const error = new Error(
      "Provider ID is required"
    );

    error.code = "PROVIDER_ID_REQUIRED";
    error.status = 401;

    throw error;
  }

  providerId =
    authorization.providerId.trim();

  // ----------------------------------------------
  // 1. Provider must have access to this bank
  // ----------------------------------------------

  const bankAuthorized =
    hasBankAccess({
      providerId,
      bankId,
    });

  if (!bankAuthorized) {
    const error = new Error(
      "Provider does not have access to this bank"
    );

    error.code =
      "PROVIDER_BANK_ACCESS_DENIED";

    error.status = 403;

    throw error;
  }

  // ----------------------------------------------
  // 2. Provider must have access to this account
  // ----------------------------------------------

  const accountAuthorization =
    getAccountAuthorization({
      providerId,
      accountId: sourceAccountId,
    });

  if (!accountAuthorization) {
    const error = new Error(
      "Provider does not have authorization for this account"
    );

    error.code =
      "PROVIDER_ACCOUNT_ACCESS_DENIED";

    error.status = 403;

    throw error;
  }

  // ----------------------------------------------
  // 3. Authorization must be active
  // ----------------------------------------------

  if (
    accountAuthorization.status !==
    "ACTIVE"
  ) {
    const error = new Error(
      "Provider account authorization is not active"
    );

    error.code =
      "PROVIDER_ACCOUNT_AUTHORIZATION_INACTIVE";

    error.status = 403;

    throw error;
  }

  // ----------------------------------------------
  // 4. Check authorization expiry
  // ----------------------------------------------

  if (
    accountAuthorization.expires_at
  ) {
    const expiryTime =
      Date.parse(
        accountAuthorization.expires_at
      );

    if (
      Number.isNaN(expiryTime) ||
      expiryTime <= Date.now()
    ) {
      const error = new Error(
        "Provider account authorization has expired"
      );

      error.code =
        "PROVIDER_ACCOUNT_AUTHORIZATION_EXPIRED";

      error.status = 403;

      throw error;
    }
  }

  // ----------------------------------------------
  // 5. Check maximum transaction amount
  // ----------------------------------------------

  if (
    accountAuthorization.max_amount !== null &&
    amount > accountAuthorization.max_amount
  ) {
    const error = new Error(
      "Transfer amount exceeds provider account authorization limit"
    );

    error.code =
      "PROVIDER_ACCOUNT_AMOUNT_LIMIT_EXCEEDED";

    error.status = 403;

    throw error;
  }
}

  // --------------------------------------------------
  // 3. Validate amount
  // --------------------------------------------------

  assertPositiveAmount(amount);

  // --------------------------------------------------
// PROVIDER ACCOUNT AUTHORIZATION AMOUNT CHECK
// --------------------------------------------------

if (authorizationType === "PROVIDER") {
  const accountAuthorization =
    getAccountAuthorization({
      providerId,
      accountId: sourceAccountId,
    });

  if (!accountAuthorization) {
    const error = new Error(
      "Provider does not have authorization for this account"
    );

    error.code =
      "PROVIDER_ACCOUNT_ACCESS_DENIED";

    error.status = 403;

    throw error;
  }

  if (
    accountAuthorization.status !==
    "ACTIVE"
  ) {
    const error = new Error(
      "Provider account authorization is not active"
    );

    error.code =
      "PROVIDER_ACCOUNT_AUTHORIZATION_INACTIVE";

    error.status = 403;

    throw error;
  }

  if (
    accountAuthorization.expires_at
  ) {
    const expiryTime =
      Date.parse(
        accountAuthorization.expires_at
      );

    if (
      Number.isNaN(expiryTime) ||
      expiryTime <= Date.now()
    ) {
      const error = new Error(
        "Provider account authorization has expired"
      );

      error.code =
        "PROVIDER_ACCOUNT_AUTHORIZATION_EXPIRED";

      error.status = 403;

      throw error;
    }
  }

  if (
    accountAuthorization.max_amount !== null &&
    amount > accountAuthorization.max_amount
  ) {
    const error = new Error(
      "Transfer amount exceeds provider account authorization limit"
    );

    error.code =
      "PROVIDER_ACCOUNT_AMOUNT_LIMIT_EXCEEDED";

    error.status = 403;

    throw error;
  }
}

  // --------------------------------------------------
  // 4. Validate currency
  // --------------------------------------------------

  if (currency !== "INR") {
    const error = new Error("Only INR is supported");
    error.code = "UNSUPPORTED_CURRENCY";
    error.status = 400;
    throw error;
  }

  // --------------------------------------------------
  // 5. Validate idempotency key
  // --------------------------------------------------

  if (
    typeof idempotencyKey !== "string" ||
    idempotencyKey.trim().length < 8 ||
    idempotencyKey.trim().length > 100
  ) {
    const error = new Error(
      "Valid idempotency key is required"
    );

    error.code = "IDEMPOTENCY_KEY_REQUIRED";
    error.status = 400;

    throw error;
  }

  idempotencyKey = idempotencyKey.trim();

  const transactionId =
    generateTransactionId();

  // --------------------------------------------------
  // 6. Resolve destination account
  // --------------------------------------------------
  //
  // Use IFSC code + account number to find
  // the destination account.
  //
  // This ensures the account is from the
  // correct bank.
  // --------------------------------------------------

  let destinationAccount;

  try {
    destinationAccount =
      resolveDestinationAccount({
        ifscCode:
          destinationIfscCode,

        accountNumber:
          destinationAccountNumber,
      });
  } catch (error) {
    throw error;
  }

  const destinationAccountId =
    destinationAccount.account_id;

  // --------------------------------------------------
  // 7. Source and destination cannot be same
  // --------------------------------------------------

  if (
    sourceAccountId ===
    destinationAccountId
  ) {
    const error = new Error(
      "Source and destination accounts must be different"
    );

    error.code =
      "SAME_ACCOUNT_TRANSFER";

    error.status = 400;

    throw error;
  }

  // --------------------------------------------------
  // 8. Atomic transfer
  // --------------------------------------------------

  const result = db.transaction(() => {
    // ----------------------------------------------
    // Check idempotency
    //
    // Use source + destination account IDs for
    // idempotency check.
    // ----------------------------------------------

    const existingTransaction = db
      .prepare(`
        SELECT
          transaction_id,
          bank_id,
          source_account_id,
          destination_account_id,
          amount,
          currency,
          type,
          status,
          reference
        FROM transactions
        WHERE bank_id = ?
          AND idempotency_key = ?
      `)
      .get(
        bankId,
        idempotencyKey
      );

    if (existingTransaction) {
      // --------------------------------------------
      // Same key must represent same transfer
      // --------------------------------------------

      if (
        existingTransaction.source_account_id !==
          sourceAccountId ||
        existingTransaction.destination_account_id !==
          destinationAccountId ||
        existingTransaction.amount !==
          amount ||
        existingTransaction.currency !==
          currency ||
        existingTransaction.type !==
          "TRANSFER"
      ) {
        const error = new Error(
          "Idempotency key was already used for a different operation"
        );

        error.code =
          "IDEMPOTENCY_CONFLICT";

        error.status = 409;

        throw error;
      }

      return {
        transactionId:
          existingTransaction.transaction_id,

        sourceAccountId,

        destinationAccountId,

        sourceAccountNumber:
          db.prepare(`
            SELECT account_number
            FROM accounts
            WHERE account_id = ?
          `).get(
            existingTransaction.source_account_id
          )?.account_number || null,

        destinationAccountNumber:
          destinationAccount.account_number,

        destinationIfscCode,

        amount:
          existingTransaction.amount,

        currency:
          existingTransaction.currency,

        status:
          existingTransaction.status,

        reference:
          existingTransaction.reference,

        idempotentReplay: true,
      };
    }

    // ----------------------------------------------
    // Load source account
    //
    // USER:
    //   account must belong to the authenticated user
    //
    // PROVIDER:
    //   provider has already been authorized for
    //   this bank, so lookup is scoped to bank only
    // ----------------------------------------------

    let sourceAccount;

    if (authorizationType === "USER") {
      sourceAccount = db
        .prepare(`
          SELECT
            account_id,
            bank_id,
            user_id,
            account_number,
            currency,
            balance,
            status
          FROM accounts
          WHERE account_id = ?
            AND bank_id = ?
            AND user_id = ?
        `)
        .get(
          sourceAccountId,
          bankId,
          userId
        );
    } else {
      sourceAccount = db
        .prepare(`
          SELECT
            account_id,
            bank_id,
            user_id,
            account_number,
            currency,
            balance,
            status
          FROM accounts
          WHERE account_id = ?
            AND bank_id = ?
        `)
        .get(
          sourceAccountId,
          bankId
        );
    }

    if (!sourceAccount) {
      const error = new Error(
        "Source account not found"
      );

      error.code =
        "SOURCE_ACCOUNT_NOT_FOUND";

      error.status = 404;

      throw error;
    }

    // ----------------------------------------------
// PROVIDER ACCOUNT AUTHORIZATION
//
// Provider must have explicit authorization
// for the source account and requested amount.
// USER transfers do not use provider authorization.
// ----------------------------------------------

if (authorizationType === "PROVIDER") {
  const authorized =
    hasAccountAuthorization({
      providerId,
      accountId: sourceAccountId,
      amount,
    });

  if (!authorized) {
    const error = new Error(
      "Provider is not authorized to use this account for this amount"
    );

    error.code =
      "PROVIDER_ACCOUNT_AUTHORIZATION_DENIED";

    error.status = 403;

    throw error;
  }
}

    // ----------------------------------------------
    // Source must be active
    // ----------------------------------------------

    if (
      sourceAccount.status ===
      "BLOCKED"
    ) {
      const error = new Error(
        "Source account is blocked"
      );

      error.code =
        "SOURCE_ACCOUNT_BLOCKED";

      error.status = 403;

      throw error;
    }

    if (
      sourceAccount.status ===
      "CLOSED"
    ) {
      const error = new Error(
        "Source account is closed"
      );

      error.code =
        "SOURCE_ACCOUNT_CLOSED";

      error.status = 403;

      throw error;
    }

    if (
      sourceAccount.status !==
      "ACTIVE"
    ) {
      const error = new Error(
        "Source account is not active"
      );

      error.code =
        "SOURCE_ACCOUNT_NOT_ACTIVE";

      error.status = 403;

      throw error;
    }

    // ----------------------------------------------
    // Currency checks
    //
    // Both accounts must use the requested currency.
    // ----------------------------------------------

    if (
      sourceAccount.currency !==
        currency ||
      destinationAccount.currency !==
        currency
    ) {
      const error = new Error(
        "Currency mismatch"
      );

      error.code =
        "CURRENCY_MISMATCH";

      error.status = 400;

      throw error;
    }

    // ----------------------------------------------
    // Check sufficient balance
    // ----------------------------------------------

    if (
      sourceAccount.balance <
      amount
    ) {
      const error = new Error(
        "Insufficient account balance"
      );

      error.code =
        "INSUFFICIENT_FUNDS";

      error.status = 400;

      throw error;
    }

    // ----------------------------------------------
    // Calculate balances
    //
    // Prevent integer overflow.
    // ----------------------------------------------

    const newSourceBalance =
      sourceAccount.balance -
      amount;

    const newDestinationBalance =
      destinationAccount.balance +
      amount;

    if (
      !Number.isSafeInteger(
        newSourceBalance
      ) ||
      !Number.isSafeInteger(
        newDestinationBalance
      )
    ) {
      const error = new Error(
        "Balance limit exceeded"
      );

      error.code =
        "BALANCE_LIMIT_EXCEEDED";

      error.status = 400;

      throw error;
    }

    // ----------------------------------------------
    // Create TRANSFER transaction
    //
    // Store destination account ID resolved from
    // IFSC + account number.
    // ----------------------------------------------

    db.prepare(`
      INSERT INTO transactions (
        transaction_id,
        bank_id,
        source_account_id,
        destination_account_id,
        amount,
        currency,
        type,
        status,
        reference,
        idempotency_key
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        'TRANSFER',
        'PROCESSING',
        ?,
        ?
      )
    `).run(
      transactionId,
      bankId,
      sourceAccountId,
      destinationAccountId,
      amount,
      currency,
      reference,
      idempotencyKey
    );

    // ----------------------------------------------
    // Debit source
    // ----------------------------------------------

    db.prepare(`
      UPDATE accounts
      SET
        balance = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
        AND bank_id = ?
    `).run(
      newSourceBalance,
      sourceAccountId,
      bankId
    );

    // ----------------------------------------------
    // Credit destination
    // ----------------------------------------------

    db.prepare(`
      UPDATE accounts
      SET
        balance = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
        AND bank_id = ?
    `).run(
      newDestinationBalance,
      destinationAccountId,
      destinationAccount.bank_id
    );

    // ----------------------------------------------
    // Ledger: DEBIT source
    // ----------------------------------------------

    createLedgerEntry({
      transactionId,
      bankId,
      accountId:
        sourceAccountId,
      entryType: "DEBIT",
      amount,
      currency,
    });

    // ----------------------------------------------
    // Ledger: CREDIT destination
    // ----------------------------------------------

    createLedgerEntry({
      transactionId,
      bankId:
        destinationAccount.bank_id,
      accountId:
        destinationAccountId,
      entryType: "CREDIT",
      amount,
      currency,
    });

    // ----------------------------------------------
    // Mark transaction successful
    // ----------------------------------------------

    db.prepare(`
      UPDATE transactions
      SET
        status = 'SUCCESS',
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE transaction_id = ?
    `).run(transactionId);

    return {
      transactionId,

      sourceAccountId,

      sourceAccountNumber:
        sourceAccount.account_number,

      destinationAccountId,

      destinationAccountNumber:
        destinationAccount.account_number,

      destinationIfscCode,

      amount,
      currency,

      sourcePreviousBalance:
        sourceAccount.balance,

      sourceNewBalance:
        newSourceBalance,

      destinationPreviousBalance:
        destinationAccount.balance,

      destinationNewBalance:
        newDestinationBalance,

      status: "SUCCESS",

      reference,

      idempotentReplay: false,
    };
  })();

  // --------------------------------------------------
  // 9. Audit original transfer
  // --------------------------------------------------

  if (!result.idempotentReplay) {
    createAuditLog({
      bankId,

      userId,

      action:
        "ACCOUNT_TRANSFER",

      resourceType:
        "TRANSACTION",

      resourceId:
        result.transactionId,

      metadata: {
        authorizationType,

        providerId:
          providerId || null,

        userId:
          userId || null,

        sourceAccountId:
          result.sourceAccountId,

        destinationAccountId:
          result.destinationAccountId,

        destinationAccountNumber:
          result.destinationAccountNumber,

        destinationIfscCode:
          result.destinationIfscCode,

        amount:
          result.amount,

        currency:
          result.currency,

        reference:
          reference || null,

        idempotencyKey,
      },
    });
  }

  return result;
}

function listCustomerTransactions({
  bankId,
  userId,
  accountId = null,
  limit = 50,
  offset = 0,
}) {
  // --------------------------------------------------
  // Validate pagination
  // --------------------------------------------------

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    const error = new Error(
      "Limit must be between 1 and 100"
    );

    error.code = "INVALID_LIMIT";
    error.status = 400;

    throw error;
  }

  if (
    !Number.isInteger(offset) ||
    offset < 0
  ) {
    const error = new Error(
      "Offset must be zero or greater"
    );

    error.code = "INVALID_OFFSET";
    error.status = 400;

    throw error;
  }

  // --------------------------------------------------
  // Base query
  // --------------------------------------------------

  let query = `
    SELECT
      t.transaction_id,
      t.bank_id,
      t.source_account_id,
      t.destination_account_id,
      t.amount,
      t.currency,
      t.type,
      t.status,
      t.reference,
      t.failure_reason,
      t.created_at,
      t.updated_at,
      t.completed_at
    FROM transactions t

    WHERE t.bank_id = ?

      AND (
        EXISTS (
          SELECT 1
          FROM accounts a
          WHERE a.account_id = t.source_account_id
            AND a.bank_id = t.bank_id
            AND a.user_id = ?
        )

        OR

        EXISTS (
          SELECT 1
          FROM accounts a
          WHERE a.account_id = t.destination_account_id
            AND a.bank_id = t.bank_id
            AND a.user_id = ?
        )
      )
  `;

  const params = [
    bankId,
    userId,
    userId,
  ];

  // --------------------------------------------------
  // Optional account filter
  // --------------------------------------------------

  if (accountId) {
    query += `
      AND (
        t.source_account_id = ?
        OR t.destination_account_id = ?
      )
    `;

    params.push(
      accountId,
      accountId
    );
  }

  query += `
    ORDER BY t.created_at DESC
    LIMIT ?
    OFFSET ?
  `;

  params.push(
    limit,
    offset
  );

  const transactions = db
    .prepare(query)
    .all(...params);

  return transactions;
}

function getCustomerTransaction({
  bankId,
  userId,
  transactionId,
}) {
  const transaction = db
    .prepare(`
      SELECT
        t.transaction_id,
        t.bank_id,
        t.source_account_id,
        t.destination_account_id,
        t.amount,
        t.currency,
        t.type,
        t.status,
        t.reference,
        t.failure_reason,
        t.created_at,
        t.updated_at,
        t.completed_at
      FROM transactions t
      WHERE t.transaction_id = ?
        AND t.bank_id = ?

        AND (
          EXISTS (
            SELECT 1
            FROM accounts a
            WHERE a.account_id = t.source_account_id
              AND a.bank_id = t.bank_id
              AND a.user_id = ?
          )

          OR

          EXISTS (
            SELECT 1
            FROM accounts a
            WHERE a.account_id = t.destination_account_id
              AND a.bank_id = t.bank_id
              AND a.user_id = ?
          )
        )
    `)
    .get(
      transactionId,
      bankId,
      userId,
      userId
    );

  if (!transaction) {
    const error = new Error(
      "Transaction not found"
    );

    error.code =
      "TRANSACTION_NOT_FOUND";

    error.status = 404;

    throw error;
  }

  const ledgerEntries = db
    .prepare(`
      SELECT
        ledger_entry_id,
        account_id,
        entry_type,
        amount,
        currency,
        created_at
      FROM ledger_entries
      WHERE transaction_id = ?
        AND bank_id = ?
      ORDER BY created_at ASC
    `)
    .all(
      transactionId,
      bankId
    );

  return {
    ...transaction,
    ledgerEntries,
  };
}

module.exports = {
  seedAccount,
  withdrawAccount,
  transferBetweenAccounts,
  listCustomerTransactions,
  getCustomerTransaction,
};