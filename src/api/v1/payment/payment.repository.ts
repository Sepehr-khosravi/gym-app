import {
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
} from "@prisma/client";

export class PaymentRepository {
  constructor(
    private readonly prisma: PrismaClient,
  ) {}

  async findOrderForPayment(
    orderId: string,
    userId: string,
  ) {
    return this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        invoice: true,
      },
    });
  }

  async findPendingByOrderId(orderId: string) {
    return this.prisma.payment.findFirst({
      where: {
        orderId,
        status: PaymentStatus.PENDING,
      },
    });
  }

  async createPending(data: {
    userId: string;
    orderId: string;
    invoiceId?: string;
    amount: number;
    method: PaymentMethod;
    gateway: string;
  }) {
    return this.prisma.payment.create({
      data: {
        userId: data.userId,
        orderId: data.orderId,
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method,
        gateway: data.gateway,
        status: PaymentStatus.PENDING,
      },
    });
  }

  async setAuthority(
    paymentId: string,
    authority: string,
  ) {
    return this.prisma.payment.updateMany({
      where: {
        id: paymentId,
        status: PaymentStatus.PENDING,
        authority: null,
      },
      data: {
        authority,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.payment.findUnique({
      where: {
        id,
      },
    });
  }

  async findByAuthority(authority: string) {
    return this.prisma.payment.findFirst({
      where: {
        authority,
      },
    });
  }

  async findByTransactionId(
    transactionId: string,
  ) {
    return this.prisma.payment.findFirst({
      where: {
        transactionId,
      },
    });
  }

  async markSuccess(
    paymentId: string,
    transactionId: string,
  ) {
    const result =
      await this.prisma.payment.updateMany({
        where: {
          id: paymentId,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.SUCCESS,
          transactionId,
          paidAt: new Date(),
        },
      });

    return result.count === 1;
  }

  async markFailed(paymentId: string) {
    const result =
      await this.prisma.payment.updateMany({
        where: {
          id: paymentId,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

    return result.count === 1;
  }

  async markCancelled(paymentId: string) {
    const result =
      await this.prisma.payment.updateMany({
        where: {
          id: paymentId,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.CANCELLED,
        },
      });

    return result.count === 1;
  }

  async markRefunded(paymentId: string) {
    const result =
      await this.prisma.payment.updateMany({
        where: {
          id: paymentId,
          status: PaymentStatus.SUCCESS,
        },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });

    return result.count === 1;
  }
}