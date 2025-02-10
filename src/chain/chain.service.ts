import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
    IBlockchain,
    isBlockData,
    ITransaction,
    NestedObject,
    ParamProp,
    FinancialTransactionBlockData,
    IBlock,
    BlockData
} from './dto/create-chain.dto';
import { CryptoUtils } from 'handlersChain/CryptoUtils';
import { Block } from 'handlersChain/Block';
import * as crypto from 'crypto';
import { AccountService } from 'src/account/account.service';
import { ConsensusService } from 'src/consensus/consensus.service';
import { SmartContractsService } from 'src/smart-contracts/smart-contracts.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BlockService } from 'src/block/block.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { RewardService } from 'src/reward/reward.service';
import { GasService } from 'src/gas/gas.service';

@Injectable()
export class ChainService implements IBlockchain {
    chain: Block[];  // Represents the chain of blocks.
    pendingTransactions: ITransaction[];  // Transactions that are waiting to be mined.
    difficulty: number;  // Difficulty level for mining new blocks.

    constructor(
        @Inject(forwardRef(() => AccountService))
        private readonly accountService: AccountService,  // Injecting AccountService for user management.
        private readonly consensusService: ConsensusService,  // Injecting ConsensusService for consensus operations.
        private readonly prisma: PrismaService,
        private readonly block: BlockService,
        private readonly transaction: TransactionService,
        private readonly reward: RewardService,
        private readonly gas: GasService,
    ) {
        this.pendingTransactions = [];  // Initialize with no pending transactions.
        this.difficulty = 2;  // Set the mining difficulty level.
    }

    async onModuleInit() {
        this.chain = await this.block.initializeChain();
    }

    /**
     * Retrieves the most recent block in the chain.
     * This is typically used when adding new blocks to ensure they are linked correctly.
     */
    public getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
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

            const publicKey = crypto.createPublicKey(publicKeyString); // Convert the public key string to a KeyObject.

            // Find the user based on the provided public key.
            const user = Object.values(this.accountService.users).find(
                (user) => user.publicKey.export({ type: 'spki', format: 'pem' }) === publicKeyString,
            );

            if (!user) throw new Error('Invalid public key'); // Throw an error if no matching user is found.

            const gasLimit = 50000;
            const gasPriorityFee = 0.000002;
            await this.gas.executeTransaction(
                user.accountHash,
                'CONTRACT_DEPLOYMENT',
                gasLimit,
                gasPriorityFee,
                async () => {
                    // Create the transaction using TransactionService.
                    const transaction = this.transaction.createTransaction(
                        blockData,
                        publicKey,
                        'Block creation',
                        user.signData.bind(user),
                    );

                    // Create the new block with the transaction data and add it to the chain.
                    const newBlock = new Block(
                        this.chain.length, // Block index based on the chain's length.
                        new Date().toISOString(), // Block timestamp.
                        [transaction], // Transaction(s) included in the block.
                        this.getLatestBlock().hash, // Previous block hash to ensure the chain is connected.
                        transaction.signature, // The transaction's signature for validation.
                    );

                    this.consensusService.mineBlock(newBlock); // Mine the block based on the consensus algorithm.

                    // Validate the new block before adding it to the chain.
                    if (this.consensusService.validateBlock(newBlock)) {
                        await this.block.saveBlockToPrisma(newBlock);
                        this.chain.push(newBlock);
                    } else {
                        throw new Error('Invalid block'); // If the block is invalid, throw an error.
                    }
                }
            )

            return { success: true, data: 'Block successfully created' }; // Return the newly created block.
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; // Return the error message if something goes wrong.
        }
    }

    public async createPrivateBlock(blockData: NestedObject, publicKeyString: string) {
        const publicKey = crypto.createPublicKey(publicKeyString);
        const user = await this.accountService.getAccount(publicKeyString);
        if (!user) throw new Error('User not found');

        const gasLimit = 30000;
        const gasPriorityFee = 0.000001;

        await this.gas.executeTransaction(
            user.data.user.accountHash,
            'PRIVATE_BLOCK_CREATION',
            gasLimit,
            gasPriorityFee,
            async () => {
                try {
                    const transaction = this.transaction.createTransaction(
                        blockData,
                        publicKey,
                        'Private Block Creation',
                        user.data.user.signData.bind(user.data.user),
                    );

                    const newBlock = new Block(
                        this.chain.length,
                        new Date().toISOString(),
                        [transaction],
                        this.getLatestBlock().hash,
                        transaction.signature,
                    );

                    this.consensusService.mineBlock(newBlock);

                    if (this.consensusService.validateBlock(newBlock)) {
                        await this.block.saveBlockToPrisma(newBlock);
                        this.chain.push(newBlock);
                        return { success: true, data: newBlock };
                    }

                    throw new Error('Invalid block');
                } catch (error) {
                    if (error instanceof Error) {
                        return { success: false, error: error.message }
                    }
                }
            }
        );
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
        currency: string,
    ) {
        try {
            const publicKey = crypto.createPublicKey(publicKeyString);
            const user = await this.accountService.getAccount(publicKeyString);

            if (!user) throw new Error('Cuenta no encontrada');
            if (!user.data.user.hasRewardPlanEnabled()) {
                throw new Error('El plan de recompensas no está activado para esta cuenta');
            }
            if (!user.data.user.getBalance(currency) && currency !== 'tripcoin') {
                throw new Error(`La criptomoneda ${currency} no está disponible en la cuenta`);
            }

            const gasLimit = 40000;
            const gasPriorityFee = 0.000002;

            return await this.gas.executeTransaction(
                user.data.user.accountHash,
                'BLOCK_WITH_REWARDS_CREATION',
                gasLimit,
                gasPriorityFee,
                async () => {
                    const transaction = this.transaction.createTransaction(
                        blockData,
                        publicKey,
                        `Compra con recompensas en ${currency}`,
                        user.data.user.signData.bind(user.data.user),
                    );

                    const newBlock = new Block(
                        this.chain.length,
                        new Date().toISOString(),
                        [transaction],
                        this.getLatestBlock().hash,
                        transaction.signature,
                    );

                    this.consensusService.mineBlock(newBlock);

                    if (this.consensusService.validateBlock(newBlock)) {
                        await this.block.saveBlockToPrisma(newBlock);
                        this.chain.push(newBlock);

                        const tokenId = await this.getTokenIdByPublicKey(publicKeyString);
                        await this.reward.applyAutoScalableRewards(blockData.to, blockData.amount, tokenId);

                        return { success: true, data: newBlock };
                    }
                    throw new Error('Bloque inválido');
                }
            );
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
                throw new Error('Block index out of bounds'); // Ensure the block index is valid.
            }

            const block = this.chain[blockIndex];
            // Decrypt all the transactions in the block.
            const decryptedData = block.transactions.map((transaction) => {
                return CryptoUtils.decryptData(transaction.data, publicKey); // Decrypt the transaction data.
            });

            return { success: true, data: decryptedData }; // Return the decrypted data.
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; // Return the error message if decryption fails.
        }
    }

    /**
     * Validates the integrity of the entire blockchain.
     * This checks if all blocks in the chain are valid and if the chain has not been tampered with.
     *
     * @returns Boolean value indicating whether the chain is valid.
     */
    public isChainValid(): boolean {
        return this.consensusService.validateChain(this.chain); // Validate the chain using the consensus service.
    }

    /**
     * Allows a user to retrieve all the blocks they have created based on their public key.
     * This can be used to track the blocks created by a specific account.
     *
     * @param publicKey Public key of the user.
     * @returns An array of blocks created by the user.
     */
    public getAccountBlocks(publicKey: string) {
        return this.chain.filter((block) => {
            return block.transactions.some((transaction) => {
                return transaction.signature === publicKey; // Find transactions signed by the user's public key.
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
        if (!block) throw new Error('Block not found'); // Ensure the block exists.

        // Convert the public key string to a KeyObject.
        const publicKey = crypto.createPublicKey(publicKeyString);

        // Decrypt the transactions in the block that were signed with the provided public key.
        const decryptedData = block.transactions
            .filter((transaction) => {
                return transaction.signature === publicKeyString; // Filter transactions by signature.
            })
            .map((transaction) => CryptoUtils.decryptData(transaction.data, publicKey)); // Decrypt each matching transaction.

        return decryptedData; // Return the decrypted data.
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

                    for (const block of receivedChain) await this.block.saveBlockToPrisma(block);

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