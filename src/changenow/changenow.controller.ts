import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ChangeNowService } from './changenow.service';

@Controller('changenow')
export class ChangeNowController {
  private readonly logger = new Logger(ChangeNowController.name);

  constructor(private readonly changeNowService: ChangeNowService) {}

  @Get('currencies')
  async getCurrencies() {
    try {
      return await this.changeNowService.getCurrencies();
    } catch (err: unknown) {
      let errorMsg = 'Unknown error';
      if (typeof err === 'object' && err !== null) {
        if (
          'response' in err &&
          typeof (err as { response?: unknown }).response === 'object' &&
          (err as { response?: unknown }).response !== null &&
          'data' in (err as { response: { data?: unknown } }).response
        ) {
          const responseObj = (err as { response: { data?: unknown } })
            .response;
          errorMsg =
            typeof responseObj.data === 'string'
              ? responseObj.data
              : JSON.stringify(responseObj.data);
        } else if (
          'message' in err &&
          typeof (err as { message?: unknown }).message === 'string'
        ) {
          errorMsg = (err as { message: string }).message;
        }
      } else if (typeof err === 'string') {
        errorMsg = err;
      }
      this.logger.error('getCurrencies error', errorMsg);
      return { error: 'Failed to fetch currencies', details: errorMsg };
    }
  }

  @Post('set-webhook')
  async setWebhook(@Body() payload: { url: string }) {
    try {
      const result: unknown = await this.changeNowService.setWebhook(
        payload.url,
      );
      return result;
    } catch (err: unknown) {
      let errorMsg = 'Unknown error';
      if (typeof err === 'object' && err !== null) {
        if (
          'response' in err &&
          typeof (err as { response?: unknown }).response === 'object' &&
          (err as { response?: unknown }).response !== null &&
          'data' in (err as { response: { data?: unknown } }).response
        ) {
          const responseObj = (err as { response: { data?: unknown } })
            .response;
          errorMsg =
            typeof responseObj.data === 'string'
              ? responseObj.data
              : JSON.stringify(responseObj.data);
        } else if (
          'message' in err &&
          typeof (err as { message?: unknown }).message === 'string'
        ) {
          errorMsg = (err as { message: string }).message;
        }
      } else if (typeof err === 'string') {
        errorMsg = err;
      }
      this.logger.error('setWebhook error', errorMsg);
      return {
        error: 'Failed to set webhook',
        details: errorMsg,
      };
    }
  }

  @Post('create-order')
  async createOrder(
    @Body() payload: import('./changenow.service').CreateOrderPayload,
  ) {
    try {
      const result = await this.changeNowService.createOrder(payload);
      console.log('🟢 Payload from frontend:', payload);

      if (result.payUrl) {
        return {
          success: true,
          payUrl: result.payUrl,
          transactionId: result.savedTransactionId,
          message: 'Please redirect to the payment page',
        };
      }

      return result;
    } catch (err: unknown) {
      let errorMsg = 'Unknown error';
      if (typeof err === 'object' && err !== null) {
        if (
          'response' in err &&
          typeof (err as { response?: unknown }).response === 'object' &&
          (err as { response?: unknown }).response !== null &&
          'data' in (err as { response: { data?: unknown } }).response
        ) {
          const responseObj = (err as { response: { data?: unknown } })
            .response;
          errorMsg =
            typeof responseObj.data === 'string'
              ? responseObj.data
              : JSON.stringify(responseObj.data);
        } else if (
          'message' in err &&
          typeof (err as { message?: unknown }).message === 'string'
        ) {
          errorMsg = (err as { message: string }).message;
        }
      } else if (typeof err === 'string') {
        errorMsg = err;
      }
      this.logger.error('createOrder error', errorMsg);
      return {
        success: false,
        error: 'Failed to create order',
        details: errorMsg,
      };
    }
  }
}
