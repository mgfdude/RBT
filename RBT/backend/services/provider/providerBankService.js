const crypto = require("crypto");

const db = require("../../database/database");

function generateProviderBankId() {
  return `PBANK_${crypto.randomUUID()}`;
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

function getBank(bankId) {
  return db.prepare(`
    SELECT
      bank_id,
      name,
      ifsc_code,
      status
    FROM banks
    WHERE bank_id = ?
  `).get(bankId);
}

function grantBankAccess({
  providerId,
  bankId,
}) {
  const provider = getProvider(providerId);

  if (!provider) {
    const error = new Error("Provider not found");
    error.code = "PROVIDER_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  const bank = getBank(bankId);

  if (!bank) {
    const error = new Error("Bank not found");
    error.code = "BANK_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  try {
    const providerBankId =
      generateProviderBankId();

    db.prepare(`
      INSERT INTO api_provider_banks (
        provider_bank_id,
        provider_id,
        bank_id
      )
      VALUES (?, ?, ?)
    `).run(
      providerBankId,
      providerId,
      bankId
    );

    return {
      providerBankId,
      providerId,
      bankId,
    };

  } catch (error) {
    if (
      error.code ===
      "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      const duplicate =
        new Error(
          "Provider already has access to this bank"
        );

      duplicate.code =
        "PROVIDER_BANK_ACCESS_EXISTS";

      duplicate.status = 409;

      throw duplicate;
    }

    throw error;
  }
}

function revokeBankAccess({
  providerId,
  bankId,
}) {
  const result = db.prepare(`
    DELETE FROM api_provider_banks
    WHERE provider_id = ?
      AND bank_id = ?
  `).run(
    providerId,
    bankId
  );

  return {
    revoked: result.changes > 0,
    providerId,
    bankId,
  };
}

function hasBankAccess({
  providerId,
  bankId,
}) {
  const row = db.prepare(`
    SELECT provider_bank_id
    FROM api_provider_banks
    WHERE provider_id = ?
      AND bank_id = ?
  `).get(
    providerId,
    bankId
  );

  return Boolean(row);
}

function getProviderBanks(providerId) {
  return db.prepare(`
    SELECT
      pb.provider_bank_id,
      pb.provider_id,
      pb.bank_id,
      b.name,
      b.ifsc_code,
      b.status
    FROM api_provider_banks pb
    JOIN banks b
      ON b.bank_id = pb.bank_id
    WHERE pb.provider_id = ?
    ORDER BY b.name
  `).all(providerId);
}

module.exports = {
  grantBankAccess,
  revokeBankAccess,
  hasBankAccess,
  getProviderBanks,
};
