import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { IBlockchain, ITransaction } from './dto/create-chain.dto';
import { IBlock } from 'types/chainsType';
import { CryptoUtils } from 'handlersChain/CryptoUtils';
import { Block } from 'handlersChain/Block';
import { User } from 'handlersChain/User';
import * as crypto from 'crypto'
import { AccountService } from 'src/account/account.service';

interface NestedObject {
    [key: string]: string | number | boolean | null | NestedObject | NestedObject[];
}

type ParamProp = [
    NestedObject,
    string
]

interface BodyBlock {
    method: string;
    params: ParamProp
}

@Injectable()
export class ChainService implements IBlockchain {
    chain: Block[];
    pendingTransactions: ITransaction[];
    difficulty: number;
    hashCache: { [key: string]: string };
    eventListeners: { [event: string]: Function[] };

    /**
   * Inicializa una nueva instancia de Blockchain.
   */
    constructor(
        @Inject(forwardRef(() => AccountService))
        private readonly accountService: AccountService
    ) {
        this.chain = [this.createGenesisBlock()];
        this.pendingTransactions = [];
        this.difficulty = 2; // Nivel de dificultad para minar
        this.hashCache = {}; // Inicializa el cache para la búsqueda de hashes
        this.eventListeners = {}; // Inicializa el almacenamiento de escuchadores de eventos
    }

    /**
     * Crea el bloque génesis (el primer bloque de la cadena).
     * @returns {Block} El bloque génesis.
     */
    createGenesisBlock(): IBlock {
        return new Block(0, new Date().toISOString(), [], '0', '');
    }

    /**
     * Obtiene el último bloque de la cadena.
     * @returns {Block} El último bloque.
     */
    getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Crea un nuevo proceso y lo agrega a las transacciones pendientes.
     * @param {ITransaction} transaction - El proceso que se va a agregar.
     * @param {User} user - El usuario que crea el proceso.
     */
    createProcess(transaction: ITransaction, user: User): void {
        const transactionCopy = JSON.parse(JSON.stringify(transaction));

        try {
            // Primero firma los datos originales
            const signature = user.signData(JSON.stringify(transaction.data));

            // Luego encripta los datos usando CryptoUtils
            const encryptedData = CryptoUtils.encryptData(transactionCopy.data, user.publicKey);

            // Guarda tanto los datos encriptados como la firma
            this.pendingTransactions.push({
                ...transactionCopy,
                data: encryptedData,
                signature: signature
            });
        } catch (error) {
            console.error('Error creating process:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to create process: ${error.message}`);
            }
        }
    }

    /**
     * Minar los procesos pendientes y crear un nuevo bloque.
     * @param {User} user - El usuario que está minando el bloque. 
     */
    minePendingProcesses(user: User): void {
        if (this.pendingTransactions.length === 0) {
            throw new Error('No hay transacciones pendientes para minar');
        }

        // Crear una copia profunda de las transacciones pendientes
        const transactions = JSON.parse(JSON.stringify(this.pendingTransactions));

        // Crear un nuevo bloque
        const newBlock = new Block(
            this.chain.length,
            new Date().toISOString(),
            transactions,
            this.getLatestBlock().hash,
            transactions[0].signature
        );

        // Minar el bloque
        newBlock.mineBlock(this.difficulty);

        // Agregar el bloque a la cadena
        this.chain.push(newBlock);

        // Limpiar las transacciones pendientes
        this.pendingTransactions = [];

        console.log('Block mined:', {
            index: newBlock.index,
            transactions: newBlock.transactions.map(tx => ({
                ...tx,
                dataType: typeof tx.data
            }))
        });
    }

    /**
     * Valida la integridad de la blockchain verificando los hashes de cada bloque.
     * @returns {boolean} True si la cadena es válida, de lo contrario false.
     */
    isChainValid(user: User): boolean {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Verificar si el hash del bloque actual es válido (usando el hash cacheado si está disponible)
            if (this.hashCache[currentBlock.hash] !== currentBlock.calculateHash()) {
                return false;
            }

            // Verificar si el hash previo del bloque actual coincide con el hash del bloque anterior
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }

