const Database = require("better-sqlite3");
const env = require("../config/env");
const logger = require("../utils/logger");

const db = new Database(env.databasePath);

// ==================================================
// SQLITE CONFIGURATION
// ==================================================

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

// ==================================================
// DATABASE SCHEMA
// ==================================================

db.exec(`
  -- ==================================================
  -- BANKS
  -- ==================================================

  CREATE TABLE IF NOT EXISTS banks (
    bank_id TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    code TEXT NOT NULL UNIQUE,

    ifsc_code TEXT NOT NULL UNIQUE,

    status TEXT NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE', 'SUSPENDED')),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );


  -- ==================================================
  -- USERS
  -- ==================================================

  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,

    username TEXT NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    full_name TEXT NOT NULL,

    email TEXT,

    phone TEXT,

    status TEXT NOT NULL DEFAULT 'ACTIVE'
      CHECK (
        status IN (
          'ACTIVE',
          'INACTIVE',
          'BLOCKED'
        )
      ),

    token_version INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );


  -- ==================================================
  -- BANK USERS
  -- ==================================================

  CREATE TABLE IF NOT EXISTS bank_users (
    bank_user_id TEXT PRIMARY KEY,

    bank_id TEXT NOT NULL,

    user_id TEXT NOT NULL,

    role TEXT NOT NULL DEFAULT 'CUSTOMER'
      CHECK (
        role IN (
          'CUSTOMER',
          'ADMIN',
          'MANAGER'
        )
      ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (
      bank_id,
      user_id
    ),

    FOREIGN KEY (bank_id)
      REFERENCES banks(bank_id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    FOREIGN KEY (user_id)
      REFERENCES users(user_id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE
  );


  -- ==================================================
  -- ACCOUNTS
  -- ==================================================

  CREATE TABLE IF NOT EXISTS accounts (
    account_id TEXT PRIMARY KEY,

    bank_id TEXT NOT NULL,

    user_id TEXT NOT NULL,

    account_number TEXT NOT NULL UNIQUE,

    account_type TEXT NOT NULL DEFAULT 'SAVINGS'
      CHECK (
        account_type IN (
          'SAVINGS',
          'CURRENT'
        )
      ),

    currency TEXT NOT NULL DEFAULT 'INR',

    balance INTEGER NOT NULL DEFAULT 0
      CHECK (balance >= 0),

    status TEXT NOT NULL DEFAULT 'ACTIVE'
      CHECK (
        status IN (
          'ACTIVE',
          'BLOCKED',
          'CLOSED'
        )
      ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (bank_id)
      REFERENCES banks(bank_id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE,

    FOREIGN KEY (user_id)
      REFERENCES users(user_id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE
  );


  CREATE INDEX IF NOT EXISTS idx_accounts_bank
    ON accounts(bank_id);


  CREATE INDEX IF NOT EXISTS idx_accounts_user
    ON accounts(user_id);


  CREATE INDEX IF NOT EXISTS idx_accounts_bank_user
    ON accounts(bank_id, user_id);


  -- ==================================================
  -- UPI VPAs
  -- ==================================================

  CREATE TABLE IF NOT EXISTS upi_vpas (
    vpa_id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL,

    bank_id TEXT NOT NULL,

    account_id TEXT NOT NULL,

    vpa TEXT NOT NULL UNIQUE,

    status TEXT NOT NULL DEFAULT 'ACTIVE'
      CHECK (
        status IN (
          'ACTIVE',
          'BLOCKED',
          'CLOSED'
        )
      ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
      REFERENCES users(user_id)
      ON DELETE RESTRICT,

    FOREIGN KEY (bank_id)
      REFERENCES banks(bank_id)
      ON DELETE RESTRICT,

    FOREIGN KEY (account_id)
      REFERENCES accounts(account_id)
      ON DELETE RESTRICT
  );


  CREATE INDEX IF NOT EXISTS idx_upi_vpas_user
    ON upi_vpas(user_id);


  CREATE INDEX IF NOT EXISTS idx_upi_vpas_bank
    ON upi_vpas(bank_id);


  CREATE INDEX IF NOT EXISTS idx_upi_vpas_account
    ON upi_vpas(account_id);


  -- ==================================================
  -- TRANSACTIONS
  -- ==================================================

  CREATE TABLE IF NOT EXISTS transactions (
    transaction_id TEXT PRIMARY KEY,

    bank_id TEXT NOT NULL,

    source_account_id TEXT,

    destination_account_id TEXT,

    amount INTEGER NOT NULL
      CHECK (amount > 0),

    currency TEXT NOT NULL DEFAULT 'INR',

    type TEXT NOT NULL
      CHECK (
        type IN (
          'TRANSFER',
          'DEBIT',
          'CREDIT',
          'REVERSAL',
          'SEED'
        )
      ),

    status TEXT NOT NULL DEFAULT 'CREATED'
      CHECK (
        status IN (
          'CREATED',
          'PROCESSING',
          'SUCCESS',
          'FAILED',
          'CANCELLED',
          'REVERSED'
        )
      ),

    reference TEXT,

    idempotency_key TEXT,

    failure_reason TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TEXT,

    FOREIGN KEY (bank_id)
      REFERENCES banks(bank_id)
      ON DELETE RESTRICT,

    FOREIGN KEY (source_account_id)
      REFERENCES accounts(account_id)
      ON DELETE RESTRICT,

    FOREIGN KEY (destination_account_id)
      REFERENCES accounts(account_id)
      ON DELETE RESTRICT
  );


  CREATE INDEX IF NOT EXISTS idx_transactions_bank
    ON transactions(bank_id);


  CREATE INDEX IF NOT EXISTS idx_transactions_source
    ON transactions(source_account_id);


  CREATE INDEX IF NOT EXISTS idx_transactions_destination
    ON transactions(destination_account_id);


  CREATE INDEX IF NOT EXISTS idx_transactions_status
    ON transactions(status);


  -- ==================================================
  -- LEDGER
  -- ==================================================

  CREATE TABLE IF NOT EXISTS ledger_entries (
    ledger_entry_id TEXT PRIMARY KEY,

    transaction_id TEXT NOT NULL,

    bank_id TEXT NOT NULL,

    account_id TEXT NOT NULL,

    entry_type TEXT NOT NULL
      CHECK (
        entry_type IN (
          'DEBIT',
          'CREDIT'
        )
      ),

    amount INTEGER NOT NULL
      CHECK (amount > 0),

    currency TEXT NOT NULL DEFAULT 'INR',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_id)
      REFERENCES transactions(transaction_id)
      ON DELETE RESTRICT,

    FOREIGN KEY (bank_id)
      REFERENCES banks(bank_id)
      ON DELETE RESTRICT,

    FOREIGN KEY (account_id)
      REFERENCES accounts(account_id)
      ON DELETE RESTRICT
  );


  CREATE INDEX IF NOT EXISTS idx_ledger_transaction
    ON ledger_entries(transaction_id);


  CREATE INDEX IF NOT EXISTS idx_ledger_account
    ON ledger_entries(account_id);


  -- ==================================================
  -- ADMIN USERS
  -- ==================================================

  CREATE TABLE IF NOT EXISTS admin_users (
    admin_user_id TEXT PRIMARY KEY,

    bank_id TEXT NOT NULL,

    user_id TEXT NOT NULL,

    role TEXT NOT NULL
      CHECK (
        role IN (
          'ADMIN',
          'MANAGER'
        )
      ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (
      bank_id,
      user_id
    ),

    FOREIGN KEY (bank_id)
      REFERENCES banks(bank_id)
      ON DELETE RESTRICT,

    FOREIGN KEY (user_id)
      REFERENCES users(user_id)
      ON DELETE RESTRICT
  );


  -- ==================================================
  -- AUDIT LOGS
  -- ==================================================

  CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id TEXT PRIMARY KEY,

    bank_id TEXT,

    user_id TEXT,

    action TEXT NOT NULL,

    resource_type TEXT,

    resource_id TEXT,

    metadata TEXT,

    ip_address TEXT,

    user_agent TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (bank_id)
      REFERENCES banks(bank_id)
      ON DELETE RESTRICT,

    FOREIGN KEY (user_id)
      REFERENCES users(user_id)
      ON DELETE SET NULL
  );


  CREATE INDEX IF NOT EXISTS idx_audit_bank
    ON audit_logs(bank_id);


  CREATE INDEX IF NOT EXISTS idx_audit_user
    ON audit_logs(user_id);


  CREATE INDEX IF NOT EXISTS idx_audit_action
    ON audit_logs(action);


  CREATE INDEX IF NOT EXISTS idx_audit_resource
    ON audit_logs(
      resource_type,
      resource_id
    );


  -- ==================================================
  -- PASSWORD RESET TOKENS
  -- ==================================================

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    reset_id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TEXT NOT NULL,

    used_at TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
      REFERENCES users(user_id)
      ON DELETE CASCADE
  );


  CREATE INDEX IF NOT EXISTS idx_password_reset_user
    ON password_reset_tokens(user_id);


  CREATE INDEX IF NOT EXISTS idx_password_reset_expiry
    ON password_reset_tokens(expires_at);


  -- ==================================================
  -- OTP CHALLENGES
  -- ==================================================

  CREATE TABLE IF NOT EXISTS otp_challenges (
    challenge_id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL,

    purpose TEXT NOT NULL
      CHECK (
        purpose IN (
          'UPI_AUTH',
          'PAYMENT_AUTH',
          'GATEWAY_AUTH',
          'LOGIN'
        )
      ),

    otp_hash TEXT NOT NULL,

    expires_at TEXT NOT NULL,

    attempts INTEGER NOT NULL DEFAULT 0,

    max_attempts INTEGER NOT NULL DEFAULT 5,

    verified_at TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
      REFERENCES users(user_id)
      ON DELETE RESTRICT
  );


  CREATE INDEX IF NOT EXISTS idx_otp_challenges_user
    ON otp_challenges(user_id);


  CREATE INDEX IF NOT EXISTS idx_otp_challenges_purpose
    ON otp_challenges(purpose);


  CREATE INDEX IF NOT EXISTS idx_otp_challenges_expires
    ON otp_challenges(expires_at);


  -- ==================================================
  -- EXTERNAL API PROVIDERS
  -- ==================================================

  CREATE TABLE IF NOT EXISTS api_providers (
    provider_id TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    provider_type TEXT NOT NULL
      CHECK (
        provider_type IN (
          'UPI',
          'PAYMENT_GATEWAY',
          'BANK',
          'INTERNAL'
        )
      ),

    api_key_id TEXT NOT NULL UNIQUE,

    api_secret_hash TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'ACTIVE'
      CHECK (
        status IN (
          'ACTIVE',
          'SUSPENDED',
          'REVOKED'
        )
      ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );


  CREATE INDEX IF NOT EXISTS idx_api_providers_type
    ON api_providers(provider_type);


  CREATE INDEX IF NOT EXISTS idx_api_providers_status
    ON api_providers(status);


  -- ==================================================
  -- PROVIDER PERMISSIONS
  -- ==================================================

  CREATE TABLE IF NOT EXISTS api_provider_permissions (
    permission_id TEXT PRIMARY KEY,

    provider_id TEXT NOT NULL,

    permission TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (
      provider_id,
      permission
    ),

    FOREIGN KEY (provider_id)
      REFERENCES api_providers(provider_id)
      ON DELETE CASCADE
  );


  CREATE INDEX IF NOT EXISTS
    idx_api_provider_permissions_provider
  ON api_provider_permissions(provider_id);


  -- ==================================================
  -- PROVIDER BANK ACCESS
  -- ==================================================

  CREATE TABLE IF NOT EXISTS api_provider_banks (
    provider_bank_id TEXT PRIMARY KEY,

    provider_id TEXT NOT NULL,

    bank_id TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (
      provider_id,
      bank_id
    ),

    FOREIGN KEY (provider_id)
      REFERENCES api_providers(provider_id)
      ON DELETE CASCADE,

    FOREIGN KEY (bank_id)
      REFERENCES banks(bank_id)
      ON DELETE CASCADE
  );


  CREATE INDEX IF NOT EXISTS
    idx_api_provider_banks_provider
  ON api_provider_banks(provider_id);


  CREATE INDEX IF NOT EXISTS
    idx_api_provider_banks_bank
  ON api_provider_banks(bank_id);


  -- ==================================================
  -- PROVIDER ACCOUNT AUTHORIZATIONS
  -- ==================================================

  CREATE TABLE IF NOT EXISTS provider_account_authorizations (
    authorization_id TEXT PRIMARY KEY,

    provider_id TEXT NOT NULL,

    account_id TEXT NOT NULL,

    bank_id TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'ACTIVE'
      CHECK (
        status IN (
          'ACTIVE',
          'REVOKED',
          'EXPIRED'
        )
      ),

    max_amount INTEGER,

    expires_at TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (
      provider_id,
      account_id
    ),

    FOREIGN KEY (provider_id)
      REFERENCES api_providers(provider_id)
      ON DELETE CASCADE,

    FOREIGN KEY (account_id)
      REFERENCES accounts(account_id)
      ON DELETE CASCADE,

    FOREIGN KEY (bank_id)
      REFERENCES banks(bank_id)
      ON DELETE RESTRICT
  );


  CREATE INDEX IF NOT EXISTS
    idx_provider_account_auth_provider
  ON provider_account_authorizations(provider_id);


  CREATE INDEX IF NOT EXISTS
    idx_provider_account_auth_account
  ON provider_account_authorizations(account_id);


  CREATE INDEX IF NOT EXISTS
    idx_provider_account_auth_bank
  ON provider_account_authorizations(bank_id);

  CREATE TABLE IF NOT EXISTS account_mpins (
  mpin_id TEXT PRIMARY KEY,

  account_id TEXT NOT NULL UNIQUE,

  mpin_hash TEXT NOT NULL,

  failed_attempts INTEGER NOT NULL DEFAULT 0,

  locked_until TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (account_id)
    REFERENCES accounts(account_id)
    ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS idx_account_mpins_account
  ON account_mpins(account_id);


CREATE TABLE IF NOT EXISTS mpin_reset_challenges (
  challenge_id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL,

  otp_hash TEXT NOT NULL,

  expires_at TEXT NOT NULL,

  attempts INTEGER NOT NULL DEFAULT 0,

  max_attempts INTEGER NOT NULL DEFAULT 5,

  verified_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS idx_mpin_reset_user
  ON mpin_reset_challenges(user_id);


CREATE INDEX IF NOT EXISTS idx_mpin_reset_expiry
  ON mpin_reset_challenges(expires_at);
`);

