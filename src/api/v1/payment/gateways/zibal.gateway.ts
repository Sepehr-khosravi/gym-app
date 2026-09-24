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

interface ZibalRequestResponse {
  trackId?: number;
  resultCode?: number;
  message?: string;
}

interface ZibalVerifyResponse {
  paidAt?: string;
  resultCode?: number;
  message?: string;
  refNumber?: string;
}

export class ZibalGateway implements PaymentGateway {
  private readonly baseUrl =
    "https://gateway.zibal.ir";

  async createPayment(
    input: CreateGatewayPaymentInput,
  ): Promise<CreatePaymentResult> {
    const response = await fetch(
      `${this.baseUrl}/v1/request`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant:
            config.payment.zibal.merchantId,

          amount: input.amount,

          callbackUrl: input.callbackUrl,

          orderId: input.paymentId,

          description:
            `Payment ${input.paymentId}`,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Zibal request failed: ${response.status}`,
      );
    }

    const result =
      (await response.json()) as ZibalRequestResponse;

    if (
      result.resultCode !== 100 &&
      result.resultCode !== undefined
    ) {
      throw new Error(
        `Zibal payment request failed: ${
          result.message ?? "Unknown error"
        }`,
      );
    }

    if (!result.trackId) {
      throw new Error(
        "Zibal payment request did not return trackId",
      );
    }

    const trackId =
      result.trackId.toString();

    return {
      paymentId: input.paymentId,

      authority: trackId,

      paymentUrl:
        `${this.baseUrl}/start/${trackId}`,
    };
  }

  async verifyPayment(
    input: VerifyGatewayPaymentInput,
  ): Promise<VerifyPaymentResult> {
    const response = await fetch(
      `${this.baseUrl}/v1/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant:
            config.payment.zibal.merchantId,

          trackId: Number(input.authority),

          amount: input.amount,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Zibal verification failed: ${response.status}`,
      );
    }

    const result =
      (await response.json()) as ZibalVerifyResponse;

    if (result.resultCode !== 100) {
      return {
        success: false,
      };
    }

    return {
      success: true,
      transactionId:
        result.refNumber,
    };
  }

  getCallbackUrl(
    paymentId: string,
  ): string {
    const base =
      config.payment.zibal.callbackUrl;

    const separator = base.includes("?")
      ? "&"
      : "?";

    return `${base}${separator}paymentId=${encodeURIComponent(
      paymentId,
    )}`;
  }
}