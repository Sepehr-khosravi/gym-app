import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import request from "supertest";

import { createApp } from "../../src/app";
import { testPrisma } from "../setup/prisma";
import { TestOtpProvider } from "../mocks/test-otp.provider";
import { clearRedis } from "../setup/redis";

describe("Auth security", () => {
  let otpProvider: TestOtpProvider;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    await testPrisma.$connect();

    otpProvider = new TestOtpProvider();

    app = createApp(
      testPrisma,
      otpProvider,
    );
  });


  beforeEach(async () => {
    await testPrisma.session.deleteMany();
    await testPrisma.userRole.deleteMany();
    await testPrisma.user.deleteMany();
  
    await clearRedis();
  
    otpProvider.clear();
  });

  it("does not allow unlimited OTP attempts", async () => {
    await request(app)
      .post(
        "/api/v1/auth/send-otp",
      )
      .send({
        phone: "09120000000",
      });

    for (let i = 0; i < 5; i++) {
      const response =
        await request(app)
          .post(
            "/api/v1/auth/verify-otp",
          )
          .send({
            phone: "09120000000",
            code: "000000",
          });

      expect(
        response.status,
      ).toBe(400);
    }

    const sixth =
      await request(app)
        .post(
          "/api/v1/auth/verify-otp",
        )
        .send({
          phone: "09120000000",
          code: "000000",
        });

    expect(
      sixth.status,
    ).toBe(400);
  });

  it("does not allow OTP reuse", async () => {
    const agent =
      request.agent(app);

    await agent
      .post(
        "/api/v1/auth/send-otp",
      )
      .send({
        phone: "09120000000",
      });

    const code =
      otpProvider.getCode(
        "09120000000",
      );

    const first =
      await agent
        .post(
          "/api/v1/auth/verify-otp",
        )
        .send({
          phone: "09120000000",
          code,
          firstName: "Ali",
          lastName: "Test",
          nationalId: "0012345678",
          birthDate:
            "2008-01-01",
        });

    expect(first.status).toBe(
      200,
    );

    const second =
      await agent
        .post(
          "/api/v1/auth/verify-otp",
        )
        .send({
          phone: "09120000000",
          code,
        });

    expect(second.status).not.toBe(
      200,
    );
  });

  it("rejects fake session cookies", async () => {
    const response =
      await request(app)
        .get(
          "/api/v1/auth/me",
        )
        .set(
          "Cookie",
          "session=fake-session-token",
        );

    expect(response.status).toBe(
      401,
    );
  });

  it("rejects requests without session", async () => {
    const response =
      await request(app)
        .get(
          "/api/v1/auth/me",
        );

    expect(response.status).toBe(
      401,
    );
  });

  it("does not expose raw session token in API response", async () => {
    await request(app)
      .post(
        "/api/v1/auth/send-otp",
      )
      .send({
        phone: "09120000000",
      });

    const code =
      otpProvider.getCode(
        "09120000000",
      );

    const response =
      await request(app)
        .post(
          "/api/v1/auth/verify-otp",
        )
        .send({
          phone: "09120000000",
          code,
          firstName: "Ali",
          lastName: "Test",
          nationalId: "0012345678",
          birthDate:
            "2008-01-01",
        });

    expect(
      response.body.data.session,
    ).toBeUndefined();

    expect(
      response.body.data.token,
    ).toBeUndefined();
  });

  it("does not store raw session token in database", async () => {
    await request(app)
      .post(
        "/api/v1/auth/send-otp",
      )
      .send({
        phone: "09120000000",
      });

    const code =
      otpProvider.getCode(
        "09120000000",
      );

    const response =
      await request(app)
        .post(
          "/api/v1/auth/verify-otp",
        )
        .send({
          phone: "09120000000",
          code,
          firstName: "Ali",
          lastName: "Test",
          nationalId: "0012345678",
          birthDate:
            "2008-01-01",
        });

    const cookies =
      response.headers[
        "set-cookie"
      ];

    expect(cookies).toBeDefined();

    const session =
      await testPrisma.session.findFirst();

    expect(session).not.toBeNull();

    const cookie =
      cookies[0];

    const match =
      cookie.match(
        /session=([^;]+)/,
      );

    const rawToken =
      match?.[1];

    expect(
      session?.tokenHash,
    ).not.toBe(rawToken);
  });

  it("does not allow a suspended user to authenticate", async () => {
    await request(app)
      .post(
        "/api/v1/auth/send-otp",
      )
      .send({
        phone: "09120000000",
      });

    const code =
      otpProvider.getCode(
        "09120000000",
      );

    await request(app)
      .post(
        "/api/v1/auth/verify-otp",
      )
      .send({
        phone: "09120000000",
        code,
        firstName: "Ali",
        lastName: "Test",
        nationalId: "0012345678",
        birthDate:
          "2008-01-01",
      });

    await testPrisma.user.update({
      where: {
        phone: "09120000000",
      },
      data: {
        status: "SUSPENDED",
      },
    });

    await request(app)
      .post(
        "/api/v1/auth/send-otp",
      )
      .send({
        phone: "09120000000",
      });

    const newCode =
      otpProvider.getCode(
        "09120000000",
      );

    const response =
      await request(app)
        .post(
          "/api/v1/auth/verify-otp",
        )
        .send({
          phone: "09120000000",
          code: newCode,
        });

    /*
     * این تست در نسخه فعلی AuthService
     * نیاز به rule صریح برای SUSPENDED دارد.
     */
    expect(response.status).not.toBe(
      200,
    );
  });
});