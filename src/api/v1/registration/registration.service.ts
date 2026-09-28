import crypto from "node:crypto";

import type { PaymentGatewayName } from "../payment/payment.types";
import type { PaymentService } from "../payment/payment.service";

import { RegistrationRepository } from "./registration.repository";

const REGISTRATION_TTL_MS =
  30 * 60 * 1000; // 30 minutes

export interface StartRegistrationInput {
  phone: string;
  clubId: string;
}

export interface CompleteProfileInput {
  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate: Date;
}

export interface CreateRegistrationPaymentInput {
  planId: string;
  gateway: PaymentGatewayName;
}

export class RegistrationService {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly paymentService: PaymentService,
  ) {}

  async startRegistration(
    input: StartRegistrationInput,
  ) {
    const expiresAt = new Date(
      Date.now() + REGISTRATION_TTL_MS,
    );

    const rawToken =
      crypto.randomBytes(32).toString("hex");

    const tokenHash =
      this.hashToken(rawToken);

    const result =
      await this.registrationRepository.createTemporaryRegistration(
        {
          clubId: input.clubId,
          phone: input.phone,
          tokenHash,
          expiresAt,
        },
      );

    return {
      registrationId: result.registration.id,
      userId: result.user.id,

      // This raw token is returned only once.
      // Database stores only its SHA-256 hash.
      registrationToken: rawToken,

      expiresAt,
    };
  }

  async getRegistration(
    registrationToken: string,
  ) {
    const registration =
      await this.findValidRegistration(
        registrationToken,
      );

    return {
      id: registration.id,
      userId: registration.userId,
      phone: registration.user.phone,
      firstName: registration.user.firstName,
      lastName: registration.user.lastName,
      nationalId: registration.user.nationalId,
      birthDate: registration.user.birthDate,
      expiresAt: registration.expiresAt,
    };
  }

  async completeProfile(
    registrationToken: string,
    input: CompleteProfileInput,
  ) {
    const registration =
      await this.findValidRegistration(
        registrationToken,
      );

    const user =
      await this.registrationRepository.updateProfile(
        registration.userId,
        input,
      );

    return {
      userId: user.id,
      profileCompleted: true,
    };
  }

  async createPayment(
    registrationToken: string,
    input: CreateRegistrationPaymentInput,
  ) {
    const registration =
      await this.findValidRegistration(
        registrationToken,
      );

    const order =
      await this.registrationRepository.createOrder(
        registration.userId,
        {
          planId: input.planId,
        },
      );

    if (!order.order) {
      throw new Error("Order could not be created");
    }

    const payment =
      await this.paymentService.createPayment(
        registration.userId,
        {
          orderId: order.order.id,
          gateway: input.gateway,
        },
      );

    return {
      registrationId: registration.id,
      orderId: order.order.id,
      paymentId: payment.paymentId,
      paymentUrl: payment.paymentUrl,
      authority: payment.authority,
      expiresAt: registration.expiresAt,
    };
  }

  async finalizePayment(
    paymentId: string,
  ) {
    const payment =
      await this.registrationRepository.findPaymentContext(
        paymentId,
      );

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (!payment.user.registrations.length) {
      // This is a normal generic payment,
      // not a registration payment.
      return {
        registration: false,
      };
    }

    if (
      payment.status !== "SUCCESS"
    ) {
      throw new Error(
        "Payment is not successful",
      );
    }

    const result =
      await this.registrationRepository.finalizePayment(
        paymentId,
      );

    return {
      registration: true,
      ...result,
    };
  }

  async cleanupExpiredRegistrations() {
    return this.registrationRepository
      .cleanupExpiredRegistrations();
  }

  private async findValidRegistration(
    registrationToken: string,
  ) {
    const tokenHash =
      this.hashToken(registrationToken);

    const registration =
      await this.registrationRepository.findByTokenHash(
        tokenHash,
      );

    if (!registration) {
      throw new Error(
        "Registration not found",
      );
    }

    if (registration.completedAt) {
      throw new Error(
        "Registration is already completed",
      );
    }

    if (
      registration.expiresAt.getTime() <=
      Date.now()
    ) {
      throw new Error(
        "Registration has expired",
      );
    }

    if (
      registration.user.isVerified
    ) {
      throw new Error(
        "User is already verified",
      );
    }

    if (
      registration.user.status !== "ACTIVE"
    ) {
      throw new Error(
        "User is not active",
      );
    }

    return registration;
  }

  private hashToken(token: string) {
    return crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
  }
}
