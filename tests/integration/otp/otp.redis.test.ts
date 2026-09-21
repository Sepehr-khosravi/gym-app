import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { OtpService } from "../../../src/services/otp/otp.service";
import { testRedis } from "../../setup/redis";
import { TestOtpProvider } from "../../mocks/test-otp.provider";

describe("OTP Redis integration", () => {
  let provider: TestOtpProvider;
  let service: OtpService;

  beforeAll(async () => {
    await testRedis.ping();
  });

  beforeEach(async () => {
    await testRedis.flushdb();

    provider =
      new TestOtpProvider();

    service =
      new OtpService(provider);
  });

  afterAll(async () => {
    await testRedis.quit();
  });

  it("stores OTP in Redis", async () => {
    await service.send(
      "09120000000",
    );

    const exists =
      await testRedis.exists(
        "otp:login:09120000000",
      );

    expect(exists).toBe(1);
  });

  it("stores a hash instead of the raw OTP", async () => {
    await service.send(
      "09120000000",
    );

    const stored =
      await testRedis.get(
        "otp:login:09120000000",
      );

    const rawCode =
      provider.getCode(
        "09120000000",
      );

    expect(stored).not.toBe(rawCode);
  });

  it("applies TTL", async () => {
    await service.send(
      "09120000000",
    );

    const ttl =
      await testRedis.ttl(
        "otp:login:09120000000",
      );

    expect(ttl).toBeGreaterThan(0);
  });

  it("allows successful verification", async () => {
    await service.send(
      "09120000000",
    );

    const code =
      provider.getCode(
        "09120000000",
      );

    await service.verify(
      "09120000000",
      code!,
    );

    const exists =
      await testRedis.exists(
        "otp:login:09120000000",
      );

    expect(exists).toBe(0);
  });
});