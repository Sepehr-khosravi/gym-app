import { z } from "zod";

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(
      /^09\d{9}$/,
      "Invalid phone number",
    ),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(
      /^09\d{9}$/,
      "Invalid phone number",
    ),

  code: z
    .string()
    .trim()
    .regex(
      /^\d{6}$/,
      "Invalid OTP code",
    ),
});

export type SendOtpInput = z.infer<
  typeof sendOtpSchema
>;

export type VerifyOtpInput = z.infer<
  typeof verifyOtpSchema
>;