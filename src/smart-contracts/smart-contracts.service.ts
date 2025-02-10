import { AccountService } from "src/account/account.service";
import { SmartContract, Token, Transaction } from "./entities/smart-contract.entity";
import { Injectable } from "@nestjs/common";
import { CreateContractDto, CreateTokenDto, TradeTokenDto } from "./dto/create-smart-contract.dto";
import { GasService } from "src/gas/gas.service";

export interface resDefault {
  success: boolean
  data?: any,
  error?: any,
}

// services/crypto-contract.service.ts
@Injectable()
export class SmartContractsService {
  private tokens: Map<string, Token> = new Map();
  private contracts: Map<string, SmartContract> = new Map();

  constructor(
    private readonly accountService: AccountService,
    private readonly gasService: GasService
  ) { }

  async createToken(dto: CreateTokenDto): Promise<resDefault> {
    try {
      // Validar que el creador tenga permisos
      await this.validateCreator(dto.creatorAddress);

      const token = new Token({
        name: dto.name,
        symbol: dto.symbol,
        initialValue: dto.initialValue,
        creatorAddress: dto.creatorAddress,
        businessId: dto.businessId
      });

      this.tokens.set(token.id, token);
      return { success: true, data: token };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message }
      }
    }
  }

  async createSmartContract(dto: CreateContractDto): Promise<resDefault> {
    try {
      const token = this.tokens.get(dto.tokenId);
      if (!token) throw new Error('Token no encontrado');

      if (token.creatorAddress !== dto.creatorAddress) {
        throw new Error('Solo el creador del token puede crear contratos');
      }

      const contract = new SmartContract({
        tokenId: dto.tokenId,
        creatorAddress: dto.creatorAddress,
        rewardPercentage: dto.rewardPercentage,
        minPurchaseAmount: dto.minPurchaseAmount || 10000 // Mínimo 10,000 COP por defecto
      });

      this.contracts.set(contract.id, contract);
      return { success: true, data: contract };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message }
      }
    }
  }

  async tradeToken(dto: TradeTokenDto): Promise<Transaction> {
    const token = this.tokens.get(dto.tokenId);
    if (!token) throw new Error('Token no encontrado');

    // Validar balance y permisos
    await this.validateTrader(dto.traderAddress, dto.amount, token, dto.type);

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      tokenId: dto.tokenId,
      type: dto.type,
      amount: dto.amount,
      price: token.currentValue,
      fromAddress: dto.type === 'sell' ? dto.traderAddress : token.creatorAddress,
      toAddress: dto.type === 'buy' ? dto.traderAddress : token.creatorAddress,
      timestamp: new Date().toISOString()
    };

    // Actualizar suministro circulante
    if (dto.type === 'buy') {
      token.circulatingSupply += dto.amount;
    } else {
      token.circulatingSupply -= dto.amount;
    }

    // Actualizar precio basado en la nueva transacción
    token.transactions.push(transaction);
    token.updatePrice([transaction]);

    // Si es una compra, procesar recompensas
    if (dto.type === 'buy') {
      await this.processRewards(token, transaction);
    }

    return transaction;
  }

  private async processRewards(token: Token, transaction: Transaction) {
    const contract = Array.from(this.contracts.values())
      .find(c => c.tokenId === token.id && c.isActive);

    if (!contract) return;

    const rewardAmount = contract.calculateReward(
      transaction.amount * transaction.price, // Monto en COP
      token.currentValue
    );

    if (rewardAmount > 0) {
      // Cobrar gas al creador del contrato antes de procesar la recompensa
      await this.gasService.executeTransaction(
        token.creatorAddress, // El creador paga el gas
        'TOKEN_TRANSFER',
        65000, // Gas por transferencia de token
        0,
        async () => {
          // Crear transacción de recompensa
          const rewardTransaction: Transaction = {
            id: crypto.randomUUID(),
            tokenId: token.id,
            type: 'reward',
            amount: rewardAmount,
            price: token.currentValue,
            fromAddress: token.creatorAddress,
            toAddress: transaction.toAddress,
            timestamp: new Date().toISOString()
          };

          // Actualizar estadísticas
          contract.metadata.totalRewardsGiven += rewardAmount;
          contract.metadata.lastExecutedAt = rewardTransaction.timestamp;
          token.transactions.push(rewardTransaction);

          // Transferir recompensa
          await this.accountService.updateBalance(
            transaction.toAddress,
            token.symbol,
            rewardAmount
          );
        }
      );
    }
  }

  private async validateCreator(address: string): Promise<void> {
    const creator = await this.accountService.getAccount(address);
    if (!creator) throw new Error('Creador no encontrado');
    if (!creator.data.user.isBusinessAccount) throw new Error('Solo cuentas de negocio pueden crear tokens');
  }

  private async validateTrader(
    address: string,
    amount: number,
    token: Token,
    type: 'buy' | 'sell'
  ): Promise<void> {
    const trader = await this.accountService.getAccount(address);
    if (!trader) throw new Error('Cuenta no encontrada');

    if (type === 'buy') {
      const copBalance = trader.data.user.getBalance('cop');
      const cost = amount * token.currentValue;
      if (copBalance < cost) throw new Error('Balance insuficiente en COP');
    } else {
      const tokenBalance = trader.data.user.getBalance(token.symbol);
      if (tokenBalance < amount) throw new Error(`Balance insuficiente de ${token.symbol}`);
    }
  }

  // Métodos adicionales

  getToken(tokenId: string): Token | undefined {
    return this.tokens.get(tokenId);
  }

  getContract(contractId: string): SmartContract | undefined {
    return this.contracts.get(contractId);
  }

  getTokensByBusiness(businessId: string): Token[] {
    return Array.from(this.tokens.values())
      .filter(token => token.businessId === businessId);
  }

  getTokenMetrics(tokenId: string) {
    const token = this.tokens.get(tokenId);
    if (!token) throw new Error('Token no encontrado');

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recentTransactions = token.transactions
      .filter(tx => new Date(tx.timestamp) > last24Hours);

    return {
      currentPrice: token.currentValue,
      priceChange24h: this.calculatePriceChange(recentTransactions),
      volume24h: this.calculateVolume(recentTransactions),
      circulatingSupply: token.circulatingSupply,
      marketCap: token.circulatingSupply * token.currentValue
    };
  }

  private calculatePriceChange(transactions: Transaction[]): number {
    if (transactions.length < 2) return 0;
    const oldestPrice = transactions[0].price;
    const newestPrice = transactions[transactions.length - 1].price;
    return ((newestPrice - oldestPrice) / oldestPrice) * 100;
  }

  private calculateVolume(transactions: Transaction[]): number {
    return transactions
      .filter(tx => tx.type !== 'reward')
      .reduce((sum, tx) => sum + (tx.amount * tx.price), 0);
  }
}