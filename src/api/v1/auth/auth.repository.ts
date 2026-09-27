import {
  PrismaClient,
  RoleName,
} from "@prisma/client";

import type {
  CreateSessionInput,
  CreateUserInput,
} from "./auth.types";

export class AuthRepository {
  constructor(
    private readonly prisma: PrismaClient,
  ) {}

  async findUserByPhone(phone: string) {
    return this.prisma.user.findFirst({
      where: {
        phone,
      },

      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async createUser(
    input: CreateUserInput,
  ) {
    return this.prisma.user.create({
      data: {
        clubId: input.clubId,

        phone: input.phone,

        firstName: input.firstName,
        lastName: input.lastName,
        nationalId: input.nationalId,
        birthDate: input.birthDate,

        // A newly registered user is not
        // verified until the payment succeeds.
        isVerified: false,

        // RegistrationService will provide
        // the temporary expiration time.
        verificationExpiresAt:
          input.verificationExpiresAt,

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
  }

  async markUserAsVerified(
    userId: string,
  ) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        isVerified: true,
        verificationExpiresAt: null,
      },

      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async createSession(
    input: CreateSessionInput,
  ) {
    return this.prisma.session.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findValidSession(
    tokenHash: string,
  ) {
    return this.prisma.session.findFirst({
      where: {
        tokenHash,

        revokedAt: null,

        expiresAt: {
          gt: new Date(),
        },

        user: {
          status: "ACTIVE",
          isVerified: true,
        },
      },

      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async revokeSession(
    tokenHash: string,
  ) {
    return this.prisma.session.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });
  }

  async deleteExpiredUnverifiedUsers() {
    return this.prisma.user.deleteMany({
      where: {
        isVerified: false,

        verificationExpiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}