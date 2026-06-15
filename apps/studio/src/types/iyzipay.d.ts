declare module "iyzipay" {
  interface IyzipayOptions {
    apiKey: string;
    secretKey: string;
    uri?: string;
  }

  interface IyzipayCallback {
    (err: Error | null, result: any): void;
  }

  class Iyzipay {
    static LOCALE: { TR: string; EN: string };
    constructor(options: IyzipayOptions);
    subscriptionProduct: { create: (params: any, cb: IyzipayCallback) => void; retrieveList: (params: any, cb: IyzipayCallback) => void };
    subscriptionPricingPlan: { create: (params: any, cb: IyzipayCallback) => void; retrieveList: (params: any, cb: IyzipayCallback) => void };
    subscriptionCheckoutForm: { initialize: (params: any, cb: IyzipayCallback) => void; retrieve: (params: any, cb: IyzipayCallback) => void };
    subscription: { cancel: (params: any, cb: IyzipayCallback) => void; retrieve: (params: any, cb: IyzipayCallback) => void };
  }

  export = Iyzipay;
}
