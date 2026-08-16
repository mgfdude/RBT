const crypto = require("crypto");

const db = require("../database/database");
const { findBank } = require("../services/bankService");
const { hashPassword } = require("../utils/auth/password");

async function main() {
  const bankId = "alpha";
  const username = "alphaadmin";
  const password = "AdminPass123!";
  const fullName = "Bank Alpha Administrator";
  const email = "alphaadmin@example.com";

  // ----------------------------------------------
  // 1. Verify bank
  // ----------------------------------------------

  const bank = findBank(bankId);

  if (!bank) {
    throw new Error("Bank Alpha does not exist");
  }

  if (bank.status !== "ACTIVE") {
    throw new Error("Bank Alpha is not active");
  }

  // ----------------------------------------------
  // 2. Prevent duplicate admin
  // ----------------------------------------------

  const existing = db
    .prepare(`
      SELECT user_id
      FROM users
      WHERE username = ?
    `)
    .get(username);

  if (existing) {
    console.log("Admin already exists:", username);
    return;
  }

  // ----------------------------------------------
  // 3. Generate IDs
  // ----------------------------------------------

  const userId = `USER_${crypto.randomUUID()}`;
  const bankUserId = `BANKUSER_${crypto.randomUUID()}`;
  const adminUserId = `ADMIN_${crypto.randomUUID()}`;

  // ----------------------------------------------
  // 4. Hash password
  // ----------------------------------------------

  const passwordHash = await hashPassword(password);

  // ----------------------------------------------
  // 5. Create admin atomically
  // ----------------------------------------------

  db.transaction(() => {
    db.prepare(`
      INSERT INTO users (
        user_id,
        username,
        password_hash,
        full_name,
        email,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'ACTIVE')
    `).run(
      userId,
      username,
      passwordHash,
      fullName,
      email
    );

    db.prepare(`
      INSERT INTO bank_users (
        bank_user_id,
        bank_id,
        user_id,
        role
      )
      VALUES (?, ?, ?, 'ADMIN')
    `).run(
      bankUserId,
      bankId,
      userId
    );

    db.prepare(`
      INSERT INTO admin_users (
        admin_user_id,
        bank_id,
        user_id,
        role
      )
      VALUES (?, ?, ?, 'ADMIN')
    `).run(
      adminUserId,
      bankId,
      userId
    );
  })();

  console.log("");
  console.log("=================================");
  console.log("BANK ADMIN CREATED");
  console.log("=================================");
  console.log("Username:", username);
  console.log("Password:", password);
  console.log("Bank ID:", bankId);
  console.log("Role: ADMIN");
  console.log("User ID:", userId);
  console.log("=================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});