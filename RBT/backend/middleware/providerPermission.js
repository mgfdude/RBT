function requireProviderPermission(permission) {
  return (req, res, next) => {
    if (!req.provider) {
      return res.status(401).json({
        success: false,
        error: {
          code: "PROVIDER_AUTHENTICATION_REQUIRED",
          message: "Provider authentication required",
        },
      });
    }

    if (
      typeof permission !== "string" ||
      !permission.trim()
    ) {
      return res.status(500).json({
        success: false,
        error: {
          code: "INVALID_PROVIDER_PERMISSION",
          message: "Invalid provider permission configuration",
        },
      });
    }

    const permissions = Array.isArray(
      req.provider.permissions
    )
      ? req.provider.permissions
      : [];

    if (!permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "PROVIDER_PERMISSION_DENIED",
          message: "Provider does not have the required permission",
          details: {
            requiredPermission: permission,
          },
        },
      });
    }

    next();
  };
}

module.exports = {
  requireProviderPermission,
};