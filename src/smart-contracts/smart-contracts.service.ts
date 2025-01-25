import { ForbiddenException, Injectable } from '@nestjs/common';
import { ContractAction, ContractCondition, SmartContract } from './entities/smart-contract.entity';
import { AccountService } from 'src/account/account.service';
import { ChainService } from 'src/chain/chain.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class SmartContractsService {
  private contracts: SmartContract[] = [];
  private tokens: Record<string, {
    creator: string;
    name: string;
    initialValue: number;
    maxSupply: number;
    currentSupply: number;
  }> = {};

  constructor(
    private readonly accountService: AccountService,
    private readonly chain: ChainService,
  ) { }

  /**
   * Crea un nuevo contrato inteligente.
   * @param creator - Clave pública del creador del contrato.
   * @param conditions - Condiciones que deben cumplirse.
   * @param actions - Acciones a ejecutar cuando se cumplen las condiciones.
   * @param metadata - Datos adicionales del contrato.
   * @returns El contrato creado.
   */
  createContract(
    creator: string,
    conditions: ContractCondition[],
    actions: ContractAction[],
    metadata: Record<string, any> = {},
  ): SmartContract {
    const newContract = new SmartContract(creator, conditions, actions, metadata);
    this.contracts.push(newContract);
    return newContract;
  }

  /**
   * Permite a un participante contribuir al contrato con una criptomoneda específica.
   * @param contractId - ID del contrato.
   * @param participant - Clave pública del participante.
   * @param amount - Cantidad de la criptomoneda a contribuir.
   * @param currency - Nombre de la criptomoneda (por ejemplo, "tripcoin").
   * @returns Verdadero si la contribución fue exitosa.
   */
  contributeToContract(contractId: string, participant: string, amount: number, currency: string): boolean {
    const contract = this.contracts.find((c) => c.id === contractId);
    if (!contract || contract.isClosed) {
      throw new Error('Contrato no encontrado o ya cerrado');
    }

    const user = this.accountService.getAccount(participant);
    if (!user || user.getBalance(currency) < amount) {
      throw new Error('El participante no tiene suficientes fondos en la criptomoneda especificada');
    }

    // Transfiere los fondos al contrato
    user.updateBalance(currency, -amount);
    contract.balance += amount;
    contract.participants.push(participant);

    // Registra la transacción en la cadena
    this.chain.createBlock([
      {
        from: participant,
        to: contractId,
        amount,
        currency, // Especifica la criptomoneda
        description: `Contribución a contrato inteligente en ${currency}`,
      },
      user.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    ]);

    // Verifica las condiciones y ejecuta las acciones si se cumplen
    this.checkConditions(contract);
    return true;
  }

  /**
   * Crea una nueva criptomoneda personalizada para un negocio.
   * @param creator - Clave pública del creador del token.
   * @param name - Nombre de la criptomoneda.
   * @param initialValue - Valor inicial de la criptomoneda en pesos colombianos.
   * @param maxSupply - Cantidad máxima de tokens que se pueden emitir.
   * @returns El token creado.
   */
  createToken(
    creator: string,
    name: string,
    initialValue: number,
    maxSupply: number
  ): {
    tokenId: string;
    name: string;
    initialValue: number;
    maxSupply: number
  } {
    const tokenId = uuid(); // Genera un ID único para el token

    // Verifica que el creador tenga una cuenta válida
    const creatorAccount = this.accountService.getAccount(creator);
    if (!creatorAccount) {
      throw new Error('El creador no tiene una cuenta válida');
    }

    // Crea el token y lo almacena
    this.tokens[tokenId] = {
      creator,
      name,
      initialValue,
      maxSupply,
      currentSupply: 0,
    };

    return {
      tokenId,
      name,
      initialValue,
      maxSupply,
    };
  }

  /**
  * Emite nuevos tokens de una criptomoneda personalizada.
  * @param tokenId - ID del token.
  * @param amount - Cantidad de tokens a emitir.
  * @param recipient - Clave pública del destinatario de los tokens.
  * @returns Verdadero si la emisión fue exitosa.
  */
  mintToken(tokenId: string, amount: number, recipient: string): boolean {
    const token = this.tokens[tokenId];
    if (!token) {
      throw new Error('Token no encontrado');
    }

    // Verifica que el creador del token sea quien está emitiendo los tokens
    const creatorAccount = this.accountService.getAccount(token.creator);
    if (!creatorAccount) {
      throw new Error('El creador del token no tiene una cuenta válida');
    }

    // Verifica que no se exceda el suministro máximo
    if (token.currentSupply + amount > token.maxSupply) {
      throw new Error('No se pueden emitir más tokens: se excede el suministro máximo');
    }

    // Actualiza el suministro actual
    token.currentSupply += amount;

    // Transfiere los tokens al destinatario
    const recipientAccount = this.accountService.getAccount(recipient);
    if (!recipientAccount) {
      throw new Error('El destinatario no tiene una cuenta válida');
    }
    recipientAccount.updateBalance(token.name, amount);

    // Registra la transacción en la cadena
    this.chain.createBlock([
      {
        from: token.creator,
        to: recipient,
        amount,
        currency: token.name,
        description: `Emisión de ${amount} ${token.name}`,
      },
      creatorAccount.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    ]);

    return true;
  }


  /**
   * Verifica las condiciones del contrato y ejecuta las acciones correspondientes.
   * @param contract - Contrato a verificar.
   */
  private checkConditions(contract: SmartContract): void {
    if (contract.isClosed) return;

    const conditionsMet = contract.conditions.every((condition) => condition(contract));
    if (conditionsMet) {
      contract.actions.forEach((action) => action(contract));
      contract.isClosed = true;
    }
  }

  /**
   * Obtiene un contrato por su ID.
   * @param contractId - ID del contrato.
   * @returns El contrato encontrado.
   */
  getContract(contractId: string): SmartContract {
    const contract = this.contracts.find((c) => c.id === contractId);
    if (!contract) {
      throw new Error('Contrato no encontrado');
    }
    return contract;
  }

  /**
   * Agrega una nueva condición a un contrato existente.
   * @param contractId - ID del contrato.
   * @param condition - Nueva condición a agregar.
   * @param creator - Clave pública del creador del contrato.
   * @throws ForbiddenException Si el creador no coincide con el creador del contrato.
   */
  addCondition(contractId: string, condition: ContractCondition, creator: string): void {
    const contract = this.getContract(contractId);

    // Verificar que el creador del contrato sea el mismo que intenta agregar la condición
    if (contract.creator !== creator) {
      throw new ForbiddenException('Solo el creador del contrato puede agregar condiciones');
    }

    contract.conditions.push(condition);
    this.checkConditions(contract);
  }

  /**
   * Agrega una nueva acción a un contrato existente.
   * @param contractId - ID del contrato.
   * @param action - Nueva acción a agregar.
   * @param creator - Clave pública del creador del contrato.
   * @throws ForbiddenException Si el creador no coincide con el creador del contrato.
   */
  addAction(contractId: string, action: ContractAction, creator: string): void {
    const contract = this.getContract(contractId);

    // Verificar que el creador del contrato sea el mismo que intenta agregar la acción
    if (contract.creator !== creator) {
      throw new ForbiddenException('Solo el creador del contrato puede agregar acciones');
    }

    contract.actions.push(action);
    this.checkConditions(contract);
  }
}