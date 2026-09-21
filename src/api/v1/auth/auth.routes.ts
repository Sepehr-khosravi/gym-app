import express from "express";

import type { AuthController } from "./auth.controller";

export function createAuthRouter(
  controller: AuthController,
) {
  const router =
    express.Router();

  router.post(
    "/send-otp",
    (req, res, next) =>
      controller
        .sendOtp(req, res)
        .catch(next),
  );

  router.post(
    "/verify-otp",
    (req, res, next) =>
      controller
        .verifyOtp(req, res)
        .catch(next),
  );

  router.post(
    "/logout",
    (req, res, next) =>
      controller
        .logout(req, res)
        .catch(next),
  );

  router.get(
    "/me",
    (req, res, next) =>
      controller
        .me(req, res)
        .catch(next),
  );

  return router;
}