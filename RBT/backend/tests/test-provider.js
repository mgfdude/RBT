const {
  registerProvider,
  findProviderByApiKeyId,
  verifyProviderSecret,
  addPermission,
  getProviderPermissions,
} = require("../services/provider/providerService");

try {
  // 1. Register test UPI provider
  const provider = registerProvider({
    name: "RBT UPI Test Provider",
    providerType: "UPI",
  });

  console.log("\n=== PROVIDER CREATED ===");
  console.log({
    providerId: provider.providerId,
    name: provider.name,
    providerType: provider.providerType,
    apiKeyId: provider.apiKeyId,
    apiSecret: provider.apiSecret,
    status: provider.status,
  });

  // 2. Find provider using API key ID
  const storedProvider =
    findProviderByApiKeyId(provider.apiKeyId);

  console.log("\n=== PROVIDER LOOKUP ===");
  console.log({
    providerId: storedProvider.provider_id,
    apiKeyId: storedProvider.api_key_id,
    status: storedProvider.status,
    secretHashExists:
      Boolean(storedProvider.api_secret_hash),
  });

  // 3. Verify correct secret
  const validSecret =
    verifyProviderSecret(
      storedProvider,
      provider.apiSecret
    );

  console.log(
    "\nCorrect secret:",
    validSecret
  );

  // 4. Verify incorrect secret
  const invalidSecret =
    verifyProviderSecret(
      storedProvider,
      "wrong-secret"
    );

  console.log(
    "Incorrect secret:",
    invalidSecret
  );

  // 5. Add permission
  const permission =
    addPermission(
      provider.providerId,
      "PAYMENTS_CREATE"
    );

  console.log("\n=== PERMISSION CREATED ===");
  console.log(permission);

  // 6. Read permissions
  const permissions =
    getProviderPermissions(
      provider.providerId
    );

  console.log("\n=== PROVIDER PERMISSIONS ===");
  console.table(permissions);

  console.log(
    "\nPROVIDER TEST PASSED"
  );

} catch (error) {
  console.error(
    "\nPROVIDER TEST FAILED"
  );

  console.error(error);

  process.exit(1);
}