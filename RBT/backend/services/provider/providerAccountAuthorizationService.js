const crypto = require("crypto");

const db = require("../../database/database");

function generateAuthorizationId() {
  return `AUTH_${crypto.randomUUID()}`;
}

function getProvider(providerId) {
  return db.prepare(`
    SELECT
      provider_id,
      name,
      status
    FROM api_providers
    WHERE provider_id = ?
  `).get(providerId);
}

function getAccount(accountId) {
  return db.prepare(`
    SELECT
      account_id,
      bank_id,
      account_number,
      currency,
      status
    FROM accounts
    WHERE account_id = ?
  `).get(accountId);
}

function grantAccountAuthorization({
  providerId,
  accountId,
  maxAmount = null,
  expiresAt = null,
}) {
  // --------------------------------------------------
  // 1. Validate provider
  // --------------------------------------------------

  if (
    typeof providerId !== "string" ||
    !providerId.trim()
  ) {
    const error = new Error("Provider ID is required");
    error.code = "PROVIDER_ID_REQUIRED";
    error.status = 400;
    throw error;
  }

  providerId = providerId.trim();

  const provider = getProvider(providerId);

  if (!provider) {
    const error = new Error("Provider not found");
    error.code = "PROVIDER_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  if (provider.status !== "ACTIVE") {
    const error = new Error("Provider is not active");
    error.code = "PROVIDER_INACTIVE";
    error.status = 403;
    throw error;
  }

  // --------------------------------------------------
  // 2. Validate account
  // --------------------------------------------------

  if (
    typeof accountId !== "string" ||
    !accountId.trim()
  ) {
    const error = new Error("Account ID is required");
    error.code = "ACCOUNT_ID_REQUIRED";
    error.status = 400;
    throw error;
  }

  accountId = accountId.trim();

  const account = getAccount(accountId);

  if (!account) {
    const error = new Error("Account not found");
    error.code = "ACCOUNT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  // --------------------------------------------------
  // 3. Validate max amount
  // --------------------------------------------------

  if (maxAmount !== null) {
    if (
      !Number.isSafeInteger(maxAmount) ||
      maxAmount <= 0
    ) {
      const error = new Error(
        "maxAmount must be a positive safe integer"
      );

      error.code = "INVALID_MAX_AMOUNT";
      error.status = 400;

      throw error;
    }
  }

  // --------------------------------------------------
  // 4. Validate expiry
  // --------------------------------------------------

  if (expiresAt !== null) {
    if (
      typeof expiresAt !== "string" ||
      !expiresAt.trim()
    ) {
      const error = new Error(
        "expiresAt must be a valid timestamp"
      );

      error.code = "INVALID_EXPIRY";
      error.status = 400;

      throw error;
    }

    expiresAt = expiresAt.trim();

    const expiryTime = Date.parse(expiresAt);

    if (Number.isNaN(expiryTime)) {
      const error = new Error(
        "Invalid expiresAt timestamp"
      );

      error.code = "INVALID_EXPIRY";
      error.status = 400;

      throw error;
    }

    if (expiryTime <= Date.now()) {
      const error = new Error(
        "Authorization expiry must be in the future"
      );

      error.code = "EXPIRY_MUST_BE_FUTURE";
      error.status = 400;

      throw error;
    }
  }

  // --------------------------------------------------
  // 5. Provider must have bank access
  // --------------------------------------------------

  const bankAccess = db.prepare(`
    SELECT provider_bank_id
    FROM api_provider_banks
    WHERE provider_id = ?
      AND bank_id = ?
  `).get(
    providerId,
    account.bank_id
  );

  if (!bankAccess) {
    const error = new Error(
      "Provider does not have access to this bank"
    );

    error.code = "PROVIDER_BANK_ACCESS_DENIED";
    error.status = 403;

    throw error;
  }

  // --------------------------------------------------
  // 6. Check existing authorization
  // --------------------------------------------------

  const existing = db.prepare(`
    SELECT
      authorization_id,
      status
    FROM provider_account_authorizations
    WHERE provider_id = ?
      AND account_id = ?
  `).get(
    providerId,
    accountId
  );

  if (existing) {
    // ----------------------------------------------
    // ACTIVE authorization already exists
    // ----------------------------------------------

    if (existing.status === "ACTIVE") {
      const error = new Error(
        "Provider already has an authorization for this account"
      );

      error.code =
        "ACCOUNT_AUTHORIZATION_EXISTS";

      error.status = 409;

      throw error;
    }

    // ----------------------------------------------
    // REVOKED / EXPIRED authorization
    //
    // Reactivate the existing authorization instead
    // of creating a duplicate row.
    // ----------------------------------------------

    if (
      existing.status === "REVOKED" ||
      existing.status === "EXPIRED"
    ) {
      db.prepare(`
        UPDATE provider_account_authorizations
        SET
          status = 'ACTIVE',
          max_amount = ?,
          expires_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE authorization_id = ?
      `).run(
        maxAmount,
        expiresAt,
        existing.authorization_id
      );

      return getAccountAuthorization({
        providerId,
        accountId,
      });
    }
  }

  // --------------------------------------------------
  // 7. Create new authorization
  // --------------------------------------------------

  const authorizationId =
    generateAuthorizationId();

  db.prepare(`
    INSERT INTO provider_account_authorizations (
      authorization_id,
      provider_id,
      account_id,
      bank_id,
      status,
      max_amount,
      expires_at
    )
    VALUES (
      ?,
      ?,
      ?,
      ?,
      'ACTIVE',
      ?,
      ?
    )
  `).run(
    authorizationId,
    providerId,
    accountId,
    account.bank_id,
    maxAmount,
    expiresAt
  );

  return getAccountAuthorization({
    providerId,
    accountId,
  });
}

function getAccountAuthorization({
  providerId,
  accountId,
}) {
  return db.prepare(`
    SELECT
      authorization_id,
      provider_id,
      account_id,
      bank_id,
      status,
      max_amount,
      expires_at,
      created_at,
      updated_at
    FROM provider_account_authorizations
    WHERE provider_id = ?
      AND account_id = ?
  `).get(
    providerId,
    accountId
  );
}

function hasAccountAuthorization({
  providerId,
  accountId,
  amount = null,
}) {
  const authorization =
    getAccountAuthorization({
      providerId,
      accountId,
    });

  if (!authorization) {
    return false;
  }

  // --------------------------------------------------
  // Authorization must be active
  // --------------------------------------------------

  if (authorization.status !== "ACTIVE") {
    return false;
  }

  // --------------------------------------------------
  // Check expiry
  // --------------------------------------------------

  if (authorization.expires_at) {
    const expiryTime =
      Date.parse(authorization.expires_at);

    if (
      Number.isNaN(expiryTime) ||
      expiryTime <= Date.now()
    ) {
      return false;
    }
  }

  // --------------------------------------------------
  // Check amount limit
  // --------------------------------------------------

  if (
    amount !== null &&
    authorization.max_amount !== null &&
    amount > authorization.max_amount
  ) {
    return false;
  }

  return true;
}

function revokeAccountAuthorization({
  providerId,
  accountId,
}) {
  const result = db.prepare(`
    UPDATE provider_account_authorizations
    SET
      status = 'REVOKED',
      updated_at = CURRENT_TIMESTAMP
    WHERE provider_id = ?
      AND account_id = ?
      AND status = 'ACTIVE'
  `).run(
    providerId,
    accountId
  );

  return {
    revoked: result.changes > 0,
    providerId,
    accountId,
  };
}

function listProviderAccountAuthorizations(
  providerId
) {
  return db.prepare(`
    SELECT
      authorization_id,
      provider_id,
      account_id,
      bank_id,
      status,
      max_amount,
      expires_at,
      created_at,
      updated_at
    FROM provider_account_authorizations
    WHERE provider_id = ?
    ORDER BY created_at DESC
  `).all(providerId);
}

module.exports = {
  grantAccountAuthorization,
  getAccountAuthorization,
  hasAccountAuthorization,
  revokeAccountAuthorization,
  listProviderAccountAuthorizations,
};