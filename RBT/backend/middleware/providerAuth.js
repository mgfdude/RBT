const {
  findProviderByApiKeyId,
  verifyProviderSecret,
} = require("../services/provider/providerService");

const db = require("../database/database");

function requireProviderAuth(req, res, next) {
  try {
    const apiKeyId = req.headers["x-rbt-api-key"];
    const apiSecret = req.headers["x-rbt-api-secret"];

    if (
      typeof apiKeyId !== "string" ||
      !apiKeyId.trim() ||
      typeof apiSecret !== "string" ||
      !apiSecret.trim()
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: "PROVIDER_AUTHENTICATION_REQUIRED",
          message: "Provider authentication required",
        },
      });
    }

    const provider =
      findProviderByApiKeyId(apiKeyId);

    if (!provider) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_PROVIDER_CREDENTIALS",
          message: "Invalid provider credentials",
        },
      });
    }

    if (provider.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        error: {
          code: "PROVIDER_INACTIVE",
          message: "Provider is not active",
        },
      });
    }

    const validSecret =
      verifyProviderSecret(
        provider,
        apiSecret
      );

    if (!validSecret) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_PROVIDER_CREDENTIALS",
          message: "Invalid provider credentials",
        },
      });
    }

    const permissions = db.prepare(`
      SELECT permission
      FROM api_provider_permissions
      WHERE provider_id = ?
      ORDER BY permission
    `).all(provider.provider_id);

    req.provider = {
      providerId: provider.provider_id,
      name: provider.name,
      providerType: provider.provider_type,
      permissions: permissions.map(
        (row) => row.permission
      ),
    };

    next();

  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireProviderAuth,
};