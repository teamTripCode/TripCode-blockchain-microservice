import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
    IBlockchain,
    isBlockData,
    ITransaction,
    NestedObject,
    ParamProp,
    FinancialTransactionBlockData,
    IBlock
} from './dto/create-chain.dto';
import { CryptoUtils } from 'handlersChain/CryptoUtils';
import { Block } from 'handlersChain/Block';
import * as crypto from 'crypto';
import { AccountService } from 'src/account/account.service';
import { ConsensusService } from 'src/consensus/consensus.service';
import { SmartContractsService } from 'src/smart-contracts/smart-contracts.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChainService implements IBlockchain {
    chain: Block[];  // Represents the chain of blocks.
    pendingTransactions: ITransaction[];  // Transactions that are waiting to be mined.
    difficulty: number;  // Difficulty level for mining new blocks.

    constructor(
        @Inject(forwardRef(() => AccountService))
        private readonly accountService: AccountService,  // Injecting AccountService for user management.
        // private readonly chainGateway: ChainGateway,  // Injecting ChainGateway for communication.
        private readonly consensusService: ConsensusService,  // Injecting ConsensusService for consensus operations.
        @Inject(forwardRef(() => SmartContractsService))
        private readonly smartcontract: SmartContractsService,
        private readonly prisma: PrismaService,
    ) {
        this.pendingTransactions = [];  // Initialize with no pending transactions.
        this.difficulty = 2;  // Set the mining difficulty level.
    }

    async onModuleInit() {
        await this.initializeChain();
    }

    private async initializeChain() {
        try {
            // Cargar bloques existentes de la base de datos
            const blocks = await this.prisma.block.findMany({
                include: {
                    transactions: true
                },
                orderBy: {
                    index: 'asc'
                }
            });

            if (blocks.length === 0) {
                // Si no hay bloques, crear el bloque génesis
                const genesisBlock = await this.createAndSaveGenesisBlock();
                this.chain = [genesisBlock];
            } else {
                // Convertir los bloques de Prisma a instancias de Block
                this.chain = blocks.map(block => {
                    const transactions: ITransaction[] = block.transactions.map(tx => ({
                        processId: tx.processId,
                        description: tx.description,
                        data: tx.data,
                        timestamp: tx.timestamp.toISOString(),
                        signature: tx.signature
                    }));

                    const blockInstance = new Block(
                        block.index,
                        block.timestamp.toISOString(),
                        transactions,
                        block.previousHash,
                        block.signature
                    );

                    // Establecer el hash y nonce existentes en lugar de recalcularlos
                    blockInstance.hash = block.hash;
                    blockInstance.nonce = block.nonce;
                    blockInstance.validator = block.validator;

                    return blockInstance;
                });
            }
        } catch (error) {
            console.error('Error initializing chain:', error);
            throw error;
        }
    }

    private async saveBlockToPrisma(block: Block): Promise<void> {
        const { transactions, ...blockData } = block;

        await this.prisma.block.create({
            data: {
                index: blockData.index,
                timestamp: new Date(blockData.timestamp),
                previousHash: blockData.previousHash,
                hash: blockData.hash,
                nonce: blockData.nonce,
                signature: blockData.signature,
                validator: 'system',
                accountId: 'system',
                transactions: {
                    create: transactions.map(tx => ({
                        processId: tx.processId,
                        description: tx.description,
                        data: tx.data,
                        timestamp: new Date(tx.timestamp), // Convert string to Date for Prisma
                        signature: tx.signature,
                        accountId: 'system'
                    }))
                }
            }
        });
    }

    private async createAndSaveGenesisBlock(): Promise<Block> {
        const genesisBlock = new Block(0, new Date().toISOString(), [], '0', '');
        genesisBlock.hash = genesisBlock.calculateHash();
        genesisBlock.validator = 'system';

        await this.prisma.block.create({
            data: {
                id: crypto.randomUUID(),
                index: genesisBlock.index,
                timestamp: new Date(genesisBlock.timestamp),
                previousHash: genesisBlock.previousHash,
                hash: genesisBlock.hash,
                nonce: genesisBlock.nonce,
                signature: genesisBlock.signature,
                validator: genesisBlock.validator,
                accountId: 'system'
            }
        });

        return genesisBlock;
    }

    /**
     * Retrieves the most recent block in the chain.
     * This is typically used when adding new blocks to ensure they are linked correctly.
     */
    public getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];  // Return the last block in the array.
    }

    /**
     * Creates a new block and adds it to the blockchain.
     * This block is created after validating and encrypting the provided data.
     * 
     * @param params Parameters needed to create the block, including block data and public key.
     * @returns The created block or an error message if the block creation fails.
     */
    public async createBlock<T = NestedObject>(params: ParamProp<T>) {
        try {
            const [blockData, publicKeyString] = params;

            // Verificar si blockData es de tipo BlockData
            if (!isBlockData(blockData)) {
                throw new Error('Estructura de blockData inválida');
            }

            const publicKey = crypto.createPublicKey(publicKeyString);  // Convert the public key string to a KeyObject.

            // Find the user based on the provided public key.
            const user = Object.values(this.accountService.users).find(
                user => user.publicKey.export({ type: 'spki', format: 'pem' }) === publicKeyString
            );

            if (!user) throw new Error('Invalid public key');  // Throw an error if no matching user is found.

            const encryptedData = CryptoUtils.encryptData(blockData, publicKey);  // Encrypt the block data with the user's public key.
            const transaction: ITransaction = {
                processId: crypto.randomUUID(),  // Generate a unique process ID.
                data: encryptedData,  // Encrypted data.
                description: 'Block creation',  // A description of the transaction.
                timestamp: new Date().toISOString(),  // Current timestamp of the transaction.
                signature: user.signData(JSON.stringify(blockData)),  // Sign the block data to prove ownership.
            };

            // Create the new block with the transaction data and add it to the chain.
            const newBlock = new Block(
                this.chain.length,  // Block index based on the chain's length.
                new Date().toISOString(),  // Block timestamp.
                [transaction],  // Transaction(s) included in the block.
                this.getLatestBlock().hash,  // Previous block hash to ensure the chain is connected.
                transaction.signature  // The transaction's signature for validation.
            );

            this.consensusService.mineBlock(newBlock);  // Mine the block based on the consensus algorithm.

            // Validate the new block before adding it to the chain.
            if (this.consensusService.validateBlock(newBlock)) {
                await this.saveBlockToPrisma(newBlock)
                this.chain.push(newBlock)

                // // Aplicar recompensas si es necesario
                // if (blockData.amount && blockData.from && blockData.to) {
                //     const tokenId = await this.getTokenIdByPublicKey(publicKeyString);
                //     await this.applyAutoScalableRewards(blockData.from, blockData.to, blockData.amount, tokenId);
                // }

                return { success: true, data: newBlock };  // Return the newly created block.
            } else {
                throw new Error('Invalid block');  // If the block is invalid, throw an error.
            }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };  // Return the error message if something goes wrong.
        }
    }

    /**
     * Creates a private block that only a specific user can view.
     * The data is encrypted using the user's public key to ensure privacy.
     * 
     * @param blockData The data to store in the block.
     * @param publicKeyString The public key of the user creating the block.
     * @returns The newly created private block.
     */
    public async createPrivateBlock(blockData: NestedObject, publicKeyString: string): Promise<IBlock> {
        const publicKey = crypto.createPublicKey(publicKeyString);
        const user = await this.accountService.getAccount(publicKeyString);
        if (!user) throw new Error('User not found');

        const encryptedData = CryptoUtils.encryptData(blockData, publicKey);
        const transaction: ITransaction = {
            processId: crypto.randomUUID(),
            data: encryptedData,
            description: 'Private Block Creation',
            timestamp: new Date().toISOString(),
            signature: user.data.user.signData(JSON.stringify(blockData)),
        };

        const newBlock = new Block(
            this.chain.length,
            new Date().toISOString(),
            [transaction],
            this.getLatestBlock().hash,
            transaction.signature
        );

        this.consensusService.mineBlock(newBlock);

        if (this.consensusService.validateBlock(newBlock)) {
            await this.saveBlockToPrisma(newBlock)
            this.chain.push(newBlock);
            return newBlock;
        }

        throw new Error('Invalid block');
    }

    /**
     * Minar un bloque con recompensas en la criptomoneda seleccionada.
     * @param blockData - Datos de la transacción (compra).
     * @param publicKeyString - Clave pública del negocio que mina el bloque.
     * @param currency - Criptomoneda a utilizar para las recompensas (por defecto: "tripcoin").
     * @returns El bloque minado o un mensaje de error.
     */
    public async createBlockWithRewards(
        blockData: FinancialTransactionBlockData,
        publicKeyString: string,
        currency: string = 'tripcoin'  // Criptomoneda por defecto.
    ): Promise<IBlock | { success: boolean; error: string }> {
        try {
            const publicKey = crypto.createPublicKey(publicKeyString);  // Convertir la clave pública.
            const user = await this.accountService.getAccount(publicKeyString);  // Obtener la cuenta del negocio.

            if (!user) throw new Error('Cuenta no encontrada');  // Validar que la cuenta exista.

            // Verificar si el plan de recompensas está activado.
            if (!user.data.user.hasRewardPlanEnabled()) {
                throw new Error('El plan de recompensas no está activado para esta cuenta');
            }

            // Verificar si la criptomoneda seleccionada es válida.
            if (!user.data.user.getBalance(currency) && currency !== 'tripcoin') {
                throw new Error(`La criptomoneda ${currency} no está disponible en la cuenta`);
            }

            // Verificar que blockData.amount es un número.
            if (typeof blockData.amount !== 'number') {
                throw new Error('El campo "amount" debe ser un número');
            }

            // Verificar que blockData.to y blockData.from son strings.
            if (typeof blockData.to !== 'string' || typeof blockData.from !== 'string') {
                throw new Error('Los campos "to" y "from" deben ser strings (claves públicas)');
            }

            // Crear la transacción de compra.
            const transaction: ITransaction = {
                processId: crypto.randomUUID(),  // ID único de la transacción.
                data: CryptoUtils.encryptData(blockData, publicKey),  // Datos cifrados.
                description: `Compra con recompensas en ${currency}`,  // Descripción.
                timestamp: new Date().toISOString(),  // Fecha y hora.
                signature: user.data.user.signData(JSON.stringify(blockData)),  // Firma del negocio.
            };

            // Crear el nuevo bloque.
            const newBlock = new Block(
                this.chain.length,  // Índice del bloque.
                new Date().toISOString(),  // Fecha y hora.
                [transaction],  // Transacciones incluidas.
                this.getLatestBlock().hash,  // Hash del bloque anterior.
                transaction.signature  // Firma de la transacción.
            );

            // Minar el bloque.
            this.consensusService.mineBlock(newBlock);

            // Validar el bloque minado.
            if (this.consensusService.validateBlock(newBlock)) {
                await this.saveBlockToPrisma(newBlock)
                this.chain.push(newBlock);  // Agregar el bloque a la cadena.

                // Obtener el tokenId asociado a la clave pública del negocio.
                const tokenId = await this.getTokenIdByPublicKey(publicKeyString);

                // Aplicar recompensas en la criptomoneda seleccionada.
                const { clientReward, ownerReward } = await this.accountService.calculateAutoScalableRewards(blockData.amount, tokenId);

                // Recompensar al cliente.
                const clientAccount = await this.accountService.getAccount(blockData.to);
                if (clientAccount) {
                    clientAccount.data.user.updateBalance(currency, clientReward);
                }

                // Recompensar al negocio.
                user.data.user.updateBalance(currency, ownerReward);

                // // Recompensar a la plataforma.
                // const platformAccount = await this.accountService.getAccount('platform');
                // if (platformAccount) {
                //     const platformReward = ownerReward * 0.1; // 10% of ownerReward
                //     platformAccount.data.user.updateBalance(currency, platformReward);
                // }

                return newBlock;  // Devolver el bloque minado.
            } else {
                throw new Error('Bloque inválido');  // Si el bloque no es válido.
            }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
        }
    }

    /**
     * Decrypts the data of a specific block using the provided public key.
     * This allows access to the original, readable data that was encrypted when the block was created.
     * 
     * @param blockIndex Index of the block to decrypt.
     * @param publicKey Public key used to decrypt the block's data.
     * @returns The decrypted data for the block.
     */
    public getDecryptedBlockData(blockIndex: number, publicKey: crypto.KeyObject) {
        try {
            if (blockIndex < 0 || blockIndex >= this.chain.length) {
                throw new Error('Block index out of bounds');  // Ensure the block index is valid.
            }

            const block = this.chain[blockIndex];
            // Decrypt all the transactions in the block.
            const decryptedData = block.transactions.map(transaction => {
                return CryptoUtils.decryptData(transaction.data, publicKey);  // Decrypt the transaction data.
            });

            return { success: true, data: decryptedData };  // Return the decrypted data.
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };  // Return the error message if decryption fails.
        }
    }

    /**
     * Validates the integrity of the entire blockchain.
     * This checks if all blocks in the chain are valid and if the chain has not been tampered with.
     * 
     * @returns Boolean value indicating whether the chain is valid.
     */
    public isChainValid(): boolean {
        return this.consensusService.validateChain(this.chain);  // Validate the chain using the consensus service.
    }

    /**
     * Allows a user to retrieve all the blocks they have created based on their public key.
     * This can be used to track the blocks created by a specific account.
     * 
     * @param publicKey Public key of the user.
     * @returns An array of blocks created by the user.
     */
    public getAccountBlocks(publicKey: string) {
        return this.chain.filter(block => {
            return block.transactions.some(transaction => {
                return transaction.signature === publicKey;  // Find transactions signed by the user's public key.
            });
        });
    }

    /**
     * Decrypts the data of a specific block and its transactions for a given public key.
     * 
     * @param publicKeyString Public key string of the user requesting the data.
     * @param blockIndex Index of the block to retrieve and decrypt.
     * @returns Decrypted data from the block's transactions.
     */
    public getDecryptedData(publicKeyString: string, blockIndex: number) {
        const block = this.chain[blockIndex];
        if (!block) throw new Error('Block not found');  // Ensure the block exists.

        // Convert the public key string to a KeyObject.
        const publicKey = crypto.createPublicKey(publicKeyString);

        // Decrypt the transactions in the block that were signed with the provided public key.
        const decryptedData = block.transactions.filter(transaction => {
            return transaction.signature === publicKeyString;  // Filter transactions by signature.
        }).map(transaction => CryptoUtils.decryptData(transaction.data, publicKey));  // Decrypt each matching transaction.

        return decryptedData;  // Return the decrypted data.
    }

    /**
     * Synchronizes the local blockchain with a received blockchain from a peer.
     * This method ensures that the local chain is up-to-date by replacing or extending
     * the chain based on the received chain.
     * 
     * @param receivedChain The blockchain received from another peer.
     * @param accountHash The account hash of the sender, used for validation.
     * @returns A success message or an error if the synchronization fails.
     */
    public async synchronizeChain(receivedChain: Block[], accountHash: string) {
        try {
            // Check if the received chain is longer than the local chain.
            if (receivedChain.length > this.chain.length) {
                // If the chains are not aligned, validate the received chain.
                const isValid = this.consensusService.validateChain(receivedChain);
                if (isValid) {
                    await this.prisma.block.deleteMany();

                    for (const block of receivedChain) await this.saveBlockToPrisma(block);

                    // Replace the local chain with the received chain.
                    this.chain = receivedChain;
                    return { success: true, message: 'Blockchain synchronized successfully' };
                } else {
                    throw new Error('Received chain is invalid');
                }
            } else {
                // If the received chain is not longer, it could be outdated.
                return { success: false, message: 'Received chain is not longer than the local chain' };
            }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Aplica recompensas auto-escalables después de una transacción.
     * @param from - Clave pública del cliente.
     * @param to - Clave pública del dueño del negocio.
     * @param amount - Valor de la transacción en USD.
     * @param tokenId - ID del token asociado al negocio.
     */
    async applyAutoScalableRewards(
        from: string,
        to: string,
        amount: number,
        tokenId: string, // Nuevo parámetro: ID del token
    ): Promise<void> {
        try {
            // Calcular las recompensas auto-escalables usando el tokenId
            const { clientReward, ownerReward } = await this.accountService.calculateAutoScalableRewards(amount, tokenId);

            // Obtener las cuentas de los participantes
            const clientAccount = await this.accountService.getAccount(from);
            const ownerAccount = await this.accountService.getAccount(to);
            //   const platformAccount = this.accountService.getAccount('platform'); // Cuenta de la plataforma

            if (!clientAccount || !ownerAccount) {
                throw new Error('Una o más cuentas no existen');
            }

            // Aplicar las recompensas en la criptomoneda asociada al token
            const currency = this.smartcontract.getTokenCurrentValue(tokenId); // Obtener la criptomoneda del token
            clientAccount.data.user.updateBalance(currency, clientReward); // Recompensa al cliente
            ownerAccount.data.user.updateBalance(currency, ownerReward); // Recompensa al dueño del negocio
            //   platformAccount.updateBalance(currency, platformReward); // Recompensa a la plataforma

            // Crear transacciones de recompensas
            const rewardTransactions = [
                {
                    from: 'system', // La recompensa proviene del sistema
                    to: from, // Cliente
                    amount: clientReward,
                    currency, // Usar la criptomoneda del token
                    description: `Recompensa por compra de ${amount} USD`,
                },
                {
                    from: 'system', // La recompensa proviene del sistema
                    to: to, // Dueño del negocio
                    amount: ownerReward,
                    currency, // Usar la criptomoneda del token
                    description: `Recompensa por venta de ${amount} USD`,
                },
            ];

            // Crear un bloque para cada transacción de recompensa
            for (const transaction of rewardTransactions) {
                await this.createBlock([transaction, 'systemPublicKey']); // 'systemPublicKey' es la clave pública del sistema
            }
        } catch (error) {
            console.error('Error aplicando recompensas:', error);
            throw new Error('No se pudieron aplicar las recompensas');
        }
    }

    /**
     * Gets the tokenId associated with a business's public key
     * @param publicKeyString - The public key of the business
     * @returns The associated tokenId
     */
    public async getTokenIdByPublicKey(publicKeyString: string): Promise<string> {
        const account = await this.prisma.account.findFirst({
            where: { publicKey: publicKeyString },
            include: { Token: true },
        })

        if (!account || account.Token.length === 0) throw new Error('No token found for this public key');
        return account.Token[0].tokenId;
    }
}