export class CreateAccountDto {
    name: string
    email: string
}

import crypto from 'crypto';

export interface IUser {
    publicKey: crypto.KeyObject;   // Clave pública del usuario (se comparte)
    privateKey: crypto.KeyObject;  // Clave privada del usuario (no se comparte)
    accountHash: string;           // Hash único de la cuenta
    name: string;                  // Nombre del usuario
    email: string;                 // Correo electrónico del usuario
    gasBalance: number;            // Saldo de gas
    balances: Record<string, number>; // Saldos de criptomonedas
    apiKeys: ApiKey[];             // Claves API del usuario
    rewardPlanEnabled: boolean;    // Estado del plan de recompensas
    smartContracts: Array<{        // Contratos inteligentes asociados al usuario
        contractId: string;        // ID del contrato inteligente
        businessPublicKey: string; // Clave pública del negocio asociado
        tokenId: string;           // Token ID asociado al contrato
        businessName: string;      // Nombre del negocio
        isActive: boolean;         // Estado del contrato (activo o inactivo)
    }>;

    // Métodos para firmar y verificar datos
    signData(data: string): string;
    verifyData(data: string, signature: string): boolean;

    // Métodos para gestionar saldos de criptomonedas
    updateBalance(currency: string, amount: number): void;
    getBalance(currency: string): number;

    // Métodos para gestionar claves API
    addApiKey(apiKey: string, description?: string, expiresAt?: Date, permissions?: string[]): void;
    removeApiKey(apiKey: string): void;
    hasApiKey(apiKey: string): boolean;
    deactivateApiKey(apiKey: string): void;

    // Métodos para gestionar el plan de recompensas
    setRewardPlanEnabled(enabled: boolean): void;
    hasRewardPlanEnabled(): boolean;

    // Métodos para gestionar el saldo de gas
    updateGasBalance(amount: number): void;
    getGasBalance(): number;

    // Métodos para gestionar contratos inteligentes
    addSmartContract(contractId: string, businessPublicKey: string, tokenId: string, businessName: string): void;
    getTokenIdByBusinessPublicKey(businessPublicKey: string): string;

    // Método para validar el par de claves
    validateKeyPairWithEncryption(): boolean;

    // Método para obtener datos de la cuenta
    getAccountData(): { publicKey: string };
}

export interface ApiKey {
    key: string; // La clave API en sí
    createdAt: Date; // Fecha de creación
    expiresAt?: Date; // Fecha de expiración (opcional)
    description?: string; // Descripción de la API Key (opcional)
    permissions: string[]; // Permisos asociados a la API Key
    isActive: boolean; // Indica si la API Key está activa
}