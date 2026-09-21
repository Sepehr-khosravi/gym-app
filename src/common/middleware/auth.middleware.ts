import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AuthRepository } from "../../api/v1/auth/auth.repository";

import {
  createHash,
} from "node:crypto";

const SESSION_COOKIE_NAME = "session";

const authRepository =
  new AuthRepository();

export interface AuthenticatedRequest
  extends Request {
  user?: {
    id: string;
    phone: string;
    firstName: string;
    lastName: string;
    status: string;
    roles: string[];
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token =
      req.cookies?.[
        SESSION_COOKIE_NAME
      ];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const tokenHash =
      createHash("sha256")
        .update(token)
        .digest("hex");

    const session =
      await authRepository.findValidSession(
        tokenHash,
      );

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    req.user = {
      id: session.user.id,
      phone: session.user.phone,
      firstName:
        session.user.firstName,
      lastName:
        session.user.lastName,
      status: session.user.status,

      roles: session.user.roles.map(
        (userRole) =>
          userRole.role.name,
      ),
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(
  ...allowedRoles: string[]
) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const hasRole =
      req.user.roles.some((role) =>
        allowedRoles.includes(role),
      );

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
}