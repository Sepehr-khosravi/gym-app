import { PrismaClient } from "@prisma/client";

import { AuthRepository } from "./api/v1/auth/auth.repository";
import { AuthService } from "./api/v1/auth/auth.service";
import { AuthController } from "./api/v1/auth/auth.controller";

import { OtpService } from "./services/otp/otp.service";
import type { OtpProvider } from "./services/otp/otp.provider";

import { PaymentRepository } from "./api/v1/payment/payment.repository";
import { PaymentService } from "./api/v1/payment/payment.service";
import { PaymentController } from "./api/v1/payment/payment.controller";

import { PaymentGatewayFactory } from "./api/v1/payment/gateways/payment.gateway.factory";
import { ZarinpalGateway } from "./api/v1/payment/gateways/zarinpal.gateway";
import { ZibalGateway } from "./api/v1/payment/gateways/zibal.gateway";

export function createContainer(
  prisma: PrismaClient,
  otpProvider: OtpProvider,
) {
  // Auth
  const authRepository =
    new AuthRepository(prisma);

  const otpService =
    new OtpService(otpProvider);

  const authService =
    new AuthService(
      authRepository,
      otpService,
    );

  const authController =
    new AuthController(authService);

  // Payment
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

  const paymentController =
    new PaymentController(paymentService);

  return {
    authRepository,
    otpService,
    authService,
    authController,

    paymentRepository,
    zarinpalGateway,
    zibalGateway,
    paymentGatewayFactory,
    paymentService,
    paymentController,
  };
}

export type AppContainer =
  ReturnType<typeof createContainer>;