import {
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";

import type {
  CreatePaymentInput,
  VerifyPaymentInput,
} from "./payment.schemas";

import type {
  CreatePaymentResult,
  VerifyPaymentResult,
} from "./payment.types";

import { PaymentRepository } from "./payment.repository";
import { PaymentGatewayFactory } from "./gateways/payment.gateway.factory";

import {
  parsePaymentGatewayName,
} from "./payment.types";

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly gatewayFactory: PaymentGatewayFactory,
  ) {}

  async createPayment(
    userId: string,
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    const order =
      await this.paymentRepository.findOrderForPayment(
        input.orderId,
        userId,
      );

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "PENDING") {
      throw new Error("Order is not payable");
    }

    const existingPayment =
      await this.paymentRepository.findPendingByOrderId(
        order.id,
      );

    if (existingPayment) {
      throw new Error(
        "Payment already exists for this order",
      );
    }

    const gateway = this.gatewayFactory.create(
      input.gateway,
    );

    const payment =
      await this.paymentRepository.createPending({
        userId,
        orderId: order.id,
        invoiceId: order.invoice?.id,
        amount: Number(order.amount),
        method: PaymentMethod.ZIBAL,
        gateway: input.gateway,
      });

    try {
      const result =
        await gateway.createPayment({
          paymentId: payment.id,
          amount: Number(order.amount),
          callbackUrl:
            gateway.getCallbackUrl(payment.id),
        });

      const authorityResult =
        await this.paymentRepository.setAuthority(
          payment.id,
          result.authority,
        );

      if (authorityResult.count !== 1) {
        throw new Error(
          "Payment authority could not be saved",
        );
      }

      return {
        paymentId: payment.id,
        paymentUrl: result.paymentUrl,
        authority: result.authority,
      };
    } catch (error) {
      await this.paymentRepository.markFailed(
        payment.id,
      );

      throw error;
    }
  }

  async verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    const payment =
      await this.paymentRepository.findById(
        input.paymentId,
      );

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        success: true,
        transactionId:
          payment.transactionId ?? undefined,
      };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new Error(
        "Payment is not verifiable",
      );
    }

    if (!payment.gateway || !payment.authority) {
      throw new Error(
        "Payment gateway information is missing",
      );
    }

    const gateway = this.gatewayFactory.create(
      parsePaymentGatewayName(payment.gateway),
    );

    const result =
      await gateway.verifyPayment({
        authority: payment.authority,
        amount: Number(payment.amount),
      });

    if (!result.success) {
      await this.paymentRepository.markFailed(
        payment.id,
      );

      return {
        success: false,
      };
    }

    if (!result.transactionId) {
      await this.paymentRepository.markFailed(
        payment.id,
      );

      throw new Error(
        "Payment verification succeeded but transaction ID is missing",
      );
    }

    const updated =
      await this.paymentRepository.markSuccess(
        payment.id,
        result.transactionId,
      );

    if (!updated) {
      const current =
        await this.paymentRepository.findById(
          payment.id,
        );

      if (
        current?.status === PaymentStatus.SUCCESS
      ) {
        return {
          success: true,
          transactionId:
            current.transactionId ?? undefined,
        };
      }

      throw new Error(
        "Payment state could not be updated",
      );
    }

    return {
      success: true,
      transactionId: result.transactionId,
    };
  }
}