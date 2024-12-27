import { IBlock } from "types/chainsType";
import { User } from "handlersChain/User";
import * as crypto from 'crypto'

export interface NestedObject {
    [key: string]: string | number | boolean | null | NestedObject | NestedObject[];
}

export type ParamProp = [
    NestedObject,
    string
]

export interface BodyBlock {
    method: string;
    params: ParamProp
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



