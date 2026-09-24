import express, {
  NextFunction,
  Request,
  Response,
} from "express";

import type { PaymentController } from "./payment.controller";

import {
  authenticate,
  requireRole,
} from "../../../common/middleware/auth.middleware";

export function createPaymentRouter(
  controller: PaymentController,
) {
  const router = express.Router();

  router.post(
    "/",
    [authenticate, requireRole()],
    (
      req: Request,
      res: Response,
      next: NextFunction,
    ) =>
      controller
        .createPayment(req, res)
        .catch(next),
  );

  router.post(
    "/verify",
    [authenticate, requireRole()],
    (
      req: Request,
      res: Response,
      next: NextFunction,
    ) =>
      controller
        .verifyPayment(req, res)
        .catch(next),
  );

  // Public gateway callbacks
  router.get(
    "/callback/zarinpal",
    (
      req: Request,
      res: Response,
      next: NextFunction,
    ) =>
      controller
        .zarinpalCallback(req, res)
        .catch(next),
  );

  router.get(
    "/callback/zibal",
    (
      req: Request,
      res: Response,
      next: NextFunction,
    ) =>
      controller
        .zibalCallback(req, res)
        .catch(next),
  );

  return router;
}