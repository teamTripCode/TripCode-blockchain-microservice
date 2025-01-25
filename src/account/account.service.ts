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
        balances: user.balances, // Saldos de todas las criptomonedas.
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
        throw new Error('Name and email are required to create an account');
      }

      const user = new User(data.name, data.email);
      this.users[user.accountHash] = user; // Almacenar el usuario

      const accountData = user.getAccountData();
      console.log('Usuario creado:', user); // Depuración
      console.log('Clave pública del usuario:', accountData.publicKey); // Depuración

      return {
        message: 'Account created successfully',
        accountHash: user.accountHash,
        publicKey: accountData.publicKey,
        name: user.name,
        email: user.email,
        balances: user.balances,
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
  getAccount(publicKeyPem: string): User | null {
    console.log('Buscando usuario con publicKeyPem:', publicKeyPem); // Depuración
    const user = Object.values(this.users).find(user => {
      const userPublicKeyPem = user.publicKey.export({
        type: 'spki',
        format: 'pem',
      }).toString();
      console.log('Clave pública del usuario:', userPublicKeyPem); // Depuración
      return userPublicKeyPem === publicKeyPem;
    });
    if (!user) {
      console.error('Usuario no encontrado para la publicKeyPem:', publicKeyPem); // Depuración
    }
    return user || null;
  }

  /**
   * Actualizar el saldo de una criptomoneda específica.
   * @param accountHash - Hash de la cuenta.
   * @param currency - Nombre de la criptomoneda.
   * @param amount - Cantidad a añadir o restar.
   */
  public updateBalance(accountHash: string, currency: string, amount: number): void {
    const user = this.users[accountHash];
    if (!user) throw new Error('Usuario no encontrado');

    user.updateBalance(currency, amount);  // Actualizar el saldo.
  }

  /**
   * Verificar el saldo de una criptomoneda específica.
   * @param accountHash - Hash de la cuenta.
   * @param currency - Nombre de la criptomoneda.
   * @returns El saldo de la criptomoneda.
   */
  public getBalance(accountHash: string, currency: string): number {
    const user = this.users[accountHash];
    if (!user) throw new Error('Usuario no encontrado');

    return user.getBalance(currency) || 0;  // Devolver 0 si la criptomoneda no existe.
  }

  /**
   * Calcula las recompensas auto-escalables para el cliente, el dueño del negocio y la plataforma.
   * @param amount - Valor de la transacción en USD.
   * @returns Un objeto con las recompensas para cada participante.
   */
  calculateAutoScalableRewards(amount: number): { clientReward: number; ownerReward: number; platformReward: number } {
    // Definir tasas base y factores de escala
    const baseClientRate = 0.01; // 1% base para el cliente
    const baseOwnerRate = 0.005; // 0.5% base para el dueño del negocio
    const basePlatformRate = 0.005; // 0.5% base para la plataforma

    // Función para calcular la tasa escalada
    const calculateScaledRate = (baseRate: number, amount: number): number => {
      // Usamos una función logarítmica para suavizar el crecimiento de la tasa
      return baseRate * Math.log1p(amount); // log1p(x) = ln(1 + x)
    };

    // Calcular las tasas escaladas
    const clientRate = calculateScaledRate(baseClientRate, amount);
    const ownerRate = calculateScaledRate(baseOwnerRate, amount);
    const platformRate = calculateScaledRate(basePlatformRate, amount);

    // Calcular las recompensas
    const clientReward = amount * clientRate;
    const ownerReward = amount * ownerRate;
    const platformReward = amount * platformRate;

    return { clientReward, ownerReward, platformReward };
  }

  /**
   * Verificar si el plan de recompensas está activado para una cuenta.
   * @param accountHash - Hash de la cuenta.
   * @returns Verdadero si el plan está activado, falso en caso contrario.
   */
  public hasRewardPlanEnabled(accountHash: string): boolean {
    const user = this.users[accountHash];
    if (!user) throw new Error('Usuario no encontrado');

    return user.hasRewardPlanEnabled();  // Verificar el estado del plan de recompensas.
  }

  /**
   * Activar o desactivar el plan de recompensas para una cuenta.
   * @param accountHash - Hash de la cuenta.
   * @param enabled - Estado del plan (true para activar, false para desactivar).
   */
  public setRewardPlanEnabled(accountHash: string, enabled: boolean): void {
    const user = this.users[accountHash];
    if (!user) throw new Error('Usuario no encontrado');

    user.setRewardPlanEnabled(enabled);  // Actualizar el estado del plan de recompensas.
  }
}
