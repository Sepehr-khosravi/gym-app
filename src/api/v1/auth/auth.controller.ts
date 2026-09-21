import type {
  Request,
  Response,
} from "express";

import { AuthService } from "./auth.service";

export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  async sendOtp(
    req: Request,
    res: Response,
  ) {
    const result =
      await this.authService.sendOtp(
        req.body,
      );

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: result,
    });
  }

  async verifyOtp(
    req: Request,
    res: Response,
  ) {
    const result =
      await this.authService.verifyOtp(
        req.body,
        res,
      );

    return res.status(200).json({
      success: true,
      message:
        "Authentication successful",
      data: result,
    });
  }

  async logout(
    req: Request,
    res: Response,
  ) {
    await this.authService.logout(
      req.cookies?.session,
      res,
    );

    return res.status(200).json({
      success: true,
      message:
        "Logged out successfully",
    });
  }

  async me(
    req: Request,
    res: Response,
  ) {
    const result =
      await this.authService.getCurrentUser(
        req.cookies?.session,
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  }
}