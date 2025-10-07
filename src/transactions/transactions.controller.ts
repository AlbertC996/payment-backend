import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';

interface WebhookPayload {
  id?: string;
  status?: string;
  [key: string]: unknown;
}

@Controller('transactions')
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  @Get(':id')
  async getTransaction(@Param('id') id: string): Promise<any> {
    try {
      return await this.transactionsService.getTransactionById(id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown error occurred';
      this.logger.error('❌ getTransaction error', message);
      throw new HttpException(
        { error: 'Failed to fetch transaction', details: message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: WebhookPayload): Promise<any> {
    try {
      this.logger.log('📥 Received webhook from ChangeNOW');
      if (!payload.id || !payload.status) {
        throw new HttpException(
          { error: 'Missing required fields: id and status' },
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.transactionsService.updateTransactionStatus(
        payload as { [key: string]: any; id: string; status: string },
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown error occurred';
      this.logger.error('❌ handleWebhook error', message);
      throw new HttpException(
        { error: 'Failed to process webhook', details: message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
