import * as crypto from 'crypto';

export interface NestedObject {
    [key: string]: string | number | boolean | null | NestedObject | NestedObject[] | BlockData;
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
    rewardType: 'client' | 'owner'; // Tipo de recompensa
    description?: string; // Descripción de la recompensa (opcional)
}

export interface RewardBlock extends BodyBlock<RewardBlockData> {
    method: 'createRewardBlock';
    params: ParamProp<RewardBlockData>; // Usar RewardBlockData específicamente
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

export interface IBlock {
    index: number;
    timestamp: string;
    transactions: ITransaction[];  // Lista de procesos importantes y críticos.
    previousHash: string;
    hash: string;
    nonce: number;
    signature: string;  // Firma de la transacción.
    validator: string;
    calculateHash(): string;
    mineBlock(difficulty: number): void;
    forgeBlock(validator: string): void;
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

    // createGenesisBlock(): IBlock;  // Crea el bloque génesis.
    getLatestBlock(): IBlock;  // Obtiene el último bloque de la cadena.

    isChainValid(): boolean;  // Verifica si la cadena es válida.

    getDecryptedBlockData(blockIndex: number, publicKey: crypto.KeyObject): { success: boolean, data?: any, error?: string };  // Descifra los datos de un bloque específico.
    getAccountBlocks(publicKey: string): IBlock[];  // Obtiene los bloques asociados a una cuenta mediante su clave pública.
    getDecryptedData(publicKeyString: string, blockIndex: number): any[];  // Obtiene los datos desencriptados de un bloque específico.
    createPrivateBlock(blockData: NestedObject, publicKeyString: string): Promise<any>;  // Crea un bloque privado.
}

export function isBlockData(obj: any): obj is BlockData {
    return (
        typeof obj === 'object' &&
        typeof obj.from === 'string' &&
        typeof obj.to === 'string' &&
        typeof obj.amount === 'number'
    );
}