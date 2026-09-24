import type {
  CreateGatewayPaymentInput,
  PaymentGateway,
  VerifyGatewayPaymentInput,
} from "./payment.gateway";

import type {
  CreatePaymentResult,
  VerifyPaymentResult,
} from "../payment.types";

import config from "../../../../config/config";

interface ZarinpalRequestResponse {
  data?: {
    code?: number;
    message?: string;
    authority?: string;
  };
  errors?: unknown;
}

interface ZarinpalVerifyResponse {
  data?: {
    code?: number;
    message?: string;
    ref_id?: number;
  };
  errors?: unknown;
}

export class ZarinpalGateway
  implements PaymentGateway
{
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = config.payment.zarinpal.sandbox
      ? "https://sandbox.zarinpal.com"
      : "https://payment.zarinpal.com";
  }

  async createPayment(
    input: CreateGatewayPaymentInput,
  ): Promise<CreatePaymentResult> {
    const response = await fetch(
      `${this.baseUrl}/pg/v4/payment/request.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant_id:
            config.payment.zarinpal.merchantId,

          amount: input.amount,

          callback_url: input.callbackUrl,

          description: `Payment ${input.paymentId}`,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `ZarinPal request failed: ${response.status}`,
      );
    }

    const result =
      (await response.json()) as ZarinpalRequestResponse;

    const code = result.data?.code;
    const authority = result.data?.authority;

    if (code !== 100 || !authority) {
      throw new Error(
        `ZarinPal payment request failed: ${
          result.data?.message ?? "Unknown error"
        }`,
      );
    }

    return {
      paymentId: input.paymentId,
      authority,
      paymentUrl:
        `${this.baseUrl}/pg/StartPay/${authority}`,
    };
  }

  async verifyPayment(
    input: VerifyGatewayPaymentInput,
  ): Promise<VerifyPaymentResult> {
    const response = await fetch(
      `${this.baseUrl}/pg/v4/payment/verify.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant_id:
            config.payment.zarinpal.merchantId,

          amount: input.amount,

          authority: input.authority,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `ZarinPal verification failed: ${response.status}`,
      );
    }

    const result =
      (await response.json()) as ZarinpalVerifyResponse;

    const code = result.data?.code;

    if (code !== 100 && code !== 101) {
      return {
        success: false,
      };
    }

    return {
      success: true,
      transactionId:
        result.data?.ref_id?.toString(),
    };
  }

  getCallbackUrl(paymentId: string): string {
    const base =
      config.payment.zarinpal.callbackUrl;

    const separator = base.includes("?")
      ? "&"
      : "?";

    return `${base}${separator}paymentId=${encodeURIComponent(
      paymentId,
    )}`;
  }
}