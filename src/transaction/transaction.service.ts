import { Injectable } from '@nestjs/common';
import { CryptoUtils } from 'handlersChain/CryptoUtils';
import * as crypto from 'crypto';
import { BlockData, ITransaction, NestedObject } from 'src/chain/dto/create-chain.dto';

@Injectable()
export class TransactionService {
    createTransaction(
        blockData: NestedObject | BlockData,
        publicKey: crypto.KeyObject,
        description: string,
        signData: (data: string) => string,
    ): ITransaction {
        const encryptedData = CryptoUtils.encryptData(blockData, publicKey);
        return {
            processId: crypto.randomUUID(),
            data: encryptedData,
            description,
            timestamp: new Date().toISOString(),
            signature: signData(JSON.stringify(blockData)),
        };
    }
}