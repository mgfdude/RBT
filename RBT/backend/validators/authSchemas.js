const { z } = require("zod");

const registerSchema = z.object({
  bankId: z.string().trim().min(1).max(50),

  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Username may contain letters, numbers, _, ., and - only"
    ),

  password: z
    .string()
    .min(8)
    .max(128),

  fullName: z
    .string()
    .trim()
    .min(2)
    .max(100),

  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .optional(),

  phone: z
    .string()
    .trim()
    .max(30)
    .optional(),
});

const loginSchema = z.object({
  bankId: z.string().trim().min(1).max(50),

  username: z
    .string()
    .trim()
    .min(1)
    .max(30),

  password: z
    .string()
    .min(1)
    .max(128),
});

module.exports = {
  registerSchema,
  loginSchema,
};