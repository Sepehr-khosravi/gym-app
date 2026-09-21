import {
  describe,
  expect,
  it,
} from "vitest";

import {
  sendOtpSchema,
  verifyOtpSchema,
} from "../../../src/api/v1/auth/auth.schemas";

describe("Auth schemas", () => {
  it("accepts valid Iranian phone", () => {
    const result =
      sendOtpSchema.safeParse({
        phone: "09120000000",
      });

    expect(result.success).toBe(
      true,
    );
  });

  it("rejects invalid phone", () => {
    const result =
      sendOtpSchema.safeParse({
        phone: "123456",
      });

    expect(result.success).toBe(
      false,
    );
  });

  it("accepts valid OTP", () => {
    const result =
      verifyOtpSchema.safeParse({
        phone: "09120000000",
        code: "123456",
      });

    expect(result.success).toBe(
      true,
    );
  });

  it("rejects OTP with letters", () => {
    const result =
      verifyOtpSchema.safeParse({
        phone: "09120000000",
        code: "12AB56",
      });

    expect(result.success).toBe(
      false,
    );
  });

  it("rejects OTP with wrong length", () => {
    const result =
      verifyOtpSchema.safeParse({
        phone: "09120000000",
        code: "12345",
      });

    expect(result.success).toBe(
      false,
    );
  });

  it("rejects invalid national ID", () => {
    const result =
      verifyOtpSchema.safeParse({
        phone: "09120000000",
        code: "123456",
        nationalId: "123",
      });

    expect(result.success).toBe(
      false,
    );
  });

  it("accepts valid registration data", () => {
    const result =
      verifyOtpSchema.safeParse({
        phone: "09120000000",
        code: "123456",
        firstName: "Ali",
        lastName: "Test",
        nationalId: "0012345678",
        birthDate:
          "2008-01-01",
      });

    expect(result.success).toBe(
      true,
    );
  });
});