import express from "express";

import { createAuthRouter } from "./auth/auth.routes";
import { createPaymentRouter } from "./payment/payment.routes";

export default function createV1Router(
  container: {
    authController: any;
    paymentController: any;
  },
) {
  const router = express.Router();

  router.use(
    "/auth",
    createAuthRouter(
      container.authController,
    ),
  );

  router.use(
    "/payment",
    createPaymentRouter(
      container.paymentController,
    ),
  );

  return router;
}