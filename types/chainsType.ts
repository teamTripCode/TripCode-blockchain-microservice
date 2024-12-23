import { User } from "handlersChain/User";

export interface ITransaction {
    processId: string;   // Identificador único del proceso.
    description: string;  // Descripción del proceso (ej. pago, creación de pedido).
    data: string;         // Datos específicos del proceso (ej. detalles de pago, pedido).
    timestamp: string;    // Fecha y hora del proceso.
    signature: string;    // Firma digital del usuario que creó el proceso.
}

export interface IBlock {
    index: number;
    timestamp: string;
    transactions: ITransaction[];  // Lista de procesos importantes y críticos.
    previousHash: string;
    hash: string;
    nonce: number;
    signature: string;  // Firma de la transacción.
    calculateHash(): string;
    mineBlock(difficulty: number): void;
}

export interface IBlockchain {
    chain: IBlock[];
    pendingTransactions: ITransaction[];  // Procesos pendientes a ser minados.
    difficulty: number;
    createGenesisBlock(): IBlock;
    getLatestBlock(): IBlock;
    createProcess(transaction: ITransaction, user: User): void;
    minePendingProcesses(user: User): void;  // Método actualizado para recibir 'user'
    isChainValid(user: User): boolean;
}