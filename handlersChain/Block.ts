import { IBlock } from 'types/chainsType';
import * as crypto from 'crypto'
import { ITransaction } from 'src/chain/dto/create-chain.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class Block implements IBlock {
    index: number;
    timestamp: string;
    transactions: ITransaction[];
    previousHash: string;
    hash: string;
    nonce: number;
    signature: string;
    validator: string;

    /**
     * Creates a new Block.
     * @param index - The position of the block in the chain.
     * @param timestamp - The timestamp of block creation.
     * @param transactions - The list of transactions in the block.
     * @param previousHash - The hash of the previous block.
     */
    constructor(
        index: number,
        timestamp: string,
        transactions: ITransaction[],
        previousHash = '',
        signature: string
    ) {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.signature = signature;
        this.validator = '';
        this.hash = this.calculateHash()
    }

    /**
     * Calculates the hash of the block using SHA-256.
     * @returns The hash of the block.
     */
    calculateHash(): string {
        return crypto
            .createHash('sha256')
            .update(
                this.index +
                this.previousHash +
                this.timestamp +
                JSON.stringify(this.transactions) +
                this.nonce +
                this.signature
            )
            .digest('hex');
    }

    /**
     * Mines the block by finding a hash that matches the difficulty criteria.
     * @param difficulty - The number of leading zeros required in the hash.
     */
    mineBlock(difficulty: number): void {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`Block mined: ${this.hash}`);
    }

    forgeBlock(validator: string): void {
        this.validator = validator;
        this.hash = this.calculateHash();
        console.log(`Block forged by: ${validator}`);
    }
}