import { createHash, randomInt } from "node:crypto";

import { redis } from "../../config/redis";
import type { OtpProvider } from "./otp.provider";

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 5 * 60;

const SEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;

const OTP_KEY_PREFIX = "otp:login:";
const COOLDOWN_KEY_PREFIX = "otp:cooldown:";
const ATTEMPTS_KEY_PREFIX = "otp:attempts:";

export class OtpService {
  constructor(
    private readonly provider: OtpProvider,
  ) {}

  async send(phone: string): Promise<{
    expiresIn: number;
  }> {
    const cooldownKey = this.getCooldownKey(phone);

    const isOnCooldown = await redis.exists(cooldownKey);

    if (isOnCooldown) {
      throw new Error(
        "Please wait before requesting another OTP",
      );
    }

    const code = this.generateCode();
    const codeHash = this.hashCode(code);

    const otpKey = this.getOtpKey(phone);
    const attemptsKey = this.getAttemptsKey(phone);

    /*
     * Store only the hash.
     */
    await redis.set(
      otpKey,
      codeHash,
      "EX",
      OTP_TTL_SECONDS,
    );

    /*
     * Rate-limit sending.
     */
    await redis.set(
      cooldownKey,
      "1",
      "EX",
      SEND_COOLDOWN_SECONDS,
    );

    /*
     * New OTP = reset verification attempts.
     */
    await redis.del(attemptsKey);

    /*
     * The service doesn't know how the OTP is delivered.
     */
    await this.provider.send(phone, code);

    return {
      expiresIn: OTP_TTL_SECONDS,
    };
  }

  async verify(
    phone: string,
    code: string,
  ): Promise<void> {
    const otpKey = this.getOtpKey(phone);
    const attemptsKey = this.getAttemptsKey(phone);

    const storedHash = await redis.get(otpKey);

    if (!storedHash) {
      throw new Error(
        "OTP has expired or does not exist",
      );
    }

    const attempts = await redis.incr(attemptsKey);

    if (attempts === 1) {
      await redis.expire(
        attemptsKey,
        OTP_TTL_SECONDS,
      );
    }

    if (attempts > MAX_VERIFY_ATTEMPTS) {
      await this.invalidate(phone);

      throw new Error(
        "Too many invalid OTP attempts",
      );
    }

    const providedHash = this.hashCode(code);

    if (providedHash !== storedHash) {
      throw new Error("Invalid OTP");
    }

    /*
     * OTP is single-use.
     */
    await this.invalidate(phone);
  }

  async invalidate(phone: string): Promise<void> {
    await Promise.all([
      redis.del(this.getOtpKey(phone)),
      redis.del(this.getAttemptsKey(phone)),
    ]);
  }

  private generateCode(): string {
    return randomInt(0, 1_000_000)
      .toString()
      .padStart(OTP_LENGTH, "0");
  }

  private hashCode(code: string): string {
    return createHash("sha256")
      .update(code)
      .digest("hex");
  }

  private getOtpKey(phone: string): string {
    return `${OTP_KEY_PREFIX}${phone}`;
  }

  private getCooldownKey(phone: string): string {
    return `${COOLDOWN_KEY_PREFIX}${phone}`;
  }

  private getAttemptsKey(phone: string): string {
    return `${ATTEMPTS_KEY_PREFIX}${phone}`;
  }
}