import express from "express";

import { createAuthRouter } from "./auth/auth.routes";
import { createPaymentRouter } from "./payment/payment.routes";
import { createRegistrationRouter } from "./registration/registration.routes";

export default function createV1Router(
  container: {
    authController: any;
    paymentController: any;
    registrationController: any;
  },
) {
  const router = express.Router();

  router.use(
    "/auth",
    createAuthRouter(container.authController),
  );

  router.use(
    "/payment",
    createPaymentRouter(
      container.paymentController,
    ),
  );

  router.use(
    "/registration",
    createRegistrationRouter(
      container.registrationController,
    ),
  );

  return router;
}
