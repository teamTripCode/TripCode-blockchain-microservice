import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { AccountService } from "src/account/account.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class GasService {
  private readonly GAS_COSTS = {
    TRANSFER: 21000,
    TOKEN_TRANSFER: 65000,
    CONTRACT_DEPLOYMENT: 200000,
    STORAGE_WRITE: 20000,
    STORAGE_READ: 5000,
    BLOCK_WITH_REWARDS_CREATION: 3000,
    PRIVATE_BLOCK_CREATION: 3000,
  };

  private baseGasPrice: number = 0.000001;

  constructor(
    @Inject(forwardRef(() => AccountService))
    private readonly accountService: AccountService,
    private readonly prisma: PrismaService,
  ) { }

  calculateGasCost(
    operationType: keyof typeof this.GAS_COSTS,
    gasLimit: number,
    gasPriorityFee: number = 0
  ) {
    const gasUnits = this.GAS_COSTS[operationType];
    const totalGasPrice = this.baseGasPrice + gasPriorityFee;

    return {
      gasUnits,
      baseGasCost: gasUnits * this.baseGasPrice,
      priorityFee: gasUnits * gasPriorityFee,
      total: gasUnits * totalGasPrice,
      maxCost: gasLimit * totalGasPrice,
    };
  }

  async executeTransaction(
    accountHash: string,
    operationType: keyof typeof this.GAS_COSTS,
    gasLimit: number,
    gasPriorityFee: number = 0,
    transactionCallback: () => Promise<any>
  ) {
    const gasCost = this.calculateGasCost(operationType, gasLimit, gasPriorityFee);

    const balance = await this.accountService.getBalance(accountHash, 'tripcoin');
    if (balance < gasCost.maxCost) {
      throw new Error('Insufficient TripCoin balance for gas');
    }

    try {
      await transactionCallback();
      await this.accountService.updateBalance(accountHash, 'tripcoin', -gasCost.baseGasCost);

      await this.prisma.gasUsage.create({
        data: {
          accountHash,
          gasUnits: gasCost.gasUnits,
          baseFee: gasCost.baseGasCost,
          priorityFee: gasCost.priorityFee,
        }
      });

      return true;
    } catch (error) {
      const gasUsed = Math.min(gasCost.gasUnits, gasLimit);
      const actualCost = gasUsed * (this.baseGasPrice + gasPriorityFee);

      await this.accountService.updateBalance(accountHash, 'tripcoin', -actualCost);
      throw error;
    }
  }

  async adjustBaseGasPrice() {
    const recentBlocks = await this.prisma.block.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: { transactions: true }
    });

    const targetGasPerBlock = 15000000;
    const averageGasUsed = recentBlocks.reduce((sum, block) =>
      sum + block.transactions.length * this.GAS_COSTS.TRANSFER, 0
    ) / recentBlocks.length;

    if (averageGasUsed > targetGasPerBlock) {
      this.baseGasPrice *= 1.125;
    } else {
      this.baseGasPrice *= 0.875;
    }
  }

  getGasPrice() {
    return {
      baseGasPrice: this.baseGasPrice,
      suggestedPriorityFee: this.baseGasPrice * 0.1,
      estimatedTotalGasPrice: this.baseGasPrice * 1.1
    };
  }
}