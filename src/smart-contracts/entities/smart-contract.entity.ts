// entities/token.entity.ts
export class Token {
    id: string;
    name: string;
    symbol: string;
    creatorAddress: string;
    businessId: string;
    initialValue: number;
    currentValue: number;
    totalSupply: number = 1_000_000_000; // 1 billón de tokens
    circulatingSupply: number = 0;
    transactions: Transaction[] = [];
    createdAt: string;
    updatedAt: string;

    constructor(data: Partial<Token>) {
        Object.assign(this, data);
        this.id = crypto.randomUUID();
        this.currentValue = this.initialValue;
        this.createdAt = new Date().toISOString();
        this.updatedAt = this.createdAt;
    }

    updatePrice(newTransactions: Transaction[]) {
        // Ajustar precio basado en oferta y demanda
        const recentTransactions = [...this.transactions, ...newTransactions].slice(-100);
        const buyPressure = recentTransactions.filter(tx => tx.type === 'buy').length;
        const sellPressure = recentTransactions.filter(tx => tx.type === 'sell').length;
        
        const priceImpact = (buyPressure - sellPressure) / 100; // ±1% por cada diferencia de 1 transacción
        this.currentValue *= (1 + priceImpact);
        
        // Límites de precio para evitar volatilidad extrema
        const maxChange = this.initialValue * 2;
        const minChange = this.initialValue * 0.5;
        this.currentValue = Math.min(Math.max(this.currentValue, minChange), maxChange);
        
        this.updatedAt = new Date().toISOString();
    }
}

// entities/transaction.entity.ts
export interface Transaction {
    id: string;
    tokenId: string;
    type: 'buy' | 'sell' | 'reward';
    amount: number;
    price: number;
    fromAddress: string;
    toAddress: string;
    timestamp: string;
}

// entities/smart-contract.entity.ts
export class SmartContract {
    id: string;
    tokenId: string;
    creatorAddress: string;
    rewardPercentage: number;
    minPurchaseAmount: number;
    isActive: boolean = true;
    metadata: {
        totalRewardsGiven: number;
        lastExecutedAt?: string;
        rewardMultiplier: number;
    };
    createdAt: string;
    updatedAt: string;

    constructor(data: Partial<SmartContract>) {
        Object.assign(this, data);
        this.id = crypto.randomUUID();
        this.metadata = {
            totalRewardsGiven: 0,
            rewardMultiplier: 1.0
        };
        this.createdAt = new Date().toISOString();
        this.updatedAt = this.createdAt;
    }

    calculateReward(purchaseAmount: number, tokenPrice: number): number {
        if (purchaseAmount < this.minPurchaseAmount) return 0;
        
        const baseReward = (purchaseAmount * this.rewardPercentage) / 100;
        const adjustedReward = baseReward * (1 / tokenPrice) * this.metadata.rewardMultiplier;
        
        // Ajustar multiplicador basado en la cantidad de recompensas dadas
        this.updateRewardMultiplier();
        
        return adjustedReward;
    }

    private updateRewardMultiplier() {
        // Reducir multiplicador gradualmente cuando se dan muchas recompensas
        const rewardFatigue = this.metadata.totalRewardsGiven / 1_000_000;
        this.metadata.rewardMultiplier = Math.max(0.5, 1 - rewardFatigue);
        this.updatedAt = new Date().toISOString();
    }
}