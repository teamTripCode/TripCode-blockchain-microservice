import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AccountService } from 'src/account/account.service';
import { ChainService } from 'src/chain/chain.service';
import { ConversionService } from 'src/conversion/conversion.service';

@Injectable()
export class GasService {
  private gasPriceInUSD: number = 0.01; // Precio base del gas en USD (ajustable)
  private conversionRates: Record<string, number> = {};

  constructor(
    @Inject(forwardRef(() => AccountService))
    private readonly accountService: AccountService,
    @Inject(forwardRef(() => ChainService))
    private readonly chainService: ChainService,
    private readonly conversionService: ConversionService,
  ) {
    this.updateConversionRates();
  }

  /**
   * Calcula el costo del gas para una transacción en USD.
   * @param complexity - Complejidad de la transacción (número de operaciones).
   * @returns El costo del gas en USD.
   */
  calculateGasCostInUSD(complexity: number): number {
    return this.gasPriceInUSD * complexity;
  }

  /**
   * Convierte el costo del gas de USD a otra criptomoneda.
   * @param amountInUSD - Cantidad en USD.
   * @param currency - Criptomoneda a la que se desea convertir (por ejemplo, "tripcoin").
   * @returns El costo del gas en la criptomoneda especificada.
   */
  convertGasCostToCrypto(amountInUSD: number, currency: string): number {
    const rate = this.conversionRates[currency.toLowerCase()];
    if (!rate) {
      throw new Error(`Tasa de conversión no disponible para ${currency}`);
    }
    return amountInUSD / rate;
  }

  /**
   * Cobra el gas a un usuario por una transacción.
   * @param publicKey - Clave pública del usuario.
   * @param complexity - Complejidad de la transacción.
   * @param currency - Criptomoneda en la que se cobrará el gas (por defecto, "tripcoin").
   * @returns Verdadero si el cobro fue exitoso.
   */
  async chargeGas(publicKey: string, complexity: number, currency: string = 'tripcoin'): Promise<boolean> {
    const gasCostInUSD = this.calculateGasCostInUSD(complexity);
    const gasCostInCrypto = this.convertGasCostToCrypto(gasCostInUSD, currency);

    const user = await this.accountService.getAccount(publicKey);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar si el usuario tiene suficiente saldo en la criptomoneda especificada
    const userBalance = user.data.user.getBalance(currency);
    if (userBalance < gasCostInCrypto) {
      throw new Error('Saldo insuficiente para cubrir el gas');
    }

    // Cobrar el gas al usuario
    user.data.user.updateBalance(currency, -gasCostInCrypto);

    // Registrar la transacción de gas en la cadena
    this.chainService.createBlock([
      {
        from: publicKey,
        to: 'gas-fee-collector', // Dirección del recolector de gas
        amount: gasCostInCrypto,
        currency,
        description: `Cobro de gas por transacción en ${currency}`,
      },
      user.data.user.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    ]);

    return true;
  }

  /**
   * Obtiene el precio actual del gas en USD.
   * @returns El precio del gas en USD.
   */
  getGasPriceInUSD(): number {
    return this.gasPriceInUSD;
  }

  /**
   * Actualiza el precio del gas en USD.
   * @param newPrice - Nuevo precio del gas en USD.
   */
  updateGasPriceInUSD(newPrice: number): void {
    if (newPrice <= 0) {
      throw new Error('El precio del gas debe ser mayor que 0');
    }
    this.gasPriceInUSD = newPrice;
  }

  /**
   * Actualiza las tasas de conversión de criptomonedas a USD.
   */
  async updateConversionRates(): Promise<void> {
    const cryptos = ['tripcoin', 'bitcoin', 'ethereum']; // Criptomonedas soportadas
    this.conversionRates = await this.conversionService.getMultipleCryptoPricesInUSD(cryptos);
  }
}
