import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { User } from 'handlersChain/User';
import { CreateAccountDto } from './dto/create-account.dto';
import { CryptoUtils } from 'handlersChain/CryptoUtils';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto'

@Injectable()
export class AccountService {
  public users: Record<string, User> = {}  // A record of all users with account hash as the key.

  constructor(
    private prisma: PrismaService,
    // @Inject(forwardRef(() => SmartContractsService))
    // private smartContract: SmartContractsService,
  ) { }

  /**
   * Retrieves all accounts with their details.
   * 
   * @returns A success message with the list of accounts and their details.
   */
  async getAllAccounts() {
    try {
      const accounts = await this.prisma.account.findMany({ include: { balances: true, ApiKey: true } });
      const accountCount = Object.keys(this.users).length;

      return {
        success: true,
        data: {
          count: accountCount,
          accounts: accounts.map(account => ({
            accountHash: account.accountHash,
            name: account.name,
            email: account.email,
            publicKey: account.publicKey,
            balances: account.balances,
          })),
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
  async createAccount(data: CreateAccountDto) {
    try {
      if (!data.name || !data.email) {
        throw new Error('Name and email are required to create an account');
      }

      const user = new User(data.name, data.email, this.prisma);
      this.users[user.accountHash] = user; // Almacenar el usuario

      const accountData = user.getAccountData();
      // console.log('Usuario creado:', user); // Depuración
      // console.log('Clave pública del usuario:', accountData.publicKey); // Depuración

      const newAccount = await this.prisma.account.create({
        data: {
          accountHash: user.accountHash,
          name: user.name,
          email: user.email,
          publicKey: accountData.publicKey,
          privateKey: user.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
          balances: {
            create: [
              {
                currency: 'tripcoin',
                amount: '0'
              }
            ]
          },
        },
        include: { balances: true }
      })

      // console.log('Usuario creado:', newAccount); // Depuración
      // console.log('Clave pública del usuario:', accountData.publicKey); // Depuración

      return {
        success: true,
        data: newAccount
      };

    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }
    }
  }

  /**
   * Retrieves all blocks created by a specific user based on their account hash.
   * 
   * @param accountHash Unique hash of the user's account.
   * @returns A list of blocks created by the user, along with additional details.
   */
  async blocksByAccount(accountHash: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { accountHash },
        include: { Block: { include: { transactions: true } } },
      });

      if (!account) throw new Error('User not found');

      const user = new User(account.name, account.email);
      user.privateKey = crypto.createPrivateKey(account.privateKey);
      user.publicKey = crypto.createPublicKey(account.publicKey);

      if (!user.validateKeyPairWithEncryption()) throw new Error('Invalid user keys');

      const userBlocks = account.Block.filter(block => {
        return block.transactions.some(tx => {
          if (!tx.signature || !tx.data) return false;

          try {
            const decryptedData = CryptoUtils.decryptData(tx.data, user.privateKey);
            const dataToVerify = typeof decryptedData === 'string'
              ? decryptedData
              : JSON.stringify(decryptedData);

            const signatureIsValid = user.verifyData(dataToVerify, tx.signature);
            return signatureIsValid;
          } catch (error) {
            console.error('Error verifying transaction:', error);
            return false;
          }
        });
      });

      return {
        success: true,
        data: {
          blocks: userBlocks,
          userAccountHash: account.accountHash,
          totalBlocks: userBlocks.length,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
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
   * @param publicKeyPem String representation of the user's public key.
   * @returns The user object if found, otherwise null.
   */
  async getAccount(publicKeyPem: string) {
    try {
      const account = await this.prisma.account.findFirst({
        where: { publicKey: publicKeyPem },
        include: { balances: true }
      });

      if (!account) return null;

      const user = new User(account.name, account.email);
      user.privateKey = crypto.createPrivateKey(account.privateKey);
      user.publicKey = crypto.createPublicKey(account.publicKey);
      user.rewardPlanEnabled = account.rewardPlanEnabled;
      user.isBusinessAccount = account.isBusinessAccount;

      // Asignar los balances
      const tripcoinBalance = account.balances.find(balance => balance.currency === 'tripcoin');
      if (tripcoinBalance) {
        // Si encontramos el balance de tripcoin, lo asignamos a la instancia de User
        user.balances = {
          tripcoin: Number(tripcoinBalance.amount)
        };
      }

      return { success: true, data: { user, accountId: account.id } };
    } catch (error) {
      console.error('Error finding account:', error);
      return null;
    }
  }

  /**
   * Actualizar el saldo de una criptomoneda específica.
   * @param accountHash - Hash de la cuenta.
   * @param currency - Nombre de la criptomoneda.
   * @param amount - Cantidad a añadir o restar.
   */
  async updateBalance(accountHash: string, currency: string, amount: number) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { accountHash },
        include: { balances: true },
      });

      if (!account) throw new Error('User not found');

      const balance = account.balances.find(b => b.currency === currency);
      if (!balance) {
        await this.prisma.balance.create({
          data: {
            currency,
            amount: amount.toString(),
            accountId: account.id,
          },
        });
      } else {
        const newAmount = parseFloat(balance.amount) + amount;
        await this.prisma.balance.update({
          where: { id: balance.id },
          data: { amount: newAmount.toString() },
        });
      }
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  }

  /**
   * Verificar el saldo de una criptomoneda específica.
   * @param accountHash - Hash de la cuenta.
   * @param currency - Nombre de la criptomoneda.
   * @returns El saldo de la criptomoneda.
   */
  async getBalance(accountHash: string, currency: string): Promise<number> {
    try {
      const account = await this.prisma.account.findUnique({
        where: { accountHash },
        include: { balances: true },
      });

      if (!account) throw new Error('User not found');

      const balance = account.balances.find(b => b.currency === currency);
      return balance ? parseFloat(balance.amount) : 0;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Verificar si el plan de recompensas está activado para una cuenta.
   * @param accountHash - Hash de la cuenta.
   * @returns Verdadero si el plan está activado, falso en caso contrario.
   */
  async hasRewardPlanEnabled(accountHash: string): Promise<boolean> {
    try {
      const account = await this.prisma.account.findUnique({
        where: { accountHash },
      });

      if (!account) throw new Error('Usuario no encontrado');

      return account.rewardPlanEnabled; // Devuelve el estado del plan de recompensas.
    } catch (error) {
      console.error('Error verificando el plan de recompensas:', error);
      throw error;
    }
  }

  /**
   * Activar o desactivar el plan de recompensas para una cuenta.
   * @param accountHash - Hash de la cuenta.
   * @param enabled - Estado del plan (true para activar, false para desactivar).
   */
  async setRewardPlanEnabled(accountHash: string, enabled: boolean): Promise<void> {
    try {
      const account = await this.prisma.account.findUnique({
        where: { accountHash },
      });

      if (!account) throw new Error('Usuario no encontrado');

      await this.prisma.account.update({
        where: { accountHash },
        data: { rewardPlanEnabled: enabled },
      });
    } catch (error) {
      console.error('Error actualizando el estado del plan de recompensas:', error);
      throw error;
    }
  }

}
