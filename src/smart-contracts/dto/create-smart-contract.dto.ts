// dto/create-token.dto.ts
export class CreateTokenDto {
    name: string;             // Nombre del token
    symbol: string;           // Símbolo del token (ej: BTC)
    initialValue: number;     // Valor inicial en COP
    creatorAddress: string;   // Dirección del creador
    businessId: string;       // ID del negocio asociado
}

// dto/create-contract.dto.ts
export class CreateContractDto {
    tokenId: string;          // ID del token asociado
    creatorAddress: string;   // Dirección del creador
    rewardPercentage: number; // Porcentaje de recompensa base
    minPurchaseAmount?: number; // Monto mínimo para recompensas
}

// dto/trade-token.dto.ts
export class TradeTokenDto {
    tokenId: string;
    amount: number;
    traderAddress: string;
    type: 'buy' | 'sell';
}

// dto/reward-transaction.dto.ts
export class RewardTransactionDto {
    tokenId: string;
    recipientAddress: string;
    purchaseAmount: number;
    rewardAmount: number;
    timestamp: string;
}