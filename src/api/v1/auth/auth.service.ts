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

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Check whether a user exists and is verified.
   *
   * Authentication is only available for
   * verified users.
   */
  async checkUserVerificationStatus(
    phone: string,
  ) {
    const user =
      await this.authRepository.findUserByPhone(
        phone,
      );

    if (!user) {
      return false;
    }

    return user.isVerified;
  }

  /**
   * Send OTP to an existing verified user.
   *
   * New users must complete registration
   * and payment before they can authenticate.
   */
  async sendOtp(input: unknown) {
    const { phone } =
      sendOtpSchema.parse(input);

    const isVerified =
      await this.checkUserVerificationStatus(
        phone,
      );

    if (!isVerified) {
      throw new Error(
        "User is not verified",
      );
    }

    return this.otpService.send(phone);
  }

  /**
   * Verify OTP and create a session.
   *
   * This method does NOT create users.
   * Users must already exist and be verified.
   */
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

    const user =
      await this.authRepository.findUserByPhone(
        data.phone,
      );

    if (!user) {
      throw new Error(
        "User not found",
      );
    }

    if (!user.isVerified) {
      throw new Error(
        "User is not verified",
      );
    }

    if (user.status !== "ACTIVE") {
      throw new Error(
        "User is not active",
      );
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

  /**
   * Revoke the current session.
   */
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

  /**
   * Return the currently authenticated user.
   */
  async getCurrentUser(
    sessionToken: string | undefined,
  ) {
    if (!sessionToken) {
      throw new Error(
        "Unauthorized",
      );
    }

    const tokenHash =
      this.hashToken(sessionToken);

    const session =
      await this.authRepository.findValidSession(
        tokenHash,
      );

    if (!session) {
      throw new Error(
        "Unauthorized",
      );
    }

    return this.serializeUser(
      session.user,
    );
  }

  private serializeUser(
    user: any,
  ) {
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

  private hashToken(
    token: string,
  ) {
    return createHash("sha256")
      .update(token)
      .digest("hex");
  }
}