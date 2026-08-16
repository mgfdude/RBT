const crypto = require("crypto");

const db = require("../../database/database");

const VALID_PROVIDER_TYPES = [
  "UPI",
  "PAYMENT_GATEWAY",
  "BANK",
  "INTERNAL",
];

const VALID_PROVIDER_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "REVOKED",
];

function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function generateApiKeyId() {
  return `rbt_${crypto.randomBytes(16).toString("hex")}`;
}

function generateApiSecret() {
  return `rbt_secret_${crypto.randomBytes(32).toString("hex")}`;
}

function hashSecret(secret) {
  return crypto
    .createHash("sha256")
    .update(secret)
    .digest("hex");
}

function registerProvider({
  name,
  providerType,
}) {
  if (
    typeof name !== "string" ||
    !name.trim()
  ) {
    const error = new Error(
      "Provider name is required"
    );

    error.code = "INVALID_PROVIDER_NAME";
    error.status = 400;
    throw error;
  }

  if (
    !VALID_PROVIDER_TYPES.includes(
      providerType
    )
  ) {
    const error = new Error(
      "Invalid provider type"
    );

    error.code = "INVALID_PROVIDER_TYPE";
    error.status = 400;
    throw error;
  }

  const providerId =
    generateId("PRV");

  const apiKeyId =
    generateApiKeyId();

  const apiSecret =
    generateApiSecret();

  const apiSecretHash =
    hashSecret(apiSecret);

  db.prepare(`
    INSERT INTO api_providers (
      provider_id,
      name,
      provider_type,
      api_key_id,
      api_secret_hash,
      status
    )
    VALUES (
      @providerId,
      @name,
      @providerType,
      @apiKeyId,
      @apiSecretHash,
      'ACTIVE'
    )
  `).run({
    providerId,
    name: name.trim(),
    providerType,
    apiKeyId,
    apiSecretHash,
  });

  return {
    providerId,
    name: name.trim(),
    providerType,
    apiKeyId,

    // IMPORTANT:
    // Return the secret only during creation.
    apiSecret,

    status: "ACTIVE",
  };
}

function findProviderByApiKeyId(
  apiKeyId
) {
  if (
    typeof apiKeyId !== "string" ||
    !apiKeyId.trim()
  ) {
    return null;
  }

  return db.prepare(`
    SELECT
      provider_id,
      name,
      provider_type,
      api_key_id,
      api_secret_hash,
      status,
      created_at,
      updated_at
    FROM api_providers
    WHERE api_key_id = ?
  `).get(apiKeyId.trim());
}

function getProvider(providerId) {
  return db.prepare(`
    SELECT
      provider_id,
      name,
      provider_type,
      api_key_id,
      status,
      created_at,
      updated_at
    FROM api_providers
    WHERE provider_id = ?
  `).get(providerId);
}

function getAllProviders() {
  return db.prepare(`
    SELECT
      provider_id,
      name,
      provider_type,
      api_key_id,
      status,
      created_at,
      updated_at
    FROM api_providers
    ORDER BY created_at DESC
  `).all();
}

function updateProviderStatus(
  providerId,
  status
) {
  if (
    !VALID_PROVIDER_STATUSES.includes(
      status
    )
  ) {
    const error = new Error(
      "Invalid provider status"
    );

    error.code = "INVALID_PROVIDER_STATUS";
    error.status = 400;
    throw error;
  }

  const result = db.prepare(`
    UPDATE api_providers
    SET
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE provider_id = ?
  `).run(
    status,
    providerId
  );

  if (result.changes === 0) {
    const error = new Error(
      "Provider not found"
    );

    error.code = "PROVIDER_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  return getProvider(providerId);
}

function verifyProviderSecret(
  provider,
  apiSecret
) {
  if (
    !provider ||
    typeof apiSecret !== "string"
  ) {
    return false;
  }

  const suppliedHash =
    hashSecret(apiSecret);

  const storedHash =
    provider.api_secret_hash;

  if (
    typeof storedHash !== "string" ||
    storedHash.length !== suppliedHash.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(suppliedHash, "hex"),
    Buffer.from(storedHash, "hex")
  );
}

function addPermission(
  providerId,
  permission
) {
  if (
    !permission ||
    typeof permission !== "string"
  ) {
    const error = new Error(
      "Permission is required"
    );

    error.code = "INVALID_PERMISSION";
    error.status = 400;
    throw error;
  }

  const provider =
    getProvider(providerId);

  if (!provider) {
    const error = new Error(
      "Provider not found"
    );

    error.code = "PROVIDER_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  const permissionId =
    generateId("PERM");

  try {
    db.prepare(`
      INSERT INTO api_provider_permissions (
        permission_id,
        provider_id,
        permission
      )
      VALUES (?, ?, ?)
    `).run(
      permissionId,
      providerId,
      permission.trim()
    );
  } catch (error) {
    if (
      error.code ===
      "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      const duplicate =
        new Error(
          "Provider already has this permission"
        );

      duplicate.code =
        "PERMISSION_ALREADY_EXISTS";

      duplicate.status = 409;

      throw duplicate;
    }

    throw error;
  }

  return {
    permissionId,
    providerId,
    permission: permission.trim(),
  };
}

function removePermission(
  providerId,
  permission
) {
  const result = db.prepare(`
    DELETE FROM api_provider_permissions
    WHERE provider_id = ?
      AND permission = ?
  `).run(
    providerId,
    permission
  );

  return {
    removed: result.changes > 0,
  };
}

function getProviderPermissions(
  providerId
) {
  return db.prepare(`
    SELECT
      permission_id,
      provider_id,
      permission,
      created_at
    FROM api_provider_permissions
    WHERE provider_id = ?
    ORDER BY permission
  `).all(providerId);
}

function hasProviderPermission(
  providerId,
  permission
) {
  if (
    typeof providerId !== "string" ||
    !providerId.trim()
  ) {
    return false;
  }

  if (
    typeof permission !== "string" ||
    !permission.trim()
  ) {
    return false;
  }

  const row = db.prepare(`
    SELECT 1
    FROM api_provider_permissions
    WHERE provider_id = ?
      AND permission = ?
    LIMIT 1
  `).get(
    providerId.trim(),
    permission.trim()
  );

  return Boolean(row);
}

module.exports = {
  registerProvider,
  findProviderByApiKeyId,
  getProvider,
  getAllProviders,
  updateProviderStatus,
  verifyProviderSecret,
  addPermission,
  removePermission,
  getProviderPermissions,
  hasProviderPermission,
};


