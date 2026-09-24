import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";

import { PaymentService } from "../../../src/api/v1/payment/payment.service";

import { PaymentStatus as PrismaPaymentStatus } from "@prisma/client";

import {
  PaymentGatewayName,
  type CreatePaymentResult,
  type VerifyPaymentResult,
} from "../../../src/api/v1/payment/payment.types";

import type { PaymentRepository } from "../../../src/api/v1/payment/payment.repository";
import type { PaymentGatewayFactory } from "../../../src/api/v1/payment/gateways/payment.gateway.factory";
import type { PaymentGateway } from "../../../src/api/v1/payment/gateways/payment.gateway";

describe("PaymentService", () => {
  let service: PaymentService;

  let repository: {
    findOrderForPayment: ReturnType<typeof vi.fn>;
    findPendingByOrderId: ReturnType<typeof vi.fn>;
    createPending: ReturnType<typeof vi.fn>;
    setAuthority: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    markSuccess: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
  };

  let gateway: {
    createPayment: ReturnType<typeof vi.fn>;
    verifyPayment: ReturnType<typeof vi.fn>;
    getCallbackUrl: ReturnType<typeof vi.fn>;
  };

  let gatewayFactory: {
    create: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findOrderForPayment: vi.fn(),
      findPendingByOrderId: vi.fn(),
      createPending: vi.fn(),
      setAuthority: vi.fn(),
      findById: vi.fn(),
      markSuccess: vi.fn(),
      markFailed: vi.fn(),
    };

    gateway = {
      createPayment: vi.fn(),
      verifyPayment: vi.fn(),
      getCallbackUrl: vi.fn(),
    };

    gatewayFactory = {
      create: vi.fn(),
    };

    service = new PaymentService(
      repository as unknown as PaymentRepository,
      gatewayFactory as unknown as PaymentGatewayFactory,
    );
  });

  describe("createPayment", () => {
    const userId = "user-123";
    const orderId = "order-123";

    const order = {
      id: orderId,
      userId,
      planId: "plan-123",
      status: "PENDING",
      amount: 500000,
      invoice: {
        id: "invoice-123",
      },
    };

    const payment = {
      id: "payment-123",
      userId,
      orderId,
      invoiceId: "invoice-123",
      amount: 500000,
      method: PaymentMethod.ZIBAL,
      status: PaymentStatus.PENDING,
      gateway: PaymentGatewayName.ZARINPAL,
      authority: null,
    };

    beforeEach(() => {
      repository.findOrderForPayment.mockResolvedValue(
        order,
      );

      repository.findPendingByOrderId.mockResolvedValue(
        null,
      );

      repository.createPending.mockResolvedValue(
        payment,
      );

      repository.setAuthority.mockResolvedValue({
        count: 1,
      });

      gateway.createPayment.mockResolvedValue({
        paymentId: payment.id,
        paymentUrl:
          "https://payment.example/test",
        authority: "AUTH-123",
      } satisfies CreatePaymentResult);

      gateway.getCallbackUrl.mockReturnValue(
        "http://localhost:8080/payment/callback",
      );

      gatewayFactory.create.mockReturnValue(
        gateway as unknown as PaymentGateway,
      );
    });

    it("creates a pending payment and returns gateway data", async () => {
      const result =
        await service.createPayment(userId, {
          orderId,
          gateway: PaymentGatewayName.ZARINPAL,
        });

      expect(
        repository.findOrderForPayment,
      ).toHaveBeenCalledWith(
        orderId,
        userId,
      );

      expect(
        repository.findPendingByOrderId,
      ).toHaveBeenCalledWith(orderId);

      expect(
        repository.createPending,
      ).toHaveBeenCalledWith({
        userId,
        orderId,
        invoiceId: "invoice-123",
        amount: 500000,
        method: PaymentMethod.ZIBAL,
        gateway: PaymentGatewayName.ZARINPAL,
      });

      expect(
        gatewayFactory.create,
      ).toHaveBeenCalledWith(
        PaymentGatewayName.ZARINPAL,
      );

      expect(
        gateway.createPayment,
      ).toHaveBeenCalledWith({
        paymentId: "payment-123",
        amount: 500000,
        callbackUrl:
          "http://localhost:8080/payment/callback",
      });

      expect(
        repository.setAuthority,
      ).toHaveBeenCalledWith(
        "payment-123",
        "AUTH-123",
      );

      expect(result).toEqual({
        paymentId: "payment-123",
        paymentUrl:
          "https://payment.example/test",
        authority: "AUTH-123",
      });
    });

    it("rejects when the order does not exist", async () => {
      repository.findOrderForPayment.mockResolvedValue(
        null,
      );

      await expect(
        service.createPayment(userId, {
          orderId,
          gateway: PaymentGatewayName.ZARINPAL,
        }),
      ).rejects.toThrow("Order not found");

      expect(
        repository.createPending,
      ).not.toHaveBeenCalled();

      expect(
        gateway.createPayment,
      ).not.toHaveBeenCalled();
    });

    it("rejects an order that is not pending", async () => {
      repository.findOrderForPayment.mockResolvedValue({
        ...order,
        status: "PAID",
      });

      await expect(
        service.createPayment(userId, {
          orderId,
          gateway: PaymentGatewayName.ZARINPAL,
        }),
      ).rejects.toThrow(
        "Order is not payable",
      );

      expect(
        repository.createPending,
      ).not.toHaveBeenCalled();
    });

    it("rejects when a pending payment already exists", async () => {
      repository.findPendingByOrderId.mockResolvedValue({
        id: "existing-payment",
        status: PaymentStatus.PENDING,
      });

      await expect(
        service.createPayment(userId, {
          orderId,
          gateway: PaymentGatewayName.ZARINPAL,
        }),
      ).rejects.toThrow(
        "Payment already exists for this order",
      );

      expect(
        repository.createPending,
      ).not.toHaveBeenCalled();

      expect(
        gateway.createPayment,
      ).not.toHaveBeenCalled();
    });

    it("marks payment as failed when gateway creation throws", async () => {
      const error = new Error(
        "Gateway unavailable",
      );

      gateway.createPayment.mockRejectedValue(
        error,
      );

      await expect(
        service.createPayment(userId, {
          orderId,
          gateway: PaymentGatewayName.ZARINPAL,
        }),
      ).rejects.toThrow(
        "Gateway unavailable",
      );

      expect(
        repository.markFailed,
      ).toHaveBeenCalledWith(
        "payment-123",
      );
    });

    it("marks payment as failed when authority cannot be saved", async () => {
      repository.setAuthority.mockResolvedValue({
        count: 0,
      });

      await expect(
        service.createPayment(userId, {
          orderId,
          gateway: PaymentGatewayName.ZARINPAL,
        }),
      ).rejects.toThrow(
        "Payment authority could not be saved",
      );

      expect(
        repository.markFailed,
      ).toHaveBeenCalledWith(
        "payment-123",
      );
    });
  });

  describe("verifyPayment", () => {
    const paymentId = "payment-123";

    beforeEach(() => {
      gatewayFactory.create.mockReturnValue(
        gateway as unknown as PaymentGateway,
      );
    });

    it("returns success immediately for an already successful payment", async () => {
      repository.findById.mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.SUCCESS,
        transactionId: "TX-123",
      });

      const result =
        await service.verifyPayment({
          paymentId,
        });

      expect(result).toEqual({
        success: true,
        transactionId: "TX-123",
      });

      expect(
        gatewayFactory.create,
      ).not.toHaveBeenCalled();

      expect(
        gateway.verifyPayment,
      ).not.toHaveBeenCalled();
    });

    it("rejects when payment does not exist", async () => {
      repository.findById.mockResolvedValue(
        null,
      );

      await expect(
        service.verifyPayment({
          paymentId,
        }),
      ).rejects.toThrow(
        "Payment not found",
      );
    });

    it("rejects a non-pending payment", async () => {
      repository.findById.mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.CANCELLED,
        transactionId: null,
      });

      await expect(
        service.verifyPayment({
          paymentId,
        }),
      ).rejects.toThrow(
        "Payment is not verifiable",
      );

      expect(
        gateway.verifyPayment,
      ).not.toHaveBeenCalled();
    });

    it("rejects when gateway information is missing", async () => {
      repository.findById.mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.PENDING,
        gateway: null,
        authority: null,
        amount: 500000,
      });

      await expect(
        service.verifyPayment({
          paymentId,
        }),
      ).rejects.toThrow(
        "Payment gateway information is missing",
      );
    });

    it("marks payment as failed when gateway verification fails", async () => {
      repository.findById.mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.PENDING,
        gateway: PaymentGatewayName.ZARINPAL,
        authority: "AUTH-123",
        amount: 500000,
      });

      gateway.verifyPayment.mockResolvedValue({
        success: false,
      } satisfies VerifyPaymentResult);

      await expect(
        service.verifyPayment({
          paymentId,
        }),
      ).resolves.toEqual({
        success: false,
      });

      expect(
        gatewayFactory.create,
      ).toHaveBeenCalledWith(
        PaymentGatewayName.ZARINPAL,
      );

      expect(
        gateway.verifyPayment,
      ).toHaveBeenCalledWith({
        authority: "AUTH-123",
        amount: 500000,
      });

      expect(
        repository.markFailed,
      ).toHaveBeenCalledWith(
        paymentId,
      );
    });

    it("marks payment as successful after successful verification", async () => {
      repository.findById.mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.PENDING,
        gateway: PaymentGatewayName.ZARINPAL,
        authority: "AUTH-123",
        amount: 500000,
      });

      gateway.verifyPayment.mockResolvedValue({
        success: true,
        transactionId: "TX-123",
      } satisfies VerifyPaymentResult);

      repository.markSuccess.mockResolvedValue(
        true,
      );

      const result =
        await service.verifyPayment({
          paymentId,
        });

      expect(
        repository.markSuccess,
      ).toHaveBeenCalledWith(
        paymentId,
        "TX-123",
      );

      expect(result).toEqual({
        success: true,
        transactionId: "TX-123",
      });
    });

    it("fails verification when gateway reports success without transaction id", async () => {
      repository.findById.mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.PENDING,
        gateway: PaymentGatewayName.ZARINPAL,
        authority: "AUTH-123",
        amount: 500000,
      });

      gateway.verifyPayment.mockResolvedValue({
        success: true,
      } satisfies VerifyPaymentResult);

      await expect(
        service.verifyPayment({
          paymentId,
        }),
      ).rejects.toThrow(
        "Payment verification succeeded but transaction ID is missing",
      );

      expect(
        repository.markFailed,
      ).toHaveBeenCalledWith(
        paymentId,
      );

      expect(
        repository.markSuccess,
      ).not.toHaveBeenCalled();
    });

    it("handles concurrent verification safely when another request already succeeded", async () => {
      repository.findById
        .mockResolvedValueOnce({
          id: paymentId,
          status: PaymentStatus.PENDING,
          gateway: PaymentGatewayName.ZARINPAL,
          authority: "AUTH-123",
          amount: 500000,
        })
        .mockResolvedValueOnce({
          id: paymentId,
          status: PaymentStatus.SUCCESS,
          transactionId: "TX-123",
        });

      gateway.verifyPayment.mockResolvedValue({
        success: true,
        transactionId: "TX-123",
      } satisfies VerifyPaymentResult);

      repository.markSuccess.mockResolvedValue(
        false,
      );

      const result =
        await service.verifyPayment({
          paymentId,
        });

      expect(result).toEqual({
        success: true,
        transactionId: "TX-123",
      });
    });

    it("throws when payment state cannot be updated after verification", async () => {
      repository.findById
        .mockResolvedValueOnce({
          id: paymentId,
          status: PaymentStatus.PENDING,
          gateway: PaymentGatewayName.ZARINPAL,
          authority: "AUTH-123",
          amount: 500000,
        })
        .mockResolvedValueOnce({
          id: paymentId,
          status: PaymentStatus.PENDING,
          transactionId: null,
        });

      gateway.verifyPayment.mockResolvedValue({
        success: true,
        transactionId: "TX-123",
      } satisfies VerifyPaymentResult);

      repository.markSuccess.mockResolvedValue(
        false,
      );

      await expect(
        service.verifyPayment({
          paymentId,
        }),
      ).rejects.toThrow(
        "Payment state could not be updated",
      );
    });
  });
});
