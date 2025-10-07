import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from '../currencies/schemas/transaction.schema';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async getTransactionById(id: string) {
    return this.transactionModel.findById(id).exec();
  }

  async updateTransactionStatus(payload: {
    id: string;
    status: string;
    [key: string]: any;
  }) {
    const { id, status } = payload;

    this.logger.log(`Updating transaction ${id} status to ${status}`);

    const transaction = await this.transactionModel
      .findOne({
        externalOrderId: id,
      })
      .exec();

    if (!transaction) {
      this.logger.warn(`Transaction with externalOrderId ${id} not found`);
      return { success: false, message: 'Transaction not found' };
    }

    transaction.status = status;
    transaction.state = status;
    // Only merge allowed metadata keys from payload to avoid unsafe 'any' assignment
    const allowedMetadataKeys = Object.keys(transaction.metadata ?? {});
    const newMetadata: Record<string, unknown> = {
      ...((transaction.metadata as Record<string, unknown>) ?? {}),
    };
    for (const key of allowedMetadataKeys) {
      if (key in payload) {
        newMetadata[key] = payload[key];
      }
    }
    transaction.metadata = newMetadata;

    await transaction.save();

    this.logger.log(`Transaction ${id} updated successfully`);

    return { success: true, message: 'Transaction updated' };
  }
}
