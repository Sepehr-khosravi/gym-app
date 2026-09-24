import type {
  CreatePaymentResult,
  VerifyPaymentResult,
} from "../payment.types";

export interface CreateGatewayPaymentInput {
  paymentId: string;
  amount: number;
  callbackUrl: string;
}

export interface VerifyGatewayPaymentInput {
  authority: string;
  amount: number;
}

export interface PaymentGateway {
  createPayment(
    input: CreateGatewayPaymentInput,
  ): Promise<CreatePaymentResult>;

  verifyPayment(
    input: VerifyGatewayPaymentInput,
  ): Promise<VerifyPaymentResult>;

  getCallbackUrl(paymentId: string): string;
}