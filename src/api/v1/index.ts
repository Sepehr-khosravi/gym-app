import express from "express";

import { createAuthRouter } from "./auth/auth.routes";

export default function createV1Router(
  container: {
    authController: any;
  },
) {
  const router =
    express.Router();

  router.use(
    "/auth",
    createAuthRouter(
      container.authController,
    ),
  );

  return router;
}