import { Injectable } from '@nestjs/common';
import { Block } from 'handlersChain/Block';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BlockService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async createAndSaveGenesisBlock(): Promise<Block> {
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
                accountId: 'system',
            },
        });

        return genesisBlock;
    }

    async saveBlockToPrisma(block: Block): Promise<void> {
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
                    create: transactions.map((tx) => ({
                        processId: tx.processId,
                        description: tx.description,
                        data: tx.data,
                        timestamp: new Date(tx.timestamp),
                        signature: tx.signature,
                        accountId: 'system',
                    })),
                },
            },
        });
    }

    async initializeChain(): Promise<Block[]> {
        const blocks = await this.prisma.block.findMany({
            include: {
                transactions: true,
            },
            orderBy: {
                index: 'asc',
            },
        });

        if (blocks.length === 0) {
            const genesisBlock = await this.createAndSaveGenesisBlock();
            return [genesisBlock];
        } else {
            return blocks.map((block) => {
                const transactions = block.transactions.map((tx) => ({
                    processId: tx.processId,
                    description: tx.description,
                    data: tx.data,
                    timestamp: tx.timestamp.toISOString(),
                    signature: tx.signature,
                }));

                const blockInstance = new Block(
                    block.index,
                    block.timestamp.toISOString(),
                    transactions,
                    block.previousHash,
                    block.signature,
                );

                blockInstance.hash = block.hash;
                blockInstance.nonce = block.nonce;
                blockInstance.validator = block.validator;

                return blockInstance;
            });
        }
    }
}