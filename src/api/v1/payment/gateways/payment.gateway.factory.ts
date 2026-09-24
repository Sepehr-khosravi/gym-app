import { PaymentGatewayName } from "../payment.types";

import type { PaymentGateway } from "./payment.gateway";

import { ZarinpalGateway } from "./zarinpal.gateway";
import { ZibalGateway } from "./zibal.gateway";

export class PaymentGatewayFactory {
  constructor(
    private readonly zarinpalGateway: ZarinpalGateway,
    private readonly zibalGateway: ZibalGateway,
  ) {}

  create(
    gateway: PaymentGatewayName,
  ): PaymentGateway {
    switch (gateway) {
      case PaymentGatewayName.ZARINPAL:
        return this.zarinpalGateway;

      case PaymentGatewayName.ZIBAL:
        return this.zibalGateway;

      default:
        throw new Error(
          `Unsupported payment gateway: ${gateway}`,
        );
    }
  }
}