import type {
  CreatePaymentInput,
  VerifyPaymentInput,
} from "./payment.schemas";

export type {
  CreatePaymentInput,
  VerifyPaymentInput,
};

export enum PaymentGatewayName {
  ZARINPAL = "ZARINPAL",
  ZIBAL = "ZIBAL",
}

export function parsePaymentGatewayName(
  value: string,
): PaymentGatewayName {
  switch (value) {
    case PaymentGatewayName.ZARINPAL:
      return PaymentGatewayName.ZARINPAL;

    case PaymentGatewayName.ZIBAL:
      return PaymentGatewayName.ZIBAL;

    default:
      throw new Error(
        `Unsupported payment gateway: ${value}`,
      );
  }
}

export interface CreatePaymentResult {
  paymentId: string;
  paymentUrl: string;
  authority: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  transactionId?: string;
}