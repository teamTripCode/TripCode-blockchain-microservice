import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ChainService } from 'src/chain/chain.service';
import { User } from 'handlersChain/User';
import { CreateAccountDto } from './dto/create-account.dto';
import { CryptoUtils } from 'handlersChain/CryptoUtils';

@Injectable()
export class AccountService {
  public users: Record<string, User> = {}  // A record of all users with account hash as the key.

  constructor(
    @Inject(forwardRef(() => ChainService))
    private blockchain: ChainService  // Injecting the blockchain service to manage blocks and transactions.
  ) { }

  /**
   * Retrieves all accounts with their details.
   * 
   * @returns A success message with the list of accounts and their details.
   */
  getAllAccounts() {
    try {
      const accountCount = Object.keys(this.users).length;

      const accounts = Object.values(this.users).map(user => ({
        accountHash: user.accountHash,  // Unique hash of the user account.
        name: user.name,  // User's name.
        email: user.email,  // User's email.
        publicKey: user.getAccountData().publicKey,  // The user's public key in PEM format.
      }));

      return {
        success: true,
        data: {
          count: accountCount,
          accounts
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };  // Return error message if caught.
      }
    }
  }

  /**
   * Creates a new user account with the provided details.
   * 
   * @param data Data needed to create an account, including name and email.
   * @returns A success message with account details if creation is successful, otherwise an error message.
   */
  createAccount(data: CreateAccountDto) {
    try {
      if (!data.name || !data.email) {
        throw new Error('Name and email are required to create an account');  // Throw an error if name or email are missing.
      }

      const user = new User(data.name, data.email);  // Create a new user instance.

      this.users[user.accountHash] = user;  // Store the user in the users' record.

      const accountData = user.getAccountData();  // Retrieve the user's account data.

      return {
        message: 'Account created successfully',
        accountHash: user.accountHash,
        publicKey: accountData.publicKey,  // Return public key in PEM format.
        name: user.name,
        email: user.email,
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message
        };  // Return error message if caught.
      }
    }
  }

  /**
   * Retrieves all blocks created by a specific user based on their account hash.
   * 
   * @param accountHash Unique hash of the user's account.
   * @returns A list of blocks created by the user, along with additional details.
   */
  blocksByAccount(accountHash: string) {
    try {
      const user = this.users[accountHash];

      if (!user) throw new Error('User not found');  // Throw an error if the user is not found.
      if (!user.validateKeyPairWithEncryption()) throw new Error('Invalid user keys');  // Ensure the user has valid keys.

      // Filter blocks where the user has a transaction in it with valid signature.
      const userBlocks = this.blockchain.chain.filter(block => {
        return block.transactions.some(tx => {
          if (!tx.signature || !tx.data) return false;  // Skip invalid transactions.

          try {
            console.log('Processing transaction:', {
              signature: tx.signature.substring(0, 20) + '...',
              dataLength: tx.data.length
            });

            // Attempt to decrypt the data.
            const decryptedData = CryptoUtils.decryptData(tx.data as string, user.privateKey);
            console.log('Successfully decrypted data type:', typeof decryptedData);

            // Prepare decrypted data for verification.
            const dataToVerify = typeof decryptedData === 'string'
              ? decryptedData
              : JSON.stringify(decryptedData);

            console.log('Data prepared for verification:', {
              length: dataToVerify.length,
              preview: dataToVerify.substring(0, 50) + '...'
            });

            // Verify the signature.
            const signatureIsValid = user.verifyData(dataToVerify, tx.signature);
            console.log('Signature verification result:', signatureIsValid);

            if (!signatureIsValid) {
              console.log('Invalid signature detected');
            }

            return signatureIsValid;

          } catch (error) {
            if (error instanceof Error) {
              console.log(error.message);
              return false;
            }
          }
        });
      });

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
      };

    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };  // Return error message if caught.
      }
    }
  }

  /**
   * Retrieves decrypted data for a specific block identified by its hash and public key.
   * 
   * @param blockHash Hash of the block to retrieve data from.
   * @param publicKey Public key to decrypt the block's data.
   * @returns The decrypted data if available, otherwise returns an error.
   */
  getDataByBlock(blockHash: string, publicKey: string) {
    try {
      // TODO: Implement logic to retrieve and decrypt data by block hash using the provided public key.
    } catch (error) {
      // Implement specific error handling as needed.
    }
  }

  /**
   * Retrieves a user account by their public key.
   * 
   * @param publicKey String representation of the user's public key.
   * @returns The user object if found, otherwise null.
   */
  getAccount(publicKey: string): User | null {
    const user = Object.values(this.users).find(user => user.publicKey.export({ type: 'spki', format: 'pem' }) === publicKey);
    return user || null;
  }
}
