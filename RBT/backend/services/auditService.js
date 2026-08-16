const crypto = require("crypto");

const db = require("../database/database");

function generateAuditId() {
  return `AUDIT_${crypto.randomUUID()}`;
}

function createAuditLog({
  bankId = null,
  userId = null,
  action,
  resourceType = null,
  resourceId = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
}) {
  const auditId = generateAuditId();

  const metadataJson =
    metadata === null
      ? null
      : JSON.stringify(metadata);

  db.prepare(`
    INSERT INTO audit_logs (
      audit_id,
      bank_id,
      user_id,
      action,
      resource_type,
      resource_id,
      metadata,
      ip_address,
      user_agent
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    auditId,
    bankId,
    userId,
    action,
    resourceType,
    resourceId,
    metadataJson,
    ipAddress,
    userAgent
  );

  return auditId;
}

module.exports = {
  createAuditLog,
};