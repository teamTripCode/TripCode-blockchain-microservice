import { Injectable, Logger } from "@nestjs/common";
import { AccountService } from "src/account/account.service";
import { SmartContractsService } from "src/smart-contracts/smart-contracts.service";
import { Transaction } from "src/smart-contracts/entities/smart-contract.entity";

@Injectable()
export class RewardService {
    private readonly logger = new Logger(RewardService.name);

    constructor(
        private readonly accountService: AccountService,
        private readonly smartContractsService: SmartContractsService
    ) { }

    async applyAutoScalableRewards(
        fromAddress: string,
        amountInCOP: number,
        tokenId: string
    ): Promise<void> {
        try {
            const token = this.smartContractsService.getToken(tokenId);
            if (!token) {
                this.logger.warn(`Token no encontrado: ${tokenId}`);
                throw new Error("Token no encontrado");
            }

            const contract = this.smartContractsService.getContract(tokenId);
            if (!contract || !contract.isActive) {
                this.logger.warn(`Contrato de recompensas inactivo o no encontrado: ${tokenId}`);
                throw new Error("No se encontró un contrato de recompensas activo para este token");
            }

            // Calcular recompensa
            const rewardInCOP = (amountInCOP * contract.rewardPercentage) / 100;
            const rewardAmount = rewardInCOP / token.currentValue;

            if (rewardAmount <= 0) {
                this.logger.debug(`Recompensa calculada en 0 para ${fromAddress}`);
                return;
            }

            // Crear transacción de recompensa
            const rewardTransaction: Transaction = {
                id: crypto.randomUUID(),
                tokenId: token.id,
                type: "reward",
                amount: rewardAmount,
                price: token.currentValue,
                fromAddress: token.creatorAddress,
                toAddress: fromAddress,
                timestamp: new Date().toISOString(),
            };

            // Actualizar estadísticas de contrato (sin mutaciones directas)
            contract.metadata = {
                ...contract.metadata,
                totalRewardsGiven: contract.metadata.totalRewardsGiven + rewardAmount,
                lastExecutedAt: rewardTransaction.timestamp
            };

            token.transactions.push(rewardTransaction);

            // Transferir tokens al usuario
            await this.accountService.updateBalance(fromAddress, token.symbol, rewardAmount);

            this.logger.log(`Recompensa de ${rewardAmount} ${token.symbol} otorgada a ${fromAddress}`);
        } catch (error) {
            this.logger.error(`Error en applyAutoScalableRewards: ${error.message}`);
            throw new Error(error.message || "Error al aplicar recompensa");
        }
    }
}
