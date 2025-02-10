import {
    Body,
    Controller,
    Get,
    Post,
    UseGuards
} from '@nestjs/common';
import { ChainService } from './chain.service';
import * as crypto from 'crypto';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import {
    BodyBlock,
    NestedObject,
    SmartContractBlockData,
    RewardBlockData,
    FinancialTransactionBlock,
    FinancialTransactionBlockData,

} from './dto/create-chain.dto';
import { Block } from 'handlersChain/Block';

@Controller('chain')
@UseGuards(JwtAuthGuard)
export class ChainController {
    constructor(
        private readonly chainService: ChainService,
    ) { }

    @Get()
    getBlocksInChain() {
        try {
            const data = {
                chain: this.chainService.chain,
                length: this.chainService.chain.length,
            };
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    @Post()
    createBlock(
        @Body() payload: {
            block: BodyBlock<any>,
            currency?: string
        }
    ) {
        try {
            switch (payload.block.method) {
                case 'createBlock':
                    return this.chainService.createBlock(payload.block.params)
                case 'createSmartContractBlock':
                    return this.chainService.createBlock(payload.block.params as [SmartContractBlockData, string]);
                case 'createRewardBlock':
                    const [blockData, publicKeyString] = payload.block.params as [RewardBlockData, string];

                    const financialTransactionBlockData: FinancialTransactionBlockData = {
                        transactionType: 'payment',
                        from: blockData.from,
                        to: blockData.to,
                        amount: blockData.amount,
                        description: blockData.description,
                    }

                    return this.chainService.createBlockWithRewards(financialTransactionBlockData, publicKeyString, payload.currency);
                default:
                    throw new Error('Unsupported method');
            }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    @Post('decrypt')
    getDecryptedBlockData(@Body() payload: { blockIndex: number; publicKey: string }) {
        try {
            const publicKey = crypto.createPublicKey(payload.publicKey);
            return this.chainService.getDecryptedBlockData(payload.blockIndex, publicKey);
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    @Post('validate')
    validateChain() {
        try {
            const isValid = this.chainService.isChainValid();
            return { success: true, data: isValid };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    @Post('account')
    getAccountBlocks(@Body() payload: { publicKey: string }) {
        try {
            const blocks = this.chainService.getAccountBlocks(payload.publicKey);
            return { success: true, data: blocks };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    @Post('private')
    createPrivateBlock(@Body() payload: { blockData: NestedObject; publicKeyString: string }) {
        try {
            const newBlock = this.chainService.createPrivateBlock(payload.blockData, payload.publicKeyString);
            return { success: true, data: newBlock };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    @Post('sync')
    async synchronizeChain(
        @Body() payload: { receivedChain: Block[]; accountHash: string }
    ) {
        return this.chainService.synchronizeChain(payload.receivedChain, payload.accountHash);
    }

    // @Post('apply-rewards')
    // async applyRewardsManually(@Body() payload: { from: string, to: string; amount: number, tokenId: string }) {
    //     const { from, to, amount, tokenId } = payload;
    //     return this.chainService.applyAutoScalableRewards(from, to, amount, tokenId);
    // }

    @Post('token_id')
    async getTokenIdByPublicKey(
        @Body() payload: { publicKeyString: string }
    ) { return this.chainService.getTokenIdByPublicKey(payload.publicKeyString) }
}