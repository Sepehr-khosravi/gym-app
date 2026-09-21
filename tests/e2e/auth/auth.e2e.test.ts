import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import request from "supertest";

import { createApp } from "../../../src/app";
import { testPrisma } from "../../setup/prisma";
import { TestOtpProvider } from "../../mocks/test-otp.provider";
import { clearRedis } from "../../setup/redis";

describe("Auth E2E", () => {
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

  it("sends OTP", async () => {
    const response =
      await request(app)
        .post(
          "/api/v1/auth/send-otp",
        )
        .send({
          phone: "09120000000",
        });

    expect(response.status).toBe(
      200,
    );

    expect(
      response.body.success,
    ).toBe(true);

    expect(
      otpProvider.getCode(
        "09120000000",
      ),
    ).toMatch(/^\d{6}$/);
  });

  it("registers a new user and creates a session", async () => {
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

    expect(response.status).toBe(
      200,
    );

    expect(
      response.body.success,
    ).toBe(true);

    expect(
      response.headers["set-cookie"],
    ).toBeDefined();

    const user =
      await testPrisma.user.findUnique({
        where: {
          phone: "09120000000",
        },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

    expect(user).not.toBeNull();

    expect(
      user?.roles[0].role.name,
    ).toBe("MEMBER");

    const sessions =
      await testPrisma.session.count({
        where: {
          userId: user!.id,
        },
      });

    expect(sessions).toBe(1);
  });

  it("logs in an existing user", async () => {
    await request(app)
      .post(
        "/api/v1/auth/send-otp",
      )
      .send({
        phone: "09120000000",
      });

    const firstCode =
      otpProvider.getCode(
        "09120000000",
      );

    const firstResponse =
      await request(app)
        .post(
          "/api/v1/auth/verify-otp",
        )
        .send({
          phone: "09120000000",
          code: firstCode,
          firstName: "Ali",
          lastName: "Test",
          nationalId: "0012345678",
          birthDate:
            "2008-01-01",
        });

    expect(
      firstResponse.status,
    ).toBe(200);

    await request(app)
      .post(
        "/api/v1/auth/send-otp",
      )
      .send({
        phone: "09120000000",
      });

    const secondCode =
      otpProvider.getCode(
        "09120000000",
      );

    const secondResponse =
      await request(app)
        .post(
          "/api/v1/auth/verify-otp",
        )
        .send({
          phone: "09120000000",
          code: secondCode,
        });

    expect(
      secondResponse.status,
    ).toBe(200);

    const userCount =
      await testPrisma.user.count({
        where: {
          phone: "09120000000",
        },
      });

    expect(userCount).toBe(1);
  });

  it("returns current user from session", async () => {
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

    const agent =
      request.agent(app);

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

    const response =
      await agent.get(
        "/api/v1/auth/me",
      );

    expect(response.status).toBe(
      200,
    );

    expect(
      response.body.data.phone,
    ).toBe("09120000000");

    expect(
      response.body.data.roles,
    ).toContain("MEMBER");
  });

  it("rejects invalid OTP", async () => {
    await request(app)
      .post(
        "/api/v1/auth/send-otp",
      )
      .send({
        phone: "09120000000",
      });

    const response =
      await request(app)
        .post(
          "/api/v1/auth/verify-otp",
        )
        .send({
          phone: "09120000000",
          code: "000000",
        });

    expect(response.status).toBe(
      400,
    );
  });

  it("logs out the user", async () => {
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

    const beforeLogout =
      await agent.get(
        "/api/v1/auth/me",
      );

    expect(
      beforeLogout.status,
    ).toBe(200);

    const logout =
      await agent.post(
        "/api/v1/auth/logout",
      );

    expect(logout.status).toBe(
      200,
    );

    const afterLogout =
      await agent.get(
        "/api/v1/auth/me",
      );

    expect(
      afterLogout.status,
    ).toBe(401);
  });

  it("requires profile information for registration", async () => {
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
        });

    expect(response.status).toBe(
      400,
    );

    const user =
      await testPrisma.user.findUnique({
        where: {
          phone: "09120000000",
        },
      });

    expect(user).toBeNull();
  });
});