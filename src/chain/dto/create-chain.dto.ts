import { IBlock } from "types/chainsType";
import * as crypto from 'crypto';

export interface NestedObject {
    [key: string]: string | number | boolean | null | NestedObject | NestedObject[];
}

// ParamProp ahora es genérico y puede aceptar cualquier tipo de datos
export type ParamProp<T = NestedObject> = [T, string];

// BodyBlock es genérico y puede aceptar cualquier tipo de datos en params
export interface BodyBlock<T = NestedObject> {
    method: MethodsBlock;
    params: ParamProp<T>; // Parámetros genéricos
}

export type MethodsBlock =
    'createBlock' |
    'createBlockPrivate' |
    'createSmartContractBlock' |
    'createRewardBlock' |
    'createAuditLogBlock' |
    'createExchangeBlock' |
    'createUserRegistrationBlock' |
    'createGovernanceBlock' |
    'createFinancialTransactionBlock' |
    'createCriticalDataBlock';

export interface SmartContractBlockData {
    contractId: string; // Identificador único del contrato
    parties: string[]; // Claves públicas de las partes involucradas
    conditions: NestedObject; // Condiciones del contrato
    executionDate: string; // Fecha de ejecución del contrato
    status: 'pending' | 'executed' | 'cancelled'; // Estado del contrato
}

export interface SmartContractBlock extends BodyBlock<SmartContractBlockData> {
    method: 'createSmartContractBlock';
    params: ParamProp<SmartContractBlockData>; // Usar SmartContractBlockData específicamente
}

export interface RewardBlockData {
    from: string; // Clave pública del emisor (sistema o negocio)
    to: string; // Clave pública del receptor (cliente o dueño)
    amount: number; // Cantidad de Tripcoins
    rewardType: 'client' | 'owner' | 'platform'; // Tipo de recompensa
    description?: string; // Descripción de la recompensa (opcional)
}

export interface RewardBlock extends BodyBlock<RewardBlockData> {
    method: 'createRewardBlock';
    params: ParamProp<RewardBlockData>; // Usar RewardBlockData específicamente
}

export interface AuditLogBlockData {
    eventType: string; // Tipo de evento (acceso, modificación, etc.)
    userId: string; // Clave pública del usuario que realizó la acción
    details: NestedObject; // Detalles del evento
    timestamp: string; // Fecha y hora del evento
}

export interface AuditLogBlock extends BodyBlock<AuditLogBlockData> {
    method: 'createAuditLogBlock';
    params: ParamProp<AuditLogBlockData>; // Usar AuditLogBlockData específicamente
}

export interface ExchangeBlockData {
    fromCurrency: string; // Moneda de origen (Tripcoin, USD, etc.)
    toCurrency: string; // Moneda de destino (BTC, ETH, etc.)
    amount: number; // Cantidad a intercambiar
    exchangeRate: number; // Tasa de cambio
    userId: string; // Clave pública del usuario que realiza el intercambio
    timestamp: string; // Fecha y hora del intercambio
}

export interface ExchangeBlock extends BodyBlock<ExchangeBlockData> {
    method: 'createExchangeBlock';
    params: ParamProp<ExchangeBlockData>; // Usar ExchangeBlockData específicamente
}

export interface UserRegistrationBlockData {
    userId: string; // Clave pública del usuario
    userType: 'client' | 'business'; // Tipo de usuario
    registrationDate: string; // Fecha de registro
    metadata: NestedObject; // Metadatos adicionales (nombre, dirección, etc.)
}

export interface UserRegistrationBlock extends BodyBlock<UserRegistrationBlockData> {
    method: 'createUserRegistrationBlock';
    params: ParamProp<UserRegistrationBlockData>; // Usar UserRegistrationBlockData específicamente
}

export interface GovernanceBlockData {
    proposalId: string; // Identificador único de la propuesta
    voters: string[]; // Claves públicas de los votantes
    votes: { [key: string]: 'yes' | 'no' }; // Votos de los participantes
    result: 'approved' | 'rejected'; // Resultado de la votación
    timestamp: string; // Fecha y hora de la votación
}

export interface GovernanceBlock extends BodyBlock<GovernanceBlockData> {
    method: 'createGovernanceBlock';
    params: ParamProp<GovernanceBlockData>; // Usar GovernanceBlockData específicamente
}

export interface FinancialTransactionBlockData {
    transactionType: 'crypto' | 'payment' | 'invoice'; // Tipo de transacción
    from: string; // Clave pública del remitente (o identificador del emisor)
    to: string; // Clave pública del destinatario (o identificador del receptor)
    amount: number; // Cantidad de la transacción
    currency?: string; // Moneda de la transacción (opcional)
    description?: string; // Descripción de la transacción (opcional)
    metadata?: NestedObject; // Metadatos adicionales (comprobante, factura, etc.)
    attachment?: string; // Imagen o archivo adjunto (en base64, por ejemplo)
}

export interface FinancialTransactionBlock extends BodyBlock<FinancialTransactionBlockData> {
    method: 'createFinancialTransactionBlock';
    params: ParamProp<FinancialTransactionBlockData>; // Usar FinancialTransactionBlockData específicamente
}

export interface CriticalDataBlockData {
    companyId: string; // Identificador único de la empresa
    dataType: string; // Tipo de dato crítico (inventario, empleados, etc.)
    data: NestedObject; // Datos críticos
    timestamp: string; // Fecha y hora del registro
}

export interface CriticalDataBlock extends BodyBlock<CriticalDataBlockData> {
    method: 'createCriticalDataBlock';
    params: ParamProp<CriticalDataBlockData>; // Usar CriticalDataBlockData específicamente
}

export interface BlockData {
    from: string; // Clave pública del remitente
    to: string; // Clave pública del destinatario
    amount: number; // Cantidad de la transacción
    currency?: string; // Moneda de la transacción (opcional)
    description?: string; // Descripción de la transacción (opcional)
}

export interface ITransaction {
    processId: string;   // Identificador único del proceso.
    description: string;  // Descripción del proceso (ej. pago, creación de pedido).
    data: string;         // Datos específicos del proceso (ej. detalles de pago, pedido).
    timestamp: string;    // Fecha y hora del proceso.
    signature: string;    // Firma digital del usuario que creó el proceso.
}

export interface IBlockchain {
    chain: IBlock[];  // Cadena de bloques.
    pendingTransactions: ITransaction[];  // Procesos pendientes para ser minados.
    difficulty: number;  // Dificultad para la minería.

    createGenesisBlock(): IBlock;  // Crea el bloque génesis.
    getLatestBlock(): IBlock;  // Obtiene el último bloque de la cadena.

    isChainValid(): boolean;  // Verifica si la cadena es válida.

    getDecryptedBlockData(blockIndex: number, publicKey: crypto.KeyObject): { success: boolean, data?: any, error?: string };  // Descifra los datos de un bloque específico.
    getAccountBlocks(publicKey: string): IBlock[];  // Obtiene los bloques asociados a una cuenta mediante su clave pública.
    getDecryptedData(publicKeyString: string, blockIndex: number): any[];  // Obtiene los datos desencriptados de un bloque específico.
    createPrivateBlock(blockData: NestedObject, publicKeyString: string): IBlock;  // Crea un bloque privado.
}

export function isBlockData(obj: any): obj is BlockData {
    return (
        typeof obj === 'object' &&
        typeof obj.from === 'string' &&
        typeof obj.to === 'string' &&
        typeof obj.amount === 'number'
    );
}