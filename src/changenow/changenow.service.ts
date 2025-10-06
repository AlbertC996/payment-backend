import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from '../currencies/schemas/transaction.schema';

export interface CreateOrderPayload {
  fromCurrency?: string;
  toCurrency?: string;
  fromAmount?: string | number;
  address?: string;
  externalUserId?: string;
  country?: string;
  paymentMethod?: string;
  email?: string;
}

export interface CreateOrderResult {
  respData: any;
  savedTransactionId: string;
  payUrl?: string;
}

@Injectable()
export class ChangeNowService {
  private readonly logger = new Logger(ChangeNowService.name);
  private readonly apiKey = process.env.CHANGENOW_API_KEY;

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  /** 📦     ChangeNOW */
  async getCurrencies(): Promise<any> {
    try {
      const url = 'https://api.changenow.io/v2/exchange/currencies';
      const res: AxiosResponse = await axios.get(url, {
        headers: { 'x-changenow-api-key': this.apiKey },
        timeout: 30000,
      });
      return res.data;
    } catch (error: unknown) {
      let errorMessage = 'Unknown error';
      let errorData: string | undefined;
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { [key: string]: unknown };
        const response = errObj.response;
        if (typeof response === 'object' && response !== null) {
          const responseObj = response as { [key: string]: unknown };
          if (responseObj.data) {
            errorData = JSON.stringify(responseObj.data);
          }
        }
        if (typeof errObj.message === 'string') {
          errorMessage = errObj.message;
        }
      }
      this.logger.error(
        '❌ Failed to fetch currencies from ChangeNOW',
        errorData || errorMessage,
      );
      throw new Error('Failed to fetch currencies from ChangeNOW');
    }
  }

  /** 💳      (Fiat → Crypto) */
  async createOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
    const endpoint = 'https://api.changenow.io/v2/exchange/by-card';

    // Type-safe helper to get value from multiple possible keys
    function getField<T>(
      obj: Record<string, unknown>,
      keys: string[],
      fallback?: T,
    ): T | undefined {
      for (const key of keys) {
        const value = obj[key];
        if (typeof value !== 'undefined') return value as T;
      }
      return fallback;
    }

    const fromCurrency = String(
      getField<string | number>(
        payload as Record<string, unknown>,
        ['fromCurrency', 'from_currency', 'currencyFrom', 'from'],
        '',
      ),
    );
    const toCurrency = String(
      getField<string | number>(
        payload as Record<string, unknown>,
        ['toCurrency', 'to_currency', 'currencyTo', 'to'],
        '',
      ),
    );
    const fromAmountRaw = getField<string | number>(
      payload as Record<string, unknown>,
      ['fromAmount', 'from_amount', 'amount'],
    );
    const fromAmount =
      typeof fromAmountRaw === 'undefined' ? '0' : String(fromAmountRaw);

    const address = String(
      getField<string | number>(
        payload as Record<string, unknown>,
        ['address'],
        process.env.WALLET_ADDRESS ?? '',
      ),
    );
    const country = String(
      getField<string | number>(
        payload as Record<string, unknown>,
        ['country'],
        'US',
      ),
    );
    const paymentMethod = String(
      getField<string | number>(
        payload as Record<string, unknown>,
        ['paymentMethod', 'payment_method'],
        'card',
      ),
    );
    const email = String(
      getField<string | number>(
        payload as Record<string, unknown>,
        ['email'],
        '',
      ),
    );
    const externalUserId = String(
      getField<string | number>(
        payload as Record<string, unknown>,
        ['externalUserId', 'external_user_id'],
        email || `user-${Date.now()}`,
      ) ?? (email || `user-${Date.now()}`),
    );

    const body = {
      fromCurrency,
      toCurrency,
      fromAmount,
      address,
      country,
      paymentMethod,
      email,
    };

    try {
      const res: AxiosResponse<unknown> = await axios.post(endpoint, body, {
        headers: {
          'x-changenow-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      });

      // Type guard for response data
      const respData =
        typeof res.data === 'object' && res.data !== null
          ? (res.data as Record<string, unknown>)
          : {};

  const orderId = typeof respData.id === 'string' ? respData.id : `cn_${Date.now()}`;

  const externalOrderId = typeof respData.id === 'string' ? respData.id : null;

  const state = typeof respData.status === 'string' ? respData.status : 'created';

  const status = typeof respData.status === 'string' ? respData.status : 'pending';
  let payUrl: string | undefined;
  if (typeof respData.payUrl === 'string') payUrl = respData.payUrl;

  else if (typeof respData.redirectUrl === 'string') payUrl = respData.redirectUrl;

  else if (typeof respData.checkoutUrl === 'string') payUrl = respData.checkoutUrl;

      const tx = new this.transactionModel({
        orderId,
        externalUserId,
        externalOrderId,
        providerCode: 'changenow',
        currencyFrom: fromCurrency,
        currencyTo: toCurrency,
        amountFrom: fromAmount,
        country,
        state,
        walletAddress: address,
        paymentMethod,
        metadata: respData,
        status,
      });

      await tx.save();

      return {
        respData,
        savedTransactionId:
          tx._id && typeof tx._id.toString === 'function'
            ? tx._id.toString()
            : '',
        payUrl,
      };
    } catch (error: unknown) {
      let errorMessage = 'Unknown error';
      let errorType = 'unknown';
      let errorData: string | undefined;
      if (typeof error === 'object' && error !== null) {
        // Type guard for error.response
        const errObj = error as { [key: string]: unknown };
        const response = errObj.response;
        if (typeof response === 'object' && response !== null) {
          const responseObj = response as { [key: string]: unknown };
          if (typeof responseObj.status === 'string') {
            errorType = responseObj.status;
          }
            // Removed misplaced variable declarations from error block
      this.logger.error(
        '❌ Failed to create order with ChangeNOW',
        errorData || errorMessage,
      );

      const errTx = new this.transactionModel({
        orderId: `failed_${Date.now()}`,
        externalUserId: externalUserId || 'unknown',
        providerCode: 'changenow',
        currencyFrom: fromCurrency,
        currencyTo: toCurrency,
        amountFrom: fromAmount,
        country: country || 'unknown',
        state: 'failed',
        walletAddress: address,
        paymentMethod,
        status: 'failed',
        errorType,
        errorMessage: errorData || errorMessage,
      });

      await errTx.save();
      throw error;
    }
  }

  /** 🔔  Webhook  ChangeNOW */
  async setWebhook(url: string): Promise<any> {
    try {
      const response = await axios.post(
        'https://api.changenow.io/v2/transactions/webhook',
        { url },
        {
          headers: {
            'x-changenow-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`✅ Webhook successfully set to ${url}`);
      return response.data;
    } catch (error: unknown) {
      let errorMessage = 'Unknown error';
      let errorData: string | undefined;
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { [key: string]: unknown };
        const response = errObj.response;
        if (typeof response === 'object' && response !== null) {
          const responseObj = response as { [key: string]: unknown };
          if (responseObj.data) {
            errorData = JSON.stringify(responseObj.data);
          }
        }
        if (typeof errObj.message === 'string') {
          errorMessage = errObj.message;
        }
      }
      this.logger.error('❌ Failed to set webhook:', errorData || errorMessage);
      throw new Error('Failed to set webhook');
    }
  }
}
