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
  BlocksInChain() {
    try {
      const chains = {
        chain: this.chainService.chain,
        length: this.chainService.chain.length,
      }

      return { success: true, data: chains }
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message }
      }
    }
  }

  @MessagePattern({ cmd: 'createBlock' })
  createBlock(
    @Payload() payload: BodyBlock
  ) {
    console.log(payload)
    switch (payload.method) {
      case 'createBlock': {
        return this.chainService.createBlock(payload.params)
      }
      default:
        return { success: false, error: 'Unsupported method' }
    }
  }

  @MessagePattern({ cmd: 'decryptDataInBlock' })
  getDataInBlock(
    @Payload() payload: { blockIndex: number, publicKey: crypto.KeyObject },
  ) {
    return this.chainService.getDecryptedBlockData(payload.blockIndex, payload.publicKey)
  }
}
