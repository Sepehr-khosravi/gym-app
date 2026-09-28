import { PrismaClient } from "@prisma/client";

// Auth
import { AuthRepository } from "./api/v1/auth/auth.repository";
import { AuthService } from "./api/v1/auth/auth.service";
import { AuthController } from "./api/v1/auth/auth.controller";

// Payment
import { PaymentRepository } from "./api/v1/payment/payment.repository";
import { PaymentService } from "./api/v1/payment/payment.service";
import { PaymentController } from "./api/v1/payment/payment.controller";

// Payment Gateways
import { PaymentGatewayFactory } from "./api/v1/payment/gateways/payment.gateway.factory";
import { ZarinpalGateway } from "./api/v1/payment/gateways/zarinpal.gateway";
import { ZibalGateway } from "./api/v1/payment/gateways/zibal.gateway";

// Registration
import { RegistrationRepository } from "./api/v1/registration/registration.repository";
import { RegistrationService } from "./api/v1/registration/registration.service";
import { RegistrationController } from "./api/v1/registration/registration.controller";

// OTP
import { OtpService } from "./services/otp/otp.service";
import type { OtpProvider } from "./services/otp/otp.provider";

export function createContainer(
  prisma: PrismaClient,
  otpProvider: OtpProvider,
) {
  // ─────────────────────────────────────────────
  // OTP
  // ─────────────────────────────────────────────

  const otpService = new OtpService(
    otpProvider,
  );

  // ─────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────

  const authRepository =
    new AuthRepository(prisma);

  const authService = new AuthService(
    authRepository,
    otpService,
  );

  const authController =
    new AuthController(authService);

  // ─────────────────────────────────────────────
  // PAYMENT
  // ─────────────────────────────────────────────

  const paymentRepository =
    new PaymentRepository(prisma);

  const zarinpalGateway =
    new ZarinpalGateway();

  const zibalGateway =
    new ZibalGateway();

  const paymentGatewayFactory =
    new PaymentGatewayFactory(
      zarinpalGateway,
      zibalGateway,
    );

  const paymentService =
    new PaymentService(
      paymentRepository,
      paymentGatewayFactory,
    );

  // ─────────────────────────────────────────────
  // REGISTRATION
  // ─────────────────────────────────────────────

  const registrationRepository =
    new RegistrationRepository(prisma);

  const registrationService =
    new RegistrationService(
      registrationRepository,
      paymentService,
    );

  const registrationController =
    new RegistrationController(
      registrationService,
    );

  // ─────────────────────────────────────────────
  // PAYMENT CONTROLLER
  // ─────────────────────────────────────────────

  const paymentController =
    new PaymentController(
      paymentService,
      registrationService,
    );

  return {
    otpService,

    authRepository,
    authService,
    authController,

    paymentRepository,
    zarinpalGateway,
    zibalGateway,
    paymentGatewayFactory,
    paymentService,
    paymentController,

    registrationRepository,
    registrationService,
    registrationController,
  };
}

export type AppContainer =
  ReturnType<typeof createContainer>;
