const crypto = require("crypto");
const db = require("../database/database");
const {
  transferBetweenAccounts,
} = require("../services/transactionService");
const {
  findBankByIfsc,
} = require("../services/bankService");

// ===================================
// TEST SETUP & TEARDOWN HELPERS
// ===================================

function createTestUser(username) {
  const userId = `USR_${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO users (
      user_id, username, password_hash, full_name
    )
    VALUES (?, ?, ?, ?)
  `).run(
    userId,
    username,
    "hash",
    "Test User"
  );
  return userId;
}

function createTestBankUser(bankId, userId, role = "CUSTOMER") {
  const bankUserId = `BU_${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO bank_users (
      bank_user_id, bank_id, user_id, role
    )
    VALUES (?, ?, ?, ?)
  `).run(
    bankUserId,
    bankId,
    userId,
    role
  );
  return bankUserId;
}

function createTestAccount(bankId, userId, accountNumber = null) {
  const accountId = `ACC_${crypto.randomUUID()}`;
  if (!accountNumber) {
    accountNumber = `${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }

  db.prepare(`
    INSERT INTO accounts (
      account_id,
      bank_id,
      user_id,
      account_number,
      account_type,
      currency,
      balance,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    accountId,
    bankId,
    userId,
    accountNumber,
    "SAVINGS",
    "INR",
    0,
    "ACTIVE"
  );

  return {
    accountId,
    accountNumber,
  };
}

function seedAccountBalance(accountId, bankId, amount) {
  db.prepare(`
    UPDATE accounts
    SET balance = ?
    WHERE account_id = ? AND bank_id = ?
  `).run(amount, accountId, bankId);
}

function generateIdempotencyKey() {
  return `IDM_${crypto.randomUUID()}`;
}

function cleanupDatabase() {
  // Delete in reverse order of dependencies
  db.prepare("DELETE FROM ledger_entries").run();
  db.prepare("DELETE FROM transactions").run();
  db.prepare("DELETE FROM accounts").run();
  db.prepare("DELETE FROM bank_users").run();
  db.prepare("DELETE FROM users").run();
  // Keep banks table as it's seeded
}

// ===================================
// TESTS
// ===================================

describe("Cross-Bank Transfer System (IFSC-based)", () => {
  beforeEach(() => {
    cleanupDatabase();
  });

  // =============================
  // 1. Test: Alpha → Alpha
  // =============================

  test("Transfer from Alpha bank to Alpha bank - same bank", () => {
    const bankId = "alpha";
    const ifscCode = "RBTB0000001";

    // Setup
    const user1 = createTestUser("alice");
    const user2 = createTestUser("bob");

    createTestBankUser(bankId, user1);
    createTestBankUser(bankId, user2);

    const source = createTestAccount(bankId, user1);
    const destination = createTestAccount(bankId, user2);

    seedAccountBalance(source.accountId, bankId, 50000); // 500 INR

    // Execute
    const result = transferBetweenAccounts({
      bankId,
      sourceAccountId: source.accountId,
      destinationAccountNumber: destination.accountNumber,
      destinationIfscCode: ifscCode,
      amount: 10000, // 100 INR
      userId: user1,
      reference: "TEST_ALPHA_ALPHA",
      idempotencyKey: generateIdempotencyKey(),
    });

    // Verify
    expect(result.status).toBe("SUCCESS");
    expect(result.sourceAccountId).toBe(source.accountId);
    expect(result.destinationAccountId).toBe(destination.accountId);
    expect(result.destinationAccountNumber).toBe(
      destination.accountNumber
    );
    expect(result.destinationIfscCode).toBe(ifscCode);
    expect(result.amount).toBe(10000);
    expect(result.sourcePreviousBalance).toBe(50000);
    expect(result.sourceNewBalance).toBe(40000);
    expect(result.destinationPreviousBalance).toBe(0);
    expect(result.destinationNewBalance).toBe(10000);
    expect(result.idempotentReplay).toBe(false);

    // Verify database
    const sourceAccount = db
      .prepare(
        `SELECT balance FROM accounts WHERE account_id = ? AND bank_id = ?`
      )
      .get(source.accountId, bankId);

    const destinationAccount = db
      .prepare(
        `SELECT balance FROM accounts WHERE account_id = ? AND bank_id = ?`
      )
      .get(destination.accountId, bankId);

    expect(sourceAccount.balance).toBe(40000);
    expect(destinationAccount.balance).toBe(10000);

    // Verify transaction record
    const transaction = db
      .prepare(`SELECT * FROM transactions WHERE transaction_id = ?`)
      .get(result.transactionId);

    expect(transaction.type).toBe("TRANSFER");
    expect(transaction.status).toBe("SUCCESS");
    expect(transaction.source_account_id).toBe(source.accountId);
    expect(transaction.destination_account_id).toBe(destination.accountId);

    // Verify ledger entries
    const ledgerEntries = db
      .prepare(
        `SELECT * FROM ledger_entries WHERE transaction_id = ? ORDER BY created_at ASC`
      )
      .all(result.transactionId);

    expect(ledgerEntries).toHaveLength(2);
    expect(ledgerEntries[0].entry_type).toBe("DEBIT");
    expect(ledgerEntries[0].account_id).toBe(source.accountId);
    expect(ledgerEntries[0].amount).toBe(10000);
    expect(ledgerEntries[1].entry_type).toBe("CREDIT");
    expect(ledgerEntries[1].account_id).toBe(destination.accountId);
    expect(ledgerEntries[1].amount).toBe(10000);
  });

  // =============================
  // 2. Test: Alpha → Beta
  // =============================

  test("Transfer from Alpha bank to Beta bank - cross-bank", () => {
    const sourceBankId = "alpha";
    const destBankId = "beta";
    const destIfscCode = "RBTB0000002";

    // Setup
    const user1 = createTestUser("alice");
    const user2 = createTestUser("charlie");

    createTestBankUser(sourceBankId, user1);
    createTestBankUser(destBankId, user2);

    const source = createTestAccount(sourceBankId, user1);
    const destination = createTestAccount(destBankId, user2);

    seedAccountBalance(source.accountId, sourceBankId, 100000); // 1000 INR

    // Execute
    const result = transferBetweenAccounts({
      bankId: sourceBankId,
      sourceAccountId: source.accountId,
      destinationAccountNumber: destination.accountNumber,
      destinationIfscCode: destIfscCode,
      amount: 25000, // 250 INR
      userId: user1,
      reference: "TEST_ALPHA_BETA",
      idempotencyKey: generateIdempotencyKey(),
    });

    // Verify
    expect(result.status).toBe("SUCCESS");
    expect(result.destinationIfscCode).toBe(destIfscCode);
    expect(result.sourceNewBalance).toBe(75000);
    expect(result.destinationNewBalance).toBe(25000);

    // Verify both bank accounts
    const sourceAccount = db
      .prepare(
        `SELECT balance FROM accounts WHERE account_id = ? AND bank_id = ?`
      )
      .get(source.accountId, sourceBankId);

    const destinationAccount = db
      .prepare(
        `SELECT balance FROM accounts WHERE account_id = ? AND bank_id = ?`
      )
      .get(destination.accountId, destBankId);

    expect(sourceAccount.balance).toBe(75000);
    expect(destinationAccount.balance).toBe(25000);
  });

  // =============================
  // 3. Test: Alpha → Gamma
  // =============================

  test("Transfer from Alpha bank to Gamma bank - cross-bank", () => {
    const sourceBankId = "alpha";
    const destBankId = "gamma";
    const destIfscCode = "RBTB0000003";

    // Setup
    const user1 = createTestUser("alice");
    const user2 = createTestUser("diana");

    createTestBankUser(sourceBankId, user1);
    createTestBankUser(destBankId, user2);

    const source = createTestAccount(sourceBankId, user1);
    const destination = createTestAccount(destBankId, user2);

    seedAccountBalance(source.accountId, sourceBankId, 75000); // 750 INR

    // Execute
    const result = transferBetweenAccounts({
      bankId: sourceBankId,
      sourceAccountId: source.accountId,
      destinationAccountNumber: destination.accountNumber,
      destinationIfscCode: destIfscCode,
      amount: 30000, // 300 INR
      userId: user1,
      reference: "TEST_ALPHA_GAMMA",
      idempotencyKey: generateIdempotencyKey(),
    });

    // Verify
    expect(result.status).toBe("SUCCESS");
    expect(result.destinationIfscCode).toBe(destIfscCode);
    expect(result.sourceNewBalance).toBe(45000);
    expect(result.destinationNewBalance).toBe(30000);
  });

  // =============================
  // 4. Test: Invalid IFSC
  // =============================

  test("Error: Invalid/unknown IFSC code", () => {
    const bankId = "alpha";
    const user1 = createTestUser("alice");
    const user2 = createTestUser("bob");

    createTestBankUser(bankId, user1);
    createTestBankUser(bankId, user2);

    const source = createTestAccount(bankId, user1);
    const destination = createTestAccount(bankId, user2);

    seedAccountBalance(source.accountId, bankId, 50000);

    // Execute & expect error
    expect(() => {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: destination.accountNumber,
        destinationIfscCode: "INVALID0000001",
        amount: 10000,
        userId: user1,
        reference: "TEST_INVALID_IFSC",
        idempotencyKey: generateIdempotencyKey(),
      });
    }).toThrow();

    try {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: destination.accountNumber,
        destinationIfscCode: "INVALID0000001",
        amount: 10000,
        userId: user1,
        reference: "TEST_INVALID_IFSC",
        idempotencyKey: generateIdempotencyKey(),
      });
    } catch (error) {
      expect(error.code).toBe("BANK_NOT_FOUND_BY_IFSC");
      expect(error.status).toBe(404);
    }
  });

  // =============================
  // 5. Test: Valid IFSC + nonexistent account
  // =============================

  test("Error: Valid IFSC but account number not found", () => {
    const bankId = "alpha";
    const ifscCode = "RBTB0000001";
    const user1 = createTestUser("alice");

    createTestBankUser(bankId, user1);

    const source = createTestAccount(bankId, user1);
    seedAccountBalance(source.accountId, bankId, 50000);

    // Execute & expect error
    expect(() => {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: "999999999999",
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_NONEXISTENT_ACCOUNT",
        idempotencyKey: generateIdempotencyKey(),
      });
    }).toThrow();

    try {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: "999999999999",
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_NONEXISTENT_ACCOUNT",
        idempotencyKey: generateIdempotencyKey(),
      });
    } catch (error) {
      expect(error.code).toBe("DESTINATION_ACCOUNT_NOT_FOUND");
      expect(error.status).toBe(404);
    }
  });

  // =============================
  // 6. Test: Blocked destination account
  // =============================

  test("Error: Destination account is blocked", () => {
    const bankId = "alpha";
    const ifscCode = "RBTB0000001";
    const user1 = createTestUser("alice");
    const user2 = createTestUser("bob");

    createTestBankUser(bankId, user1);
    createTestBankUser(bankId, user2);

    const source = createTestAccount(bankId, user1);
    const destination = createTestAccount(bankId, user2);

    seedAccountBalance(source.accountId, bankId, 50000);

    // Block destination
    db.prepare(`
      UPDATE accounts SET status = 'BLOCKED'
      WHERE account_id = ? AND bank_id = ?
    `).run(destination.accountId, bankId);

    // Execute & expect error
    expect(() => {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: destination.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_BLOCKED_DEST",
        idempotencyKey: generateIdempotencyKey(),
      });
    }).toThrow();

    try {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: destination.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_BLOCKED_DEST",
        idempotencyKey: generateIdempotencyKey(),
      });
    } catch (error) {
      expect(error.code).toBe("DESTINATION_ACCOUNT_BLOCKED");
      expect(error.status).toBe(403);
    }
  });

  // =============================
  // 7. Test: Closed destination account
  // =============================

  test("Error: Destination account is closed", () => {
    const bankId = "alpha";
    const ifscCode = "RBTB0000001";
    const user1 = createTestUser("alice");
    const user2 = createTestUser("bob");

    createTestBankUser(bankId, user1);
    createTestBankUser(bankId, user2);

    const source = createTestAccount(bankId, user1);
    const destination = createTestAccount(bankId, user2);

    seedAccountBalance(source.accountId, bankId, 50000);

    // Close destination
    db.prepare(`
      UPDATE accounts SET status = 'CLOSED'
      WHERE account_id = ? AND bank_id = ?
    `).run(destination.accountId, bankId);

    // Execute & expect error
    expect(() => {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: destination.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_CLOSED_DEST",
        idempotencyKey: generateIdempotencyKey(),
      });
    }).toThrow();

    try {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: destination.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_CLOSED_DEST",
        idempotencyKey: generateIdempotencyKey(),
      });
    } catch (error) {
      expect(error.code).toBe("DESTINATION_ACCOUNT_CLOSED");
      expect(error.status).toBe(403);
    }
  });

  // =============================
  // 8. Test: Blocked source account
  // =============================

  test("Error: Source account is blocked", () => {
    const bankId = "alpha";
    const ifscCode = "RBTB0000001";
    const user1 = createTestUser("alice");
    const user2 = createTestUser("bob");

    createTestBankUser(bankId, user1);
    createTestBankUser(bankId, user2);

    const source = createTestAccount(bankId, user1);
    const destination = createTestAccount(bankId, user2);

    seedAccountBalance(source.accountId, bankId, 50000);

    // Block source
    db.prepare(`
      UPDATE accounts SET status = 'BLOCKED'
      WHERE account_id = ? AND bank_id = ?
    `).run(source.accountId, bankId);

    // Execute & expect error
    expect(() => {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: destination.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_BLOCKED_SOURCE",
        idempotencyKey: generateIdempotencyKey(),
      });
    }).toThrow();

    try {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: destination.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_BLOCKED_SOURCE",
        idempotencyKey: generateIdempotencyKey(),
      });
    } catch (error) {
      expect(error.code).toBe("SOURCE_ACCOUNT_BLOCKED");
      expect(error.status).toBe(403);
    }
  });

  // =============================
  // 9. Test: Insufficient balance
  // =============================

  test("Error: Insufficient balance in source account", () => {
    const bankId = "alpha";
    const ifscCode = "RBTB0000001";
    const user1 = createTestUser("alice");
    const user2 = createTestUser("bob");

    createTestBankUser(bankId, user1);
    createTestBankUser(bankId, user2);

    const source = createTestAccount(bankId, user1);
    const destination = createTestAccount(bankId, user2);

    seedAccountBalance(source.accountId, bankId, 5000); // 50 INR

    // Execute & expect error
    expect(() => {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: destination.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000, // 100 INR (more than available)
        userId: user1,
        reference: "TEST_INSUFFICIENT",
        idempotencyKey: generateIdempotencyKey(),
      });
    }).toThrow();

    try {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: destination.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_INSUFFICIENT",
        idempotencyKey: generateIdempotencyKey(),
      });
    } catch (error) {
      expect(error.code).toBe("INSUFFICIENT_FUNDS");
      expect(error.status).toBe(400);
    }
  });

  // =============================
  // 10. Test: Duplicate idempotency key
  // =============================

  test("Idempotent: Duplicate idempotency key returns same result", () => {
    const bankId = "alpha";
    const ifscCode = "RBTB0000001";
    const user1 = createTestUser("alice");
    const user2 = createTestUser("bob");

    createTestBankUser(bankId, user1);
    createTestBankUser(bankId, user2);

    const source = createTestAccount(bankId, user1);
    const destination = createTestAccount(bankId, user2);

    seedAccountBalance(source.accountId, bankId, 50000);

    const idempotencyKey = generateIdempotencyKey();

    // First request
    const result1 = transferBetweenAccounts({
      bankId,
      sourceAccountId: source.accountId,
      destinationAccountNumber: destination.accountNumber,
      destinationIfscCode: ifscCode,
      amount: 10000,
      userId: user1,
      reference: "TEST_IDEMPOTENT",
      idempotencyKey,
    });

    expect(result1.status).toBe("SUCCESS");
    expect(result1.idempotentReplay).toBe(false);

    // Second request with same key
    const result2 = transferBetweenAccounts({
      bankId,
      sourceAccountId: source.accountId,
      destinationAccountNumber: destination.accountNumber,
      destinationIfscCode: ifscCode,
      amount: 10000,
      userId: user1,
      reference: "TEST_IDEMPOTENT",
      idempotencyKey,
    });

    expect(result2.status).toBe("SUCCESS");
    expect(result2.idempotentReplay).toBe(true);
    expect(result2.transactionId).toBe(result1.transactionId);

    // Verify balances only changed once
    const sourceAccount = db
      .prepare(
        `SELECT balance FROM accounts WHERE account_id = ? AND bank_id = ?`
      )
      .get(source.accountId, bankId);

    expect(sourceAccount.balance).toBe(40000); // Not 30000
  });

  // =============================
  // 11. Test: Idempotency conflict
  // =============================

  test("Error: Idempotency conflict - same key, different operation", () => {
    const bankId = "alpha";
    const ifscCode = "RBTB0000001";
    const user1 = createTestUser("alice");
    const user2 = createTestUser("bob");
    const user3 = createTestUser("charlie");

    createTestBankUser(bankId, user1);
    createTestBankUser(bankId, user2);
    createTestBankUser(bankId, user3);

    const source = createTestAccount(bankId, user1);
    const dest1 = createTestAccount(bankId, user2);
    const dest2 = createTestAccount(bankId, user3);

    seedAccountBalance(source.accountId, bankId, 100000);

    const idempotencyKey = generateIdempotencyKey();

    // First request
    transferBetweenAccounts({
      bankId,
      sourceAccountId: source.accountId,
      destinationAccountNumber: dest1.accountNumber,
      destinationIfscCode: ifscCode,
      amount: 10000,
      userId: user1,
      reference: "TEST_CONFLICT",
      idempotencyKey,
    });

    // Second request with same key but different destination
    expect(() => {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: dest2.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_CONFLICT",
        idempotencyKey,
      });
    }).toThrow();

    try {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: dest2.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_CONFLICT",
        idempotencyKey,
      });
    } catch (error) {
      expect(error.code).toBe("IDEMPOTENCY_CONFLICT");
      expect(error.status).toBe(409);
    }
  });

  // =============================
  // 12. Test: Cross-bank ledger entries
  // =============================

  test("Cross-bank transfer creates correct ledger entries", () => {
    const sourceBankId = "alpha";
    const destBankId = "beta";
    const destIfscCode = "RBTB0000002";

    const user1 = createTestUser("alice");
    const user2 = createTestUser("bob");

    createTestBankUser(sourceBankId, user1);
    createTestBankUser(destBankId, user2);

    const source = createTestAccount(sourceBankId, user1);
    const destination = createTestAccount(destBankId, user2);

    seedAccountBalance(source.accountId, sourceBankId, 50000);

    // Execute
    const result = transferBetweenAccounts({
      bankId: sourceBankId,
      sourceAccountId: source.accountId,
      destinationAccountNumber: destination.accountNumber,
      destinationIfscCode: destIfscCode,
      amount: 10000,
      userId: user1,
      reference: "TEST_CROSS_BANK_LEDGER",
      idempotencyKey: generateIdempotencyKey(),
    });

    // Verify ledger entries exist in correct banks
    const sourceLedger = db
      .prepare(`
        SELECT * FROM ledger_entries
        WHERE transaction_id = ? AND bank_id = ? AND account_id = ?
      `)
      .get(
        result.transactionId,
        sourceBankId,
        source.accountId
      );

    const destLedger = db
      .prepare(`
        SELECT * FROM ledger_entries
        WHERE transaction_id = ? AND bank_id = ? AND account_id = ?
      `)
      .get(
        result.transactionId,
        destBankId,
        destination.accountId
      );

    expect(sourceLedger.entry_type).toBe("DEBIT");
    expect(sourceLedger.amount).toBe(10000);
    expect(destLedger.entry_type).toBe("CREDIT");
    expect(destLedger.amount).toBe(10000);
  });

  // =============================
  // 13. Test: Same account transfer error
  // =============================

  test("Error: Cannot transfer to same account", () => {
    const bankId = "alpha";
    const ifscCode = "RBTB0000001";
    const user1 = createTestUser("alice");

    createTestBankUser(bankId, user1);

    const source = createTestAccount(bankId, user1);
    seedAccountBalance(source.accountId, bankId, 50000);

    // Execute & expect error
    expect(() => {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: source.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_SAME_ACCOUNT",
        idempotencyKey: generateIdempotencyKey(),
      });
    }).toThrow();

    try {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: source.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_SAME_ACCOUNT",
        idempotencyKey: generateIdempotencyKey(),
      });
    } catch (error) {
      expect(error.code).toBe("SAME_ACCOUNT_TRANSFER");
      expect(error.status).toBe(400);
    }
  });

  // =============================
  // 14. Test: Account isolation via IFSC
  // =============================

  test("Security: Account from Beta cannot be selected using Alpha IFSC", () => {
    const alphaBank = "alpha";
    const betaBank = "beta";
    const alphaIfsc = "RBTB0000001";

    const user1 = createTestUser("alice");
    const user2 = createTestUser("bob");

    createTestBankUser(alphaBank, user1);
    createTestBankUser(betaBank, user2);

    const source = createTestAccount(alphaBank, user1);
    const betaAccount = createTestAccount(betaBank, user2);

    seedAccountBalance(source.accountId, alphaBank, 50000);

    // Try to transfer to Beta account using Alpha IFSC
    // Should fail because the account doesn't belong to Alpha bank
    expect(() => {
      transferBetweenAccounts({
        bankId: alphaBank,
        sourceAccountId: source.accountId,
        destinationAccountNumber: betaAccount.accountNumber,
        destinationIfscCode: alphaIfsc, // Wrong IFSC for this account
        amount: 10000,
        userId: user1,
        reference: "TEST_ISOLATION",
        idempotencyKey: generateIdempotencyKey(),
      });
    }).toThrow();

    try {
      transferBetweenAccounts({
        bankId: alphaBank,
        sourceAccountId: source.accountId,
        destinationAccountNumber: betaAccount.accountNumber,
        destinationIfscCode: alphaIfsc,
        amount: 10000,
        userId: user1,
        reference: "TEST_ISOLATION",
        idempotencyKey: generateIdempotencyKey(),
      });
    } catch (error) {
      expect(error.code).toBe("DESTINATION_ACCOUNT_NOT_FOUND");
      expect(error.status).toBe(404);
    }
  });

  // =============================
  // 15. Test: IFSC lookup function
  // =============================

  test("Bank lookup by IFSC returns correct bank", () => {
    const bank1 = findBankByIfsc("RBTB0000001");
    expect(bank1.bank_id).toBe("alpha");
    expect(bank1.ifsc_code).toBe("RBTB0000001");

    const bank2 = findBankByIfsc("RBTB0000002");
    expect(bank2.bank_id).toBe("beta");
    expect(bank2.ifsc_code).toBe("RBTB0000002");

    const bank3 = findBankByIfsc("RBTB0000003");
    expect(bank3.bank_id).toBe("gamma");
    expect(bank3.ifsc_code).toBe("RBTB0000003");

    const invalidBank = findBankByIfsc("INVALID0000000");
    expect(invalidBank).toBeNull();
  });

  // =============================
  // 16. Test: Source account authorization
  // =============================

  test("Error: User cannot transfer from another user's account", () => {
    const bankId = "alpha";
    const ifscCode = "RBTB0000001";
    const user1 = createTestUser("alice");
    const user2 = createTestUser("bob");
    const user3 = createTestUser("charlie");

    createTestBankUser(bankId, user1);
    createTestBankUser(bankId, user2);
    createTestBankUser(bankId, user3);

    const source = createTestAccount(bankId, user2); // user2's account
    const destination = createTestAccount(bankId, user3);

    seedAccountBalance(source.accountId, bankId, 50000);

    // user1 tries to transfer from user2's account
    expect(() => {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: destination.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1, // Different user
        reference: "TEST_UNAUTHORIZED",
        idempotencyKey: generateIdempotencyKey(),
      });
    }).toThrow();

    try {
      transferBetweenAccounts({
        bankId,
        sourceAccountId: source.accountId,
        destinationAccountNumber: destination.accountNumber,
        destinationIfscCode: ifscCode,
        amount: 10000,
        userId: user1,
        reference: "TEST_UNAUTHORIZED",
        idempotencyKey: generateIdempotencyKey(),
      });
    } catch (error) {
      expect(error.code).toBe("SOURCE_ACCOUNT_NOT_FOUND");
      expect(error.status).toBe(404);
    }
  });
});
