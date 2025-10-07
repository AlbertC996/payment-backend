import { Injectable } from '@nestjs/common';
import { ChangeNowService } from './changenow/changenow.service';

@Injectable()
export class AppService {
  constructor(private readonly changeNowService: ChangeNowService) {}

  async getCurrenciesList(): Promise<any> {
    return this.changeNowService.getCurrencies();
  }
}
