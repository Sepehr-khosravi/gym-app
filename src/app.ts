import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import { PrismaClient } from "@prisma/client";

import router from "./api/v1";

import type { OtpProvider } from "./services/otp/otp.provider";
import { ConsoleOtpProvider } from "./services/otp/providers/console-otp.provider";

import { prisma } from "./config/database";
import { createContainer } from "./container";

export function createApp(
  prisma: PrismaClient,
  otpProvider: OtpProvider,
) {
  const app = express();

  app.use(express.json());

  app.use(
    helmet({
      xssFilter: true,
    }),
  );

  app.use(
    cors({
      methods: [
        "GET",
        "POST",
        "DELETE",
        "PUT",
        "PATCH",
      ],
      origin: "*",
    }),
  );

  app.use(cookieParser());

  const container = createContainer(
    prisma,
    otpProvider,
  );

  app.use(
    "/api/v1",
    router(container),
  );

  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      console.error(err);
  
      const message =
        err instanceof Error
          ? err.message
          : "Internal server error";
  
      let status = 500;
  
      if (
        message === "Unauthorized"
      ) {
        status = 401;
      } else if (
        message === "Invalid OTP" ||
        message === "OTP has expired or does not exist" ||
        message === "Too many invalid OTP attempts" ||
        message ===
          "Profile information is required for registration"
      ) {
        status = 400;
      }
  
      return res.status(status).json({
        success: false,
        message,
      });
    },
  );


  return app;
}

const app = createApp(
  prisma,
  new ConsoleOtpProvider(),
);

export default app;