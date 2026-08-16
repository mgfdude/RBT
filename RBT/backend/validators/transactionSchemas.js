const { z } = require("zod");

const seedAccountSchema = z.object({
  amountPaise: z
    .number()
    .int()
    .positive(),

  reference: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
});

// Transfer schema for customer-facing transfer API
// Uses destination account number + IFSC code instead of internal account ID
const transferSchema = z.object({
  sourceAccountId: z
    .string()
    .trim()
    .min(1),

  destinationAccountNumber: z
    .string()
    .trim()
    .min(1),

  destinationIfscCode: z
    .string()
    .trim()
    .min(1),

  amountPaise: z
    .number()
    .int()
    .positive(),

  reference: z
    .string()
    .trim()
    .max(100)
    .optional(),
});

module.exports = {
  seedAccountSchema,
  transferSchema,
};