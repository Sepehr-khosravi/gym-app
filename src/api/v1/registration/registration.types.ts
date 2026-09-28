import type { PaymentGatewayName } from "../payment/payment.types";

export interface StartRegistrationInput {
  phone: string;
}

export interface CompleteRegistrationInput {
  registrationId: string;

  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate: Date;

  planId: string;
  gateway: PaymentGatewayName;
}

export interface RegistrationPaymentResult {
  registrationId: string;
  userId: string;
  orderId: string;
  invoiceId: string;
  paymentId: string;

  paymentUrl: string;
  authority: string;
}