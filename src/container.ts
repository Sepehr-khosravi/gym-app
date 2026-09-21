import { PrismaClient } from "@prisma/client";

import { AuthRepository } from "./api/v1/auth/auth.repository";
import { AuthService } from "./api/v1/auth/auth.service";
import { AuthController } from "./api/v1/auth/auth.controller";

import { OtpService } from "./services/otp/otp.service";
import type { OtpProvider } from "./services/otp/otp.provider";

export function createContainer(
  prisma: PrismaClient,
  otpProvider: OtpProvider,
) {
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

  return {
    authRepository,
    otpService,
    authService,
    authController,
  };
}

export type AppContainer =
  ReturnType<typeof createContainer>;