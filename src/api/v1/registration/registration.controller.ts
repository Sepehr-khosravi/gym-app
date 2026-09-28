import type { Request, Response } from "express";

import {
  startRegistrationSchema,
  completeProfileSchema,
  createRegistrationPaymentSchema,
  registrationTokenSchema,
} from "./registration.schemas";

import type { RegistrationService } from "./registration.service";

export class RegistrationController {
  constructor(
    private readonly registrationService: RegistrationService,
  ) {}

  async start(
    req: Request,
    res: Response,
  ) {
    const input = startRegistrationSchema.parse(
      req.body,
    );

    const result =
      await this.registrationService.startRegistration({
        phone: input.phone,
        clubId: this.getClubId(req),
      });

    return res.status(201).json({
      success: true,
      data: result,
    });
  }

  async get(
    req: Request,
    res: Response,
  ) {
    const input = registrationTokenSchema.parse(
      req.body,
    );

    const result =
      await this.registrationService.getRegistration(
        input.registrationToken,
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  }

  async completeProfile(
    req: Request,
    res: Response,
  ) {
    const input = completeProfileSchema.parse(
      req.body,
    );

    const result =
      await this.registrationService.completeProfile(
        input.registrationToken,
        {
          firstName: input.firstName,
          lastName: input.lastName,
          nationalId: input.nationalId,
          birthDate: input.birthDate,
        },
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  }

  async createPayment(
    req: Request,
    res: Response,
  ) {
    const input =
      createRegistrationPaymentSchema.parse(
        req.body,
      );

    const result =
      await this.registrationService.createPayment(
        input.registrationToken,
        {
          planId: input.planId,
          gateway: input.gateway,
        },
      );

    return res.status(201).json({
      success: true,
      data: result,
    });
  }

  private getClubId(req: Request) {
    const clubId = req.app.locals.clubId as
      | string
      | undefined;

    if (!clubId) {
      throw new Error("Club ID is not configured");
    }

    return clubId;
  }
}
