import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;

  payment: {
    zarinpal: {
      merchantId: string;
      sandbox: boolean;
      callbackUrl: string;
    };

    zibal: {
      merchantId: string;
      callbackUrl: string;
    };
  };
}

const config: Config = {
  port:
    Number(process.env.PORT) || 8080,

  nodeEnv:
    process.env.NODE_ENV || "development",

  payment: {
    zarinpal: {
      merchantId:
        process.env.ZARINPAL_MERCHANT_ID ?? "",

      sandbox:
        process.env.ZARINPAL_SANDBOX === "true",

      callbackUrl:
        process.env.ZARINPAL_CALLBACK_URL ?? "",
    },

    zibal: {
      merchantId:
        process.env.ZIBAL_MERCHANT_ID ?? "",

      callbackUrl:
        process.env.ZIBAL_CALLBACK_URL ?? "",
    },
  },
};

export default config;