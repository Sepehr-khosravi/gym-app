import type { OtpProvider } from "../../src/services/otp/otp.provider";

export class TestOtpProvider implements OtpProvider {
  private codes = new Map<string, string>();

  async send(
    phone: string,
    code: string,
  ): Promise<void> {
    this.codes.set(phone, code);
  }

  getCode(phone: string): string | undefined {
    return this.codes.get(phone);
  }

  clear(): void {
    this.codes.clear();
  }
}