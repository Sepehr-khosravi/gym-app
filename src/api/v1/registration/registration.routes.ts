import express, {
  NextFunction,
  Request,
  Response,
} from "express";

import type { RegistrationController } from "./registration.controller";

export function createRegistrationRouter(
  controller: RegistrationController,
) {
  const router = express.Router();

  router.post(
    "/start",
    (
      req: Request,
      res: Response,
      next: NextFunction,
    ) =>
      controller
        .start(req, res)
        .catch(next),
  );

  router.post(
    "/get",
    (
      req: Request,
      res: Response,
      next: NextFunction,
    ) =>
      controller
        .get(req, res)
        .catch(next),
  );

  router.post(
    "/profile",
    (
      req: Request,
      res: Response,
      next: NextFunction,
    ) =>
      controller
        .completeProfile(req, res)
        .catch(next),
  );

  router.post(
    "/payment",
    (
      req: Request,
      res: Response,
      next: NextFunction,
    ) =>
      controller
        .createPayment(req, res)
        .catch(next),
  );

  return router;
}