// ==================================================
// DATABASE MIGRATIONS
// ==================================================

// --------------------------------------------------
// TRANSACTION IDEMPOTENCY KEY MIGRATION
// --------------------------------------------------

const transactionColumns = db
  .prepare("PRAGMA table_info(transactions)")
  .all();

const hasIdempotencyKey =
  transactionColumns.some(
    (column) =>
      column.name === "idempotency_key"
  );

if (!hasIdempotencyKey) {
  db.prepare(
    "ALTER TABLE transactions ADD COLUMN idempotency_key TEXT"
  ).run();

  logger.info(
    "Added transactions.idempotency_key"
  );
}

// --------------------------------------------------
// BANK IFSC CODE MIGRATION
// --------------------------------------------------

const bankColumns = db
  .prepare("PRAGMA table_info(banks)")
  .all();

const hasIfscCode =
  bankColumns.some(
    (column) =>
      column.name === "ifsc_code"
  );

if (!hasIfscCode) {
  db.prepare(`
    ALTER TABLE banks
    ADD COLUMN ifsc_code TEXT
  `).run();

  logger.info(
    "Added banks.ifsc_code"
  );
}

// --------------------------------------------------
// POPULATE EXISTING BANK IFSC CODES
// --------------------------------------------------

db.prepare(`
  UPDATE banks
  SET ifsc_code = 'RBTB0000001'
  WHERE bank_id = 'alpha'
    AND ifsc_code IS NULL
`).run();