            // Validar la firma de las transacciones en el bloque
            currentBlock.transactions.forEach(transaction => {
                if (!this.isTransactionValid(transaction, user)) {
                    return false;
                }
            });
        }
        return true;
    }

    /**
     * Verifica la firma de una transacción con la clave pública del usuario.
     * @param {ITransaction} transaction - La transacción a verificar.
     * @param {User} user - El usuario que está realizando la verificación.
     * @returns {boolean} True si la transacción es válida, de lo contrario false.
     */
    isTransactionValid(transaction: ITransaction, user: User): boolean {
        try {
            // Verificar si la transacción tiene datos y una firma
            if (!transaction.signature || !transaction.data) {
                console.error('Transaction does not have valid data or signature');
                return false;
            }

            // Validación de firma de la transacción
            console.log(`Verifying signature for transaction data: ${JSON.stringify(transaction.data)}`);
            const isValid = user.verifyData(JSON.stringify(transaction.data), transaction.signature);

            if (isValid) {
                console.log('Transaction signature is valid');
            } else {
                console.log('Transaction signature is invalid');
            }

            return isValid;
        } catch (error) {
            console.error('Error verifying transaction signature:', error);
            return false;
        }
    }

    /**
     * Registra un escuchador de eventos para un evento específico.
     * @param {string} event - El nombre del evento.
     * @param {Function} listener - La función callback del escuchador del evento.
     */
    on(event: string, listener: Function): void {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(listener);
    }

    /**
     * Emite un evento para notificar a los escuchadores de una acción específica.
     * @param {string} event - El nombre del evento.
     * @param {any} data - Los datos a pasar a los escuchadores del evento.
     */
    emit(event: string, data: any): void {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(listener => listener(data));
        }
    }

    createBlock(params: ParamProp) {
        try {
            console.log("data Block", params[0])
            console.log("public key", params[1])
            let publicKey: crypto.KeyObject;

            if (typeof params[1] === 'string') {
                publicKey = crypto.createPublicKey(params[1]);
            } else {
                throw new Error('Invalid public key format')
            }

            const user = Object.values(this.accountService.users).find(
                user => user.publicKey.export({ type: 'spki', format: 'pem' }) === params[1]
            );

            if (!user) throw new Error('Invalid public key');

            // Cifrar los datos antes de agregar la transacción
            const encryptedData = CryptoUtils.encryptData(params[0], publicKey);

            // Crear la transacción con los datos cifrados
            const transaction = {
                processId: crypto.randomUUID(),
                data: encryptedData,
                description: 'Block creation',
                timestamp: new Date().toISOString(),
                signature: user.signData(JSON.stringify(params[0])),
            };

            if (!user || !user.signData) {
                throw new Error('User or signData method is not defined');
            }

            const newBlock = new Block(
                this.chain.length,
                new Date().toISOString(),
                [transaction],
                this.getLatestBlock().hash,
                transaction.signature,
            );

            newBlock.mineBlock(this.difficulty);
            this.chain.push(newBlock);

            return { success: true, data: newBlock }
        } catch (error) {
            if (error instanceof Error) {
                return { success: false, error: error.message }
            }
        }
    }

    /**
     * Obtiene los datos descifrados de un bloque específico usando la clave pública del usuario.
     * @param {number} blockIndex - Índice del bloque en la cadena.
     * @param {crypto.KeyObject} publicKey - Clave pública del usuario para descifrar los datos.
     * @returns {any} - Los datos descifrados o un mensaje de error.
     */
    getDecryptedBlockData(blockIndex: number, publicKey: crypto.KeyObject): any {
        try {
            if (blockIndex < 0 || blockIndex >= this.chain.length) {
                throw new Error('Block index out of bounds');
            }

            const block = this.chain[blockIndex];
            const decryptedData = block.transactions.map(transaction => {
                return CryptoUtils.decryptData(transaction.data, publicKey);
            });

            return { success: true, data: decryptedData };
        } catch (error) {
            if (error instanceof Error) {
                return { success: false, error: error.message };
            }
        }
    }
}
