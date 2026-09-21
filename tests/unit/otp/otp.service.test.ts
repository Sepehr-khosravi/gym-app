import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { OtpService } from "../../../src/services/otp/otp.service";
import type { OtpProvider } from "../../../src/services/otp/otp.provider";

import { redis } from "../../../src/config/redis";

class MockOtpProvider
  implements OtpProvider
{
  send = vi.fn<
    (phone: string, code: string) => Promise<void>
  >(async () => {});
}

describe("OtpService", () => {
  let provider: MockOtpProvider;
  let service: OtpService;

  beforeEach(async () => {
    provider = new MockOtpProvider();

    service = new OtpService(provider);

    await redis.flushdb();
  });

  it("generates and sends an OTP", async () => {
    const result =
      await service.send("09120000000");

    expect(result.expiresIn).toBe(300);

    expect(provider.send).toHaveBeenCalledTimes(1);

    expect(
      provider.send.mock.calls[0][0],
    ).toBe("09120000000");

    expect(
      provider.send.mock.calls[0][1],
    ).toMatch(/^\d{6}$/);
  });

  it("stores the OTP hashed", async () => {
    await service.send("09120000000");

    const stored = await redis.get(
      "otp:login:09120000000",
    );

    expect(stored).not.toBeNull();

    expect(stored).toMatch(/^[a-f0-9]{64}$/);
  });

  it("sets OTP expiration", async () => {
    await service.send("09120000000");

    const ttl = await redis.ttl(
      "otp:login:09120000000",
    );

    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300);
  });

  it("sets resend cooldown", async () => {
    await service.send("09120000000");

    const ttl = await redis.ttl(
      "otp:cooldown:09120000000",
    );

    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it("rejects sending another OTP during cooldown", async () => {
    await service.send("09120000000");

    await expect(
      service.send("09120000000"),
    ).rejects.toThrow(
      "Please wait before requesting another OTP",
    );
  });

  it("accepts the correct OTP", async () => {
    await service.send("09120000000");

    const code =
      provider.send.mock.calls[0][1];

    await expect(
      service.verify(
        "09120000000",
        code,
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects an incorrect OTP", async () => {
    await service.send("09120000000");

    await expect(
      service.verify(
        "09120000000",
        "000000",
      ),
    ).rejects.toThrow("Invalid OTP");
  });

  it("makes OTP single-use", async () => {
    await service.send("09120000000");

    const code =
      provider.send.mock.calls[0][1];

    await service.verify(
      "09120000000",
      code,
    );

    await expect(
      service.verify(
        "09120000000",
        code,
      ),
    ).rejects.toThrow(
      "OTP has expired or does not exist",
    );
  });

  it("invalidates OTP after too many failed attempts", async () => {
    await service.send("09120000000");

    for (let i = 0; i < 5; i++) {
      await expect(
        service.verify(
          "09120000000",
          "000000",
        ),
      ).rejects.toThrow("Invalid OTP");
    }

    await expect(
      service.verify(
        "09120000000",
        "000000",
      ),
    ).rejects.toThrow(
      "Too many invalid OTP attempts",
    );

    const otp = await redis.get(
      "otp:login:09120000000",
    );

    expect(otp).toBeNull();
  });

  it("invalidates OTP and attempts manually", async () => {
    await service.send("09120000000");

    await service.invalidate(
      "09120000000",
    );

    expect(
      await redis.get(
        "otp:login:09120000000",
      ),
    ).toBeNull();

    expect(
      await redis.get(
        "otp:attempts:09120000000",
      ),
    ).toBeNull();
  });
});