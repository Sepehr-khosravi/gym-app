import type {
  Request,
  Response,
} from "express";

import {
  createPaymentSchema,
  verifyPaymentSchema,
} from "./payment.schemas";

import type { PaymentService } from "./payment.service";
import type { RegistrationService } from "../registration/registration.service";

export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly registrationService: RegistrationService,
  ) {}

  async createPayment(
    req: Request,
    res: Response,
  ) {
    const input =
      createPaymentSchema.parse(req.body);

    const userId =
      (
        req as Request & {
          user: {
            id: string;
          };
        }
      ).user.id;

    const result =
      await this.paymentService.createPayment(
        userId,
        input,
      );

    return res.status(201).json({
      success: true,
      data: result,
    });
  }

  async verifyPayment(
    req: Request,
    res: Response,
  ) {
    const input =
      verifyPaymentSchema.parse(req.body);

    const result =
      await this.paymentService.verifyPayment(
        input,
      );

    if (result.success) {
      await this.registrationService.finalizePayment(
        input.paymentId,
      );
    }

    return res.status(200).json({
      success: result.success,
      data: result,
    });
  }

  async zarinpalCallback(
    req: Request,
    res: Response,
  ) {
    const paymentId =
      typeof req.query.paymentId === "string"
        ? req.query.paymentId
        : "";

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const result =
      await this.paymentService.verifyPayment({
        paymentId,
      });

    if (result.success) {
      await this.registrationService.finalizePayment(
        paymentId,
      );
    }

    return res.status(200).json({
      success: result.success,
      data: result,
    });
  }

  async zibalCallback(
    req: Request,
    res: Response,
  ) {
    const paymentId =
      typeof req.query.paymentId === "string"
        ? req.query.paymentId
        : "";

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const result =
      await this.paymentService.verifyPayment({
        paymentId,
      });

    if (result.success) {
      await this.registrationService.finalizePayment(
        paymentId,
      );
    }

    return res.status(200).json({
      success: result.success,
      data: result,
    });
  }
}
