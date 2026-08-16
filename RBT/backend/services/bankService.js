const db = require("../database/database");
const { getAllBanks, getBank } = require("../config/banks");

function initializeBanks() {
  const insert = db.prepare(`
    INSERT INTO banks (
      bank_id,
      name,
      code,
      ifsc_code,
      status
    )
    VALUES (
      @id,
      @name,
      @code,
      @ifscCode,
      @status
    )
    ON CONFLICT(bank_id) DO UPDATE SET
      name = excluded.name,
      code = excluded.code,
      ifsc_code = excluded.ifsc_code,
      status = excluded.status
  `);

  const initialize = db.transaction(() => {
    for (const bank of getAllBanks()) {
      insert.run({
        ...bank,
        ifscCode: bank.ifscCode,
      });
    }
  });

  initialize();
}

function findBank(bankId) {
  const configuredBank = getBank(bankId);

  if (!configuredBank) {
    return null;
  }

  return db
    .prepare(`
      SELECT
        bank_id,
        name,
        code,
        ifsc_code,
        status,
        created_at
      FROM banks
      WHERE bank_id = ?
    `)
    .get(bankId);
}

function findAllBanks() {
  return db
    .prepare(`
      SELECT
        bank_id,
        name,
        code,
        ifsc_code,
        status,
        created_at
      FROM banks
      ORDER BY bank_id
    `)
    .all();
}

function findBankByIfsc(ifscCode) {
  if (!ifscCode || typeof ifscCode !== 'string') {
    return null;
  }

  return db
    .prepare(`
      SELECT
        bank_id,
        name,
        code,
        ifsc_code,
        status,
        created_at
      FROM banks
      WHERE ifsc_code = ?
    `)
    .get(ifscCode.trim());
}

module.exports = {
  initializeBanks,
  findBank,
  findAllBanks,
  findBankByIfsc,
};