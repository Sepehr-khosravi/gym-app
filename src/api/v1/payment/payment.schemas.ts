import { z } from "zod";

import { PaymentGatewayName } from "./payment.types";

export const createPaymentSchema = z.object({
  orderId: z.string().min(1, "Invalid order ID"),
  gateway: z.nativeEnum(PaymentGatewayName),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1, "Invalid payment ID"),
});

export type CreatePaymentInput =
  z.infer<typeof createPaymentSchema>;

export type VerifyPaymentInput =
  z.infer<typeof verifyPaymentSchema>;