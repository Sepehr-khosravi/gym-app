import { z } from "zod";

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^09\d{9}$/, "Invalid phone number"),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^09\d{9}$/, "Invalid phone number"),

  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Invalid OTP code"),

  firstName: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .optional(),

  lastName: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .optional(),

  nationalId: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Invalid national ID")
    .optional(),

  birthDate: z
    .coerce
    .date()
    .optional(),
});

export type SendOtpInput = z.infer<
  typeof sendOtpSchema
>;

export type VerifyOtpInput = z.infer<
  typeof verifyOtpSchema
>;