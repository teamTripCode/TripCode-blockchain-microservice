import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ChainService } from 'src/chain/chain.service';
import { User } from 'handlersChain/User';
import { CreateAccountDto } from './dto/create-account.dto';
import { CryptoUtils } from 'handlersChain/CryptoUtils';

@Injectable()
export class AccountService {
  public users: Record<string, User> = {}

  constructor(
    @Inject(forwardRef(() => ChainService))
    private blockchain: ChainService
  ) { }

  getAllAccounts() {
    try {
      const accountCount = Object.keys(this.users).length;

      const accounts = Object.values(this.users).map(user => ({
        accountHash: user.accountHash,
        name: user.name,
        email: user.email,
        publicKey: user.getAccountData().publicKey,
      }))

      return {
        success: true,
        data: {
          count: accountCount,
          accounts
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message }
      }
    }
  }

  createAccount(data: CreateAccountDto) {
    console.log(data)
    try {
      if (!data.name || !data.email) {
        throw new Error('Name and email are required to create an account')
      }

      const user = new User(data.name, data.email);

      this.users[user.accountHash] = user;

      const accountData = user.getAccountData();

      return {
        message: 'Account created successfully',
        accountHash: user.accountHash,
        publicKey: accountData.publicKey, // This will be the PEM format string
        name: user.name,
        email: user.email,
      }
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message
        }
      }
    }
  }

  blocksByAccount(accountHash: string) {
    try {
      const user = this.users[accountHash]

      if (!user) throw new Error('User not found');
      if (!user.validateKeyPairWithEncryption()) throw new Error('Invalid user keys');

      const userBlocks = this.blockchain.chain.filter(block => {
        return block.transactions.some(tx => {
          if (!tx.signature || !tx.data) return false

          try {
            console.log('Processing transaction:', {
              signature: tx.signature.substring(0, 20) + '...',
              dataLength: tx.data.length
            });

            // Intenta descifrar los datos
            const decryptedData = CryptoUtils.decryptData(tx.data as string, user.privateKey)
            console.log('Successfully decrypted data type:', typeof decryptedData);

            // Asegúrate de que los datos descifrados sean una cadena válida
            const dataToVerify = typeof decryptedData === 'string'
              ? decryptedData
              : JSON.stringify(decryptedData);

            console.log('Data prepared for verification:', {
              length: dataToVerify.length,
              preview: dataToVerify.substring(0, 50) + '...'
            });

            // Verifica la firma
            const signatureIsValid = user.verifyData(dataToVerify, tx.signature);
            console.log('Signature verification result:', signatureIsValid);

            if (!signatureIsValid) {
              console.log('Invalid signature detected');
            }

            return signatureIsValid

          } catch (error) {
            if (error instanceof Error) {
              console.log(error.message)
              return false
            }
          }
        })
      })

      console.log('Found blocks:', {
        totalBlocks: userBlocks.length,
        blockHashes: userBlocks.map(block => block.hash.substring(0, 10) + '...')
      });

      return {
        success: true, data: {
          blocks: userBlocks,
          userAccountHash: user.accountHash,
          totalBlocks: userBlocks.length
        }
      }

    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message }
      }
    }
  }

  getDataByBlock(blovkHash: string, publicKey: string) {
    try {

    } catch (error) {
      
    }
  }
}
