import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ChainService } from './chain.service';
import * as crypto from 'crypto';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { BodyBlock, NestedObject, MethodsBlock, SmartContractBlockData, RewardBlockData, AuditLogBlockData, ExchangeBlockData, UserRegistrationBlockData, GovernanceBlockData, FinancialTransactionBlockData, CriticalDataBlockData } from './dto/create-chain.dto';

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
    createBlock(@Body() payload: BodyBlock<any>) {
        try {
            switch (payload.method) {
                case 'createBlock':
                    return this.chainService.createBlock(payload.params);
                case 'createSmartContractBlock':
                    return this.chainService.createBlock(payload.params as [SmartContractBlockData, string]);
                case 'createRewardBlock':
                    return this.chainService.createBlock(payload.params as [RewardBlockData, string]);
                case 'createAuditLogBlock':
                    return this.chainService.createBlock(payload.params as [AuditLogBlockData, string]);
                case 'createExchangeBlock':
                    return this.chainService.createBlock(payload.params as [ExchangeBlockData, string]);
                case 'createUserRegistrationBlock':
                    return this.chainService.createBlock(payload.params as [UserRegistrationBlockData, string]);
                case 'createGovernanceBlock':
                    return this.chainService.createBlock(payload.params as [GovernanceBlockData, string]);
                case 'createFinancialTransactionBlock':
                    return this.chainService.createBlock(payload.params as [FinancialTransactionBlockData, string]);
                case 'createCriticalDataBlock':
                    return this.chainService.createBlock(payload.params as [CriticalDataBlockData, string]);
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
}