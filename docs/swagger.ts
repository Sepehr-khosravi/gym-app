import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

const swaggerDocument = {
  openapi: "3.0.3",

  info: {
    title: "Gym Management API",
    version: "1.0.0",
    description:
      "API documentation for the Gym Management SaaS",
  },

  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development",
    },
  ],

  tags: [
    {
      name: "Auth",
      description:
        "Authentication and session management",
    },

    {
      name: "Payment",
      description:
        "Payment and payment gateway operations",
    },
  ],

  components: {
    securitySchemes: {
      SessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "session",
        description:
          "HTTP-only session cookie created after successful OTP verification.",
      },
    },

    schemas: {
      SendOtpRequest: {
        type: "object",
        required: ["phone"],
        properties: {
          phone: {
            type: "string",
            pattern: "^09\\d{9}$",
            example: "09120000000",
            description:
              "Iranian mobile phone number",
          },
        },
      },

      VerifyOtpRequest: {
        type: "object",
        required: ["phone", "code"],
        properties: {
          phone: {
            type: "string",
            pattern: "^09\\d{9}$",
            example: "09120000000",
          },

          code: {
            type: "string",
            pattern: "^\\d{6}$",
            example: "123456",
            description:
              "6-digit OTP code",
          },

          firstName: {
            type: "string",
            minLength: 2,
            maxLength: 50,
            example: "Ali",
            description:
              "Required when registering a new user.",
          },

          lastName: {
            type: "string",
            minLength: 2,
            maxLength: 50,
            example: "Ahmadi",
            description:
              "Required when registering a new user.",
          },

          nationalId: {
            type: "string",
            pattern: "^\\d{10}$",
            example: "0012345678",
            description:
              "Required when registering a new user.",
          },

          birthDate: {
            type: "string",
            format: "date",
            example: "2008-01-01",
            description:
              "Required when registering a new user.",
          },
        },
      },

      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },

          phone: {
            type: "string",
            example: "09120000000",
          },

          firstName: {
            type: "string",
            example: "Ali",
          },

          lastName: {
            type: "string",
            example: "Ahmadi",
          },

          status: {
            type: "string",
            example: "ACTIVE",
          },

          roles: {
            type: "array",
            items: {
              type: "string",
              example: "MEMBER",
            },
          },
        },
      },

      ErrorResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },

          message: {
            type: "string",
            example: "Unauthorized",
          },
        },
      },

      PaymentGateway: {
        type: "string",
        enum: ["ZARINPAL", "ZIBAL"],
        example: "ZARINPAL",
      },

      CreatePaymentRequest: {
        type: "object",
        required: ["orderId", "gateway"],
        properties: {
          orderId: {
            type: "string",
            example: "cmabc123xyz",
            description:
              "ID of the order to be paid.",
          },

          gateway: {
            $ref: "#/components/schemas/PaymentGateway",
          },
        },
      },

      CreatePaymentResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },

          data: {
            type: "object",
            properties: {
              paymentId: {
                type: "string",
                example: "cmdef456xyz",
              },

              paymentUrl: {
                type: "string",
                format: "uri",
                example:
                  "https://gateway.zarinpal.com/pg/StartPay/A000000000000000000000000000000000",
              },

              authority: {
                type: "string",
                example:
                  "A000000000000000000000000000000000",
                description:
                  "Gateway payment authority. For Zibal this contains the trackId.",
              },
            },
          },
        },
      },

      VerifyPaymentRequest: {
        type: "object",
        required: ["paymentId"],
        properties: {
          paymentId: {
            type: "string",
            example: "cmdef456xyz",
            description:
              "ID of the payment to verify.",
          },
        },
      },

      VerifyPaymentResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },

          data: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                example: true,
              },

              transactionId: {
                type: "string",
                example: "987654321",
                nullable: true,
              },
            },
          },
        },
      },
    },
  },

  paths: {
    "/api/v1/auth/send-otp": {
      post: {
        tags: ["Auth"],
        summary: "Send OTP",
        description:
          "Sends a one-time password to the specified phone number.",

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref:
                  "#/components/schemas/SendOtpRequest",
              },
            },
          },
        },

        responses: {
          "200": {
            description:
              "OTP sent successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message:
                    "OTP sent successfully",
                  data: {
                    expiresIn: 300,
                  },
                },
              },
            },
          },

          "500": {
            description:
              "Internal server error / validation error / OTP cooldown",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },

    "/api/v1/auth/verify-otp": {
      post: {
        tags: ["Auth"],
        summary: "Verify OTP",
        description:
          "Verifies an OTP. If the phone number does not belong to an existing user, profile information is required and a new user is registered.",

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref:
                  "#/components/schemas/VerifyOtpRequest",
              },

              examples: {
                login: {
                  summary:
                    "Existing user login",
                  value: {
                    phone: "09120000000",
                    code: "123456",
                  },
                },

                register: {
                  summary:
                    "New user registration",
                  value: {
                    phone: "09120000000",
                    code: "123456",
                    firstName: "Ali",
                    lastName: "Ahmadi",
                    nationalId: "0012345678",
                    birthDate: "2008-01-01",
                  },
                },
              },
            },
          },
        },

        responses: {
          "200": {
            description:
              "Authentication successful. A session cookie is created.",

            headers: {
              "Set-Cookie": {
                description:
                  "HTTP-only session cookie.",
                schema: {
                  type: "string",
                },
              },
            },

            content: {
              "application/json": {
                example: {
                  success: true,
                  message:
                    "Authentication successful",
                  data: {
                    user: {
                      id: "f414bcc2-db58-454f-a579-d86d308112b5",
                      phone: "09120000000",
                      firstName: "Ali",
                      lastName: "Ahmadi",
                      status: "ACTIVE",
                      roles: ["MEMBER"],
                    },
                    expiresAt:
                      "2026-10-22T10:00:00.000Z",
                  },
                },
              },
            },
          },

          "400": {
            description:
              "Invalid OTP or missing registration profile",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },

                examples: {
                  invalidOtp: {
                    value: {
                      success: false,
                      message:
                        "Invalid OTP",
                    },
                  },

                  missingProfile: {
                    value: {
                      success: false,
                      message:
                        "Profile information is required for registration",
                    },
                  },
                },
              },
            },
          },

          "500": {
            description:
              "Internal server error / schema validation error",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },

    "/api/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user",
        description:
          "Returns the currently authenticated user using the session cookie.",

        security: [
          {
            SessionCookie: [],
          },
        ],

        responses: {
          "200": {
            description:
              "Authenticated user",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    id: "f414bcc2-db58-454f-a579-d86d308112b5",
                    phone: "09120000000",
                    firstName: "Ali",
                    lastName: "Ahmadi",
                    status: "ACTIVE",
                    roles: ["MEMBER"],
                  },
                },
              },
            },
          },

          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                example: {
                  success: false,
                  message:
                    "Unauthorized",
                },
              },
            },
          },
        },
      },
    },

    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        description:
          "Revokes the current session and clears the session cookie.",

        security: [
          {
            SessionCookie: [],
          },
        ],

        responses: {
          "200": {
            description:
              "Logged out successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message:
                    "Logged out successfully",
                },
              },
            },
          },
        },
      },
    },

    "/api/v1/payment": {
      post: {
        tags: ["Payment"],
        summary: "Create payment",
        description:
          "Creates a pending payment for an existing order and returns the payment gateway URL. The payment amount is taken from the order stored in the database and cannot be provided by the client.",

        security: [
          {
            SessionCookie: [],
          },
        ],

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref:
                  "#/components/schemas/CreatePaymentRequest",
              },

              examples: {
                zarinpal: {
                  summary:
                    "Create ZarinPal payment",
                  value: {
                    orderId:
                      "cmabc123xyz",
                    gateway: "ZARINPAL",
                  },
                },

                zibal: {
                  summary:
                    "Create Zibal payment",
                  value: {
                    orderId:
                      "cmabc123xyz",
                    gateway: "ZIBAL",
                  },
                },
              },
            },
          },
        },

        responses: {
          "201": {
            description:
              "Payment created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/CreatePaymentResponse",
                },
              },
            },
          },

          "400": {
            description:
              "Invalid request",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },

          "401": {
            description:
              "Authentication required",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },

          "403": {
            description:
              "User does not have permission",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },

          "404": {
            description:
              "Order not found",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },

          "409": {
            description:
              "Order is not payable or a pending payment already exists",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },

          "500": {
            description:
              "Payment gateway or internal server error",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/payment/callback/zarinpal": {
      get: {
        tags: ["Payment"],
        summary: "Handle ZarinPal payment callback",
        description:
          "Receives the user's return from ZarinPal and triggers server-side payment verification. This endpoint does not require the application session cookie because the payment gateway redirects the user to it.",
    
        parameters: [
          {
            name: "paymentId",
            in: "query",
            required: true,
            schema: {
              type: "string",
            },
            example: "cmdef456xyz",
            description:
              "Internal payment ID created by the application.",
          },
        ],
    
        responses: {
          "200": {
            description:
              "Payment verification result",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/VerifyPaymentResponse",
                },
              },
            },
          },
    
          "400": {
            description:
              "Payment ID is missing or invalid",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
    
          "404": {
            description:
              "Payment not found",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
    
          "500": {
            description:
              "Payment gateway verification or internal server error",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    
    "/api/v1/payment/callback/zibal": {
      get: {
        tags: ["Payment"],
        summary: "Handle Zibal payment callback",
        description:
          "Receives the user's return from Zibal and triggers server-side payment verification. This endpoint does not require the application session cookie because the payment gateway redirects the user to it.",
    
        parameters: [
          {
            name: "paymentId",
            in: "query",
            required: true,
            schema: {
              type: "string",
            },
            example: "cmdef456xyz",
            description:
              "Internal payment ID created by the application.",
          },
        ],
    
        responses: {
          "200": {
            description:
              "Payment verification result",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/VerifyPaymentResponse",
                },
              },
            },
          },
    
          "400": {
            description:
              "Payment ID is missing or invalid",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
    
          "404": {
            description:
              "Payment not found",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
    
          "500": {
            description:
              "Payment gateway verification or internal server error",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },


    "/api/v1/payment/verify": {
      post: {
        tags: ["Payment"],
        summary: "Verify payment",
        description:
          "Verifies a pending payment directly with the selected payment gateway. Payment success is determined by server-side gateway verification.",

        security: [
          {
            SessionCookie: [],
          },
        ],

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref:
                  "#/components/schemas/VerifyPaymentRequest",
              },

              example: {
                paymentId:
                  "cmdef456xyz",
              },
            },
          },
        },

        responses: {
          "200": {
            description:
              "Payment verification result",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/VerifyPaymentResponse",
                },

                examples: {
                  success: {
                    summary:
                      "Payment verified successfully",
                    value: {
                      success: true,
                      data: {
                        success: true,
                        transactionId:
                          "987654321",
                      },
                    },
                  },

                  failed: {
                    summary:
                      "Payment verification failed",
                    value: {
                      success: false,
                      data: {
                        success: false,
                      },
                    },
                  },
                },
              },
            },
          },

          "400": {
            description:
              "Invalid request",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },

          "401": {
            description:
              "Authentication required",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },

          "403": {
            description:
              "User does not have permission",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },

          "404": {
            description:
              "Payment not found",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },

          "409": {
            description:
              "Payment is not verifiable",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },

          "500": {
            description:
              "Payment gateway verification error",
            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
  },
  
};

export function setupSwagger(app: Express) {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument),
  );
}
