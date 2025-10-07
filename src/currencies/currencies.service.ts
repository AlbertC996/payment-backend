import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface Currency {
  ticker: string;
  name: string;
  image: string;
  hasExternalId: boolean;
  isFiat: boolean;
  featured: boolean;
  isStable: boolean;
  supportsFixedRate: boolean;
}

@Injectable()
export class CurrenciesService {
  constructor(private readonly httpService: HttpService) {}

  async getCurrencies(): Promise<Currency[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<Currency[]>(
          'https://api.changenow.io/v2/exchange/currencies',
          {
            headers: {
              'x-changenow-api-key': process.env.CHANGENOW_API_KEY,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      let errorMsg = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // response.data
        if (
          'response' in error &&
          typeof (error as { response?: unknown }).response === 'object' &&
          (error as { response?: unknown }).response !== null &&
          'data' in (error as { response: { data?: unknown } }).response
        ) {
          const responseObj = (error as { response: { data?: unknown } })
            .response;

          errorMsg =
            typeof responseObj.data === 'string'
              ? responseObj.data
              : JSON.stringify(responseObj.data);
        } else if (
          'message' in error &&
          typeof (error as { message?: unknown }).message === 'string'
        ) {
          errorMsg = (error as { message: string }).message;
        }
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      console.error('Error fetching currencies:', errorMsg);
      throw new Error('Failed to fetch currencies from ChangeNOW');
    }
  }
}
