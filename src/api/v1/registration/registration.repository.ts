import {
  OrderStatus,
  PaymentStatus,
  RoleName,
  UserStatus,
  PrismaClient,
} from "@prisma/client";

export class RegistrationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createTemporaryRegistration(input: {
    clubId: string;
    phone: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          clubId: input.clubId,
          phone: input.phone,
          isVerified: false,
          verificationExpiresAt: input.expiresAt,
          status: UserStatus.ACTIVE,

          roles: {
            create: {
              role: {
                connect: {
                  name: RoleName.MEMBER,
                },
              },
            },
          },
        },

        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      const registration = await tx.registration.create({
        data: {
          userId: user.id,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        },
      });

      return {
        user,
        registration,
      };
    });
  }

  async findByTokenHash(tokenHash: string) {
    return this.prisma.registration.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.registration.findUnique({
      where: {
        userId,
      },
      include: {
        user: true,
      },
    });
  }

  async updateProfile(
    userId: string,
    input: {
      firstName: string;
      lastName: string;
      nationalId: string;
      birthDate: Date;
    },
  ) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        nationalId: input.nationalId,
        birthDate: input.birthDate,
      },
    });
  }

  async createOrder(
    userId: string,
    input: {
      planId: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const plan = await tx.membershipPlan.findFirst({
        where: {
          id: input.planId,
          clubId: user.clubId,
          isActive: true,
        },
      });

      if (!plan) {
        throw new Error("Membership plan not found");
      }

      const existingPendingOrder =
        await tx.order.findFirst({
          where: {
            userId,
            status: OrderStatus.PENDING,
          },
        });

      if (existingPendingOrder) {
        return {
          order: existingPendingOrder,
          invoice: await tx.invoice.findUnique({
            where: {
              orderId: existingPendingOrder.id,
            },
          }),
        };
      }

      const order = await tx.order.create({
        data: {
          userId,
          planId: plan.id,
          amount: plan.price,
          status: OrderStatus.PENDING,
          currency: "IRR",
        },
      });

      const invoice = await tx.invoice.create({
        data: {
          userId,
          orderId: order.id,
          amount: plan.price,
          status: PaymentStatus.PENDING,
        },
      });

      return {
        order,
        invoice,
      };
    });
  }

  async findPaymentContext(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        order: {
          include: {
            plan: true,
            invoice: true,
          },
        },
        invoice: true,
        user: {
          include: {
            registrations: true,
          },
        },
      },
    });
  }

  async finalizePayment(paymentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: {
          id: paymentId,
        },
        include: {
          order: {
            include: {
              plan: true,
              invoice: true,
            },
          },
          invoice: true,
          user: {
            include: {
              registrations: true,
            },
          },
        },
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.status !== PaymentStatus.SUCCESS) {
        throw new Error("Payment is not successful");
      }

      const registration =
        payment.user.registrations[0];

      if (!registration) {
        throw new Error(
          "Registration not found for this payment",
        );
      }

      // Idempotency:
      // If another callback already finalized this registration,
      // there is nothing more to do.
      if (registration.completedAt) {
        return {
          alreadyFinalized: true,
          userId: payment.userId,
          orderId: payment.orderId,
        };
      }

      const now = new Date();

      const claimed =
        await tx.registration.updateMany({
          where: {
            id: registration.id,
            completedAt: null,
          },
          data: {
            completedAt: now,
          },
        });

      if (claimed.count !== 1) {
        return {
          alreadyFinalized: true,
          userId: payment.userId,
          orderId: payment.orderId,
        };
      }

      const membership =
        await tx.membership.create({
          data: {
            userId: payment.userId,
            planId: payment.order.planId,
            startsAt: now,
            expiresAt: new Date(
              now.getTime() +
                payment.order.plan.durationDays *
                  24 *
                  60 *
                  60 *
                  1000,
            ),
            status: "ACTIVE",
          },
        });

      await tx.order.update({
        where: {
          id: payment.orderId,
        },
        data: {
          status: OrderStatus.PAID,
          paidAt: payment.paidAt ?? now,
        },
      });

      if (payment.invoiceId) {
        await tx.invoice.update({
          where: {
            id: payment.invoiceId,
          },
          data: {
            status: PaymentStatus.SUCCESS,
            membershipId: membership.id,
          },
        });
      }

      await tx.user.update({
        where: {
          id: payment.userId,
        },
        data: {
          isVerified: true,
          verificationExpiresAt: null,
          lastLoginAt: null,
        },
      });

      return {
        alreadyFinalized: false,
        userId: payment.userId,
        orderId: payment.orderId,
        membershipId: membership.id,
      };
    });
  }

  async cleanupExpiredRegistrations() {
    const now = new Date();

    const registrations =
      await this.prisma.registration.findMany({
        where: {
          expiresAt: {
            lt: now,
          },
          completedAt: null,
          user: {
            isVerified: false,
          },
        },
        include: {
          user: {
            include: {
              orders: {
                include: {
                  payments: true,
                  invoice: true,
                },
              },
            },
          },
        },
      });

    let deleted = 0;

    for (const registration of registrations) {
      await this.prisma.$transaction(async (tx) => {
        const userId = registration.userId;

        const payments =
          await tx.payment.findMany({
            where: {
              userId,
            },
          });

        // Never delete a temporary user if a successful payment
        // exists. Money has already been paid and must be finalized.
        if (
          payments.some(
            (payment) =>
              payment.status === PaymentStatus.SUCCESS,
          )
        ) {
          return;
        }

        await tx.payment.deleteMany({
          where: {
            userId,
          },
        });

        await tx.invoice.deleteMany({
          where: {
            userId,
          },
        });

        await tx.order.deleteMany({
          where: {
            userId,
          },
        });

        await tx.registration.delete({
          where: {
            id: registration.id,
          },
        });

        await tx.user.delete({
          where: {
            id: userId,
          },
        });

        deleted++;
      });
    }

    return deleted;
  }
}
