import { z } from "zod";
import { PaymentGatewayName } from "../payment/payment.types";

export const startRegistrationSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^09\d{9}$/, "Invalid phone number"),
});

export const registrationTokenSchema = z.object({
  registrationToken: z
    .string()
    .min(1, "Registration token is required"),
});

export const completeProfileSchema = z.object({
  registrationToken: z
    .string()
    .min(1, "Registration token is required"),

  firstName: z
    .string()
    .trim()
    .min(2, "Invalid first name"),

  lastName: z
    .string()
    .trim()
    .min(2, "Invalid last name"),

  nationalId: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Invalid national ID"),

  birthDate: z.coerce.date(),
});

export const createRegistrationPaymentSchema =
  z.object({
    registrationToken: z
      .string()
      .min(1, "Registration token is required"),

    planId: z
      .string()
      .min(1, "Invalid plan ID"),

    gateway: z.nativeEnum(PaymentGatewayName),
  });

export type StartRegistrationInput =
  z.infer<typeof startRegistrationSchema>;

export type CompleteProfileInput =
  z.infer<typeof completeProfileSchema>;

export type CreateRegistrationPaymentInput =
  z.infer<typeof createRegistrationPaymentSchema>;
