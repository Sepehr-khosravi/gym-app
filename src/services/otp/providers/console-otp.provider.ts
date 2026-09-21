import type { OtpProvider } from "../otp.provider";

export class ConsoleOtpProvider implements OtpProvider {
  async send(phone: string, code: string): Promise<void> {
    console.log(
      `[DEV OTP] phone=${phone} code=${code}`,
    );
  }
}