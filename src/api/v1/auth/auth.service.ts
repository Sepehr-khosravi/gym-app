import {
  createHash,
  randomBytes,
} from "node:crypto";

import type { Response } from "express";

import { AuthRepository } from "./auth.repository";

import {
  sendOtpSchema,
  verifyOtpSchema,
} from "./auth.schemas";

import { OtpService } from "../../../services/otp/otp.service";

const SESSION_TTL_SECONDS =
  30 * 24 * 60 * 60;

const SESSION_COOKIE_NAME = "session";

const CLUB_ID = process.env.CLUB_ID;

if (!CLUB_ID) {
  throw new Error("CLUB_ID is not configured");
}

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly otpService: OtpService,
  ) {}

  async sendOtp(input: unknown) {
    const { phone } =
      sendOtpSchema.parse(input);

    return this.otpService.send(phone);
  }

  async verifyOtp(
    input: unknown,
    res: Response,
  ) {
    const data =
      verifyOtpSchema.parse(input);

    await this.otpService.verify(
      data.phone,
      data.code,
    );

    let user =
      await this.authRepository.findUserByPhone(
        data.phone,
      );

    if (!user) {
      if (
        !data.firstName ||
        !data.lastName ||
        !data.nationalId ||
        !data.birthDate 
      ) {
        throw new Error(
          "Profile information is required for registration",
        );
      }

      user =
        await this.authRepository.createUser({
          clubId: CLUB_ID ? CLUB_ID : "",
          phone: data.phone,
          firstName: data.firstName,
          lastName: data.lastName,
          nationalId: data.nationalId,
          birthDate: data.birthDate,
        });
    }

    const sessionToken =
      randomBytes(32).toString("hex");

    const tokenHash =
      this.hashToken(sessionToken);

    const expiresAt = new Date(
      Date.now() +
        SESSION_TTL_SECONDS * 1000,
    );

    await this.authRepository.createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    res.cookie(
      SESSION_COOKIE_NAME,
      sessionToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
      },
    );

    return {
      user: this.serializeUser(user),
      expiresAt,
    };
  }

  async logout(
    sessionToken: string | undefined,
    res: Response,
  ) {
    if (sessionToken) {
      const tokenHash =
        this.hashToken(sessionToken);

      await this.authRepository.revokeSession(
        tokenHash,
      );
    }

    res.clearCookie(
      SESSION_COOKIE_NAME,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
      },
    );
  }

  async getCurrentUser(
    sessionToken: string | undefined,
  ) {
    if (!sessionToken) {
      throw new Error("Unauthorized");
    }

    const tokenHash =
      this.hashToken(sessionToken);

    const session =
      await this.authRepository.findValidSession(
        tokenHash,
      );

    if (!session) {
      throw new Error("Unauthorized");
    }

    return this.serializeUser(
      session.user,
    );
  }

  private serializeUser(user: any) {
    return {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,

      roles: user.roles.map(
        (userRole: any) =>
          userRole.role.name,
      ),
    };
  }

  private hashToken(token: string) {
    return createHash("sha256")
      .update(token)
      .digest("hex");
  }
}