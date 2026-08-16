const { z } = require("zod");

const createAccountSchema = z.object({
  accountType: z
    .enum(["SAVINGS", "CURRENT"])
    .default("SAVINGS"),

  currency: z
    .literal("INR")
    .default("INR"),
});

module.exports = {
  createAccountSchema,
};