db.prepare(`
  UPDATE banks
  SET ifsc_code = 'RBTB0000002'
  WHERE bank_id = 'beta'
    AND ifsc_code IS NULL
`).run();

db.prepare(`
  UPDATE banks
  SET ifsc_code = 'RBTB0000003'
  WHERE bank_id = 'gamma'
    AND ifsc_code IS NULL
`).run();

logger.info(
  "Existing bank IFSC codes populated"
);

// --------------------------------------------------
// TOKEN VERSION MIGRATION
// --------------------------------------------------

const userColumns = db
  .prepare("PRAGMA table_info(users)")
  .all();

const hasTokenVersion =
  userColumns.some(
    (column) =>
      column.name === "token_version"
  );

if (!hasTokenVersion) {
  db.prepare(`
    ALTER TABLE users
    ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0
  `).run();

  logger.info(
    "Added users.token_version"
  );
}

// --------------------------------------------------
// PASSWORD RESET OTP MIGRATION
// --------------------------------------------------

const resetTokenColumns = db
  .prepare(
    "PRAGMA table_info(password_reset_tokens)"
  )
  .all();

const resetColumnNames =
  new Set(
    resetTokenColumns.map(
      (column) => column.name
    )
  );

if (!resetColumnNames.has("otp_hash")) {
  db.prepare(`
    ALTER TABLE password_reset_tokens
    ADD COLUMN otp_hash TEXT
  `).run();

  logger.info(
    "Added password_reset_tokens.otp_hash"
  );
}

if (!resetColumnNames.has("otp_attempts")) {
  db.prepare(`
    ALTER TABLE password_reset_tokens
    ADD COLUMN otp_attempts INTEGER NOT NULL DEFAULT 0
  `).run();

  logger.info(
    "Added password_reset_tokens.otp_attempts"
  );
}

if (!resetColumnNames.has("otp_verified_at")) {
  db.prepare(`
    ALTER TABLE password_reset_tokens
    ADD COLUMN otp_verified_at TEXT
  `).run();

  logger.info(
    "Added password_reset_tokens.otp_verified_at"
  );
}

// --------------------------------------------------
// PASSWORD RESET TOKEN HASH NULLABLE MIGRATION
// --------------------------------------------------

const passwordResetSchema =
  db
    .prepare(
      "PRAGMA table_info(password_reset_tokens)"
    )
    .all();

const tokenHashColumn =
  passwordResetSchema.find(
    (column) =>
      column.name === "token_hash"
  );

if (
  tokenHashColumn &&
  tokenHashColumn.notnull === 1
) {
  db.transaction(() => {
    db.exec(`
      CREATE TABLE password_reset_tokens_new (
        reset_id TEXT PRIMARY KEY,

        user_id TEXT NOT NULL,

        token_hash TEXT UNIQUE,

        expires_at TEXT NOT NULL,

        used_at TEXT,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        otp_hash TEXT,

        otp_attempts INTEGER NOT NULL DEFAULT 0,

        otp_verified_at TEXT,

        FOREIGN KEY (user_id)
          REFERENCES users(user_id)
          ON DELETE CASCADE
      );


      INSERT INTO password_reset_tokens_new (
        reset_id,
        user_id,
        token_hash,
        expires_at,
        used_at,
        created_at,
        otp_hash,
        otp_attempts,
        otp_verified_at
      )
      SELECT
        reset_id,
        user_id,
        token_hash,
        expires_at,
        used_at,
        created_at,
        otp_hash,
        otp_attempts,
        otp_verified_at
      FROM password_reset_tokens;


      DROP TABLE password_reset_tokens;


      ALTER TABLE password_reset_tokens_new
        RENAME TO password_reset_tokens;


      CREATE INDEX idx_password_reset_user
        ON password_reset_tokens(user_id);


      CREATE INDEX idx_password_reset_expiry
        ON password_reset_tokens(expires_at);
    `);
  })();

  logger.info(
    "Made password_reset_tokens.token_hash nullable"
  );
}

// --------------------------------------------------
// API PROVIDER CREDENTIALS MIGRATION
// --------------------------------------------------

const providerColumns =
  db
    .prepare(
      "PRAGMA table_info(api_providers)"
    )
    .all();

const providerColumnNames =
  new Set(
    providerColumns.map(
      (column) => column.name
    )
  );

if (
  !providerColumnNames.has(
    "api_key_id"
  )
) {
  db.prepare(`
    ALTER TABLE api_providers
    ADD COLUMN api_key_id TEXT
  `).run();

  logger.info(
    "Added api_providers.api_key_id"
  );
}

if (
  !providerColumnNames.has(
    "api_secret_hash"
  )
) {
  db.prepare(`
    ALTER TABLE api_providers
    ADD COLUMN api_secret_hash TEXT
  `).run();

  logger.info(
    "Added api_providers.api_secret_hash"
  );
}

// --------------------------------------------------
// API PROVIDER KEY ID INDEX
// --------------------------------------------------

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
    idx_api_providers_api_key_id
  ON api_providers(api_key_id)
  WHERE api_key_id IS NOT NULL;
`);

// --------------------------------------------------
// API PROVIDER CREDENTIAL SCHEMA MIGRATION
// Remove obsolete api_key_hash column
// --------------------------------------------------

const providerSchema =
  db
    .prepare(
      "PRAGMA table_info(api_providers)"
    )
    .all();

const hasOldApiKeyHash =
  providerSchema.some(
    (column) =>
      column.name === "api_key_hash"
  );

if (hasOldApiKeyHash) {
  db.transaction(() => {
    db.exec(`
      CREATE TABLE api_providers_new (
        provider_id TEXT PRIMARY KEY,

        name TEXT NOT NULL,

        provider_type TEXT NOT NULL
          CHECK (
            provider_type IN (
              'UPI',
              'PAYMENT_GATEWAY',
              'BANK',
              'INTERNAL'
            )
          ),

        api_key_id TEXT,

        api_secret_hash TEXT,

        status TEXT NOT NULL DEFAULT 'ACTIVE'
          CHECK (
            status IN (
              'ACTIVE',
              'SUSPENDED',
              'REVOKED'
            )
          ),

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );


      INSERT INTO api_providers_new (
        provider_id,
        name,
        provider_type,
        api_key_id,
        api_secret_hash,
        status,
        created_at,
        updated_at
      )
      SELECT
        provider_id,
        name,
        provider_type,
        api_key_id,
        api_secret_hash,
        status,
        created_at,
        updated_at
      FROM api_providers;


      DROP TABLE api_providers;


      ALTER TABLE api_providers_new
        RENAME TO api_providers;
    `);
  })();

  logger.info(
    "Migrated api_providers to credential schema"
  );
}

// --------------------------------------------------
// TRANSACTION IDEMPOTENCY INDEX
// --------------------------------------------------

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
    idx_transactions_idempotency
  ON transactions(
    bank_id,
    idempotency_key
  )
  WHERE idempotency_key IS NOT NULL;
`);

// ==================================================
// DATABASE READY
// ==================================================

logger.info(
  "SQLite schema initialized"
);

module.exports = db;