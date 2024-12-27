import { Controller } from '@nestjs/common';
import { ChainService } from './chain.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import * as crypto from 'crypto';

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

@Controller('chain')
export class ChainController {
    constructor(
        private readonly chainService: ChainService,
    ) { }

    @MessagePattern({ cmd: 'allBlocksInChain' })
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

    @MessagePattern({ cmd: 'createBlock' })
    createBlock(@Payload() payload: BodyBlock) {
        try {
            if (payload.method === 'createBlock') {
                return this.chainService.createBlock(payload.params);
            } else {
                throw new Error('Unsupported method');
            }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    @MessagePattern({ cmd: 'decryptDataInBlock' })
    getDecryptedBlockData(@Payload() payload: { blockIndex: number; publicKey: string }) {
        try {
            const publicKey = crypto.createPublicKey(payload.publicKey);
            return this.chainService.getDecryptedBlockData(payload.blockIndex, publicKey);
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    @MessagePattern({ cmd: 'validateChain' })
    validateChain() {
        try {
            const isValid = this.chainService.isChainValid();
            return { success: true, data: isValid };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    @MessagePattern({ cmd: 'getAccountBlocks' })
    getAccountBlocks(@Payload() payload: { publicKey: string }) {
        try {
            const blocks = this.chainService.getAccountBlocks(payload.publicKey);
            return { success: true, data: blocks };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    @MessagePattern({ cmd: 'createPrivateBlock' })
    createPrivateBlock(@Payload() payload: { blockData: NestedObject; publicKeyString: string }) {
        try {
            const newBlock = this.chainService.createPrivateBlock(payload.blockData, payload.publicKeyString);
            return { success: true, data: newBlock };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
}
