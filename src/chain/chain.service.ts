import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { IBlockchain, ITransaction, NestedObject, ParamProp } from './dto/create-chain.dto';
import { IBlock } from 'types/chainsType';
import { CryptoUtils } from 'handlersChain/CryptoUtils';
import { Block } from 'handlersChain/Block';
import * as crypto from 'crypto';
import { AccountService } from 'src/account/account.service';
import { ChainGateway } from './chain.gateway';
import { ConsensusService } from 'src/consensus/consensus.service';

@Injectable()
export class ChainService implements IBlockchain {
    chain: Block[];  // Represents the chain of blocks.
    pendingTransactions: ITransaction[];  // Transactions that are waiting to be mined.
    difficulty: number;  // Difficulty level for mining new blocks.

    constructor(
        @Inject(forwardRef(() => AccountService))
        private readonly accountService: AccountService,  // Injecting AccountService for user management.
        private readonly chainGateway: ChainGateway,  // Injecting ChainGateway for communication.
        private readonly consensusService: ConsensusService  // Injecting ConsensusService for consensus operations.
    ) {
        this.chain = [this.createGenesisBlock()];  // Initialize the chain with the genesis block.
        this.pendingTransactions = [];  // Initialize with no pending transactions.
        this.difficulty = 2;  // Set the mining difficulty level.
    }

    /**
     * Creates the genesis block (the first block in the blockchain).
     * This block has no previous block and is the starting point of the blockchain.
     */
    public createGenesisBlock(): IBlock {
        return new Block(0, new Date().toISOString(), [], '0', '');  // Genesis block has no transactions and points to nothing.
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
    public createBlock(params: ParamProp) {
        try {
            const [blockData, publicKeyString] = params;
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
                this.chain.push(newBlock);  // Add the validated block to the chain.
                return { success: true, data: newBlock };  // Return the newly created block.
            } else {
                throw new Error('Invalid block');  // If the block is invalid, throw an error.
            }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };  // Return the error message if something goes wrong.
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
     * Creates a private block that only a specific user can view.
     * The data is encrypted using the user's public key to ensure privacy.
     * 
     * @param blockData The data to store in the block.
     * @param publicKeyString The public key of the user creating the block.
     * @returns The newly created private block.
     */
    public createPrivateBlock(blockData: NestedObject, publicKeyString: string): IBlock {
        const publicKey = crypto.createPublicKey(publicKeyString);  // Convert the public key string to a KeyObject.
        const user = this.accountService.getAccount(publicKeyString);  // Retrieve the user by public key.
        if (!user) throw new Error('User not found');  // Ensure the user exists.

        const encryptedData = CryptoUtils.encryptData(blockData, publicKey);  // Encrypt the data with the user's public key.
        const transaction: ITransaction = {
            processId: crypto.randomUUID(),  // Generate a unique transaction ID.
            data: encryptedData,  // Encrypted data to store in the block.
            description: 'Private Block Creation',  // Description of the block's creation.
            timestamp: new Date().toISOString(),  // Current timestamp.
            signature: user.signData(JSON.stringify(blockData)),  // User signs the block data.
        };

        const newBlock = new Block(
            this.chain.length,  // Block index based on the current length of the chain.
            new Date().toISOString(),  // Block timestamp.
            [transaction],  // The transaction included in the block.
            this.getLatestBlock().hash,  // Link the new block to the previous block in the chain.
            transaction.signature  // The signature of the transaction.
        );

        this.consensusService.mineBlock(newBlock);  // Mine the new block using the consensus mechanism.
        if (this.consensusService.validateBlock(newBlock)) {
            this.chain.push(newBlock);  // Add the validated block to the chain.
            return newBlock;  // Return the created private block.
        }

        throw new Error('Invalid block');  // If the block is invalid, throw an error.
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
    public synchronizeChain(receivedChain: Block[], accountHash: string) {
        try {
            // Check if the received chain is longer than the local chain.
            if (receivedChain.length > this.chain.length) {
                // If the chains are not aligned, validate the received chain.
                const isValid = this.consensusService.validateChain(receivedChain);
                if (isValid) {
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
}
