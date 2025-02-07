import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { map } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ConversionService {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService
  ) {
    // Define las variables de configuración directamente aquí
    this.apiUrl = process.env.CRYPTO_API_URL || 'https://api.coingecko.com/api/v3'; // URL por defecto
    this.apiKey = process.env.CRYPTO_API_KEY || 'default-api-key'; // Clave por defecto
  }

  async getCryptoPriceInUSD(cryptoId: string): Promise<number> {
    const url = `${this.apiUrl}/simple/price?ids=${cryptoId}&vs_currencies=usd`;
    const headers = { 'x-api-key': this.apiKey };

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers }).pipe(
          map((res) => res.data),
        ),
      );

      if (!response || !response[cryptoId] || !response[cryptoId].usd) {
        throw new Error(`No se pudo obtener el precio de ${cryptoId}`);
      }

      return response[cryptoId].usd;
    } catch (error) {
      throw new Error(`Error al obtener el precio de ${cryptoId}: ${error.message}`);
    }
  }

  async getMultipleCryptoPricesInUSD(cryptoIds: string[]): Promise<Record<string, number>> {
    const url = `${this.apiUrl}/simple/price?ids=${cryptoIds.join(',')}&vs_currencies=usd`;
    const headers = { 'x-api-key': this.apiKey };

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers }).pipe(
          map((res) => res.data),
        ),
      );

      if (!response) {
        throw new Error('No se pudieron obtener los precios de las criptomonedas');
      }

      const prices: Record<string, number> = {};
      cryptoIds.forEach((id) => {
        if (response[id] && response[id].usd) {
          prices[id] = response[id].usd;
        } else {
          prices[id] = 0; // Valor por defecto si no se encuentra el precio
        }
      });

      return prices;
    } catch (error) {
      throw new Error(`Error al obtener los precios: ${error.message}`);
    }
  }
}