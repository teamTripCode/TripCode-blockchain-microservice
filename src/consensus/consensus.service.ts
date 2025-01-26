import { Injectable } from '@nestjs/common';
import { Block } from 'handlersChain/Block';
import { AccountService } from 'src/account/account.service';

@Injectable()
export class ConsensusService {
  private readonly difficulty: number = 2; // Configuración de dificultad para PoW (ajustable)
  private readonly consensusAlgorithm: 'PoW' | 'PoS' = 'PoS'
  private readonly minStake: number = 1000;

  constructor(
    private readonly accountService: AccountService
  ) { }

  /**
   * Valida un bloque según el algoritmo de consenso (en este caso, PoW).
   * @param block - El bloque a validar.
   * @returns {boolean} True si el bloque es válido, de lo contrario false.
   */
  validateBlock(block: Block): boolean {
    if (this.consensusAlgorithm === 'PoW') {
      return block.hash.startsWith('0'.repeat(this.difficulty));
    }

    if (this.consensusAlgorithm === 'PoS') {
      return this.validatePoSBlock(block);
    }

    return true;
  }

  /**
   * Realiza el trabajo de minería para encontrar un hash válido.
   * @param block - El bloque a minar.
   */
  mineBlock(block: Block): void {
    if (this.consensusAlgorithm === 'PoW') {
      while (!this.validateBlock(block)) {
        block.nonce++;
        block.hash = block.calculateHash();
      }
      console.log(`Block mined: ${block.hash}`);
    }

    if (this.consensusAlgorithm === 'PoS') {
      const validator = this.selectValidator();
      if (!validator) throw new Error('No validators available');
      block.forgeBlock(validator)
    }
  }

  /**
   * Verifica si la cadena recibida cumple con las reglas de consenso.
   * @param chain - La cadena completa para verificar.
   * @returns {boolean} True si la cadena es válida, de lo contrario false.
   */
  validateChain(chain: Block[]): boolean {
    if (this.consensusAlgorithm === 'PoW') {
      for (let i = 1; i < chain.length; i++) {
        const currentBlock = chain[i];
        const previousBlock = chain[i - 1];
        if (currentBlock.previousHash !== previousBlock.hash || !this.validateBlock(currentBlock)) {
          return false;
        }
      }
    }
    // Reglas para otros algoritmos de consenso
    return true;
  }

  /**
   * Nuevo: Selecciona un validador basado en su stake
   */
  private selectValidator(): string {
    const accounts = Object.values(this.accountService.users);
    const validators = accounts.filter(user => user.getBalance('tripcoin') >= this.minStake);

    if (validators.length === 0) return '';

    // Algoritmo de selección proporcional al stake
    const totalStake = validators.reduce((sum, user) => sum + user.getBalance('tripcoin'), 0);
    const random = Math.random() * totalStake;

    let cumulative = 0;
    for (const user of validators) {
      cumulative += user.getBalance('tripcoin');
      if (random <= cumulative) {
        return user.publicKey.export({ type: 'spki', format: 'pem' }).toString();
      }
    }
    return '';
  }

  /**
   * Nuevo: Lógica de validación para PoS
   */
  private validatePoSBlock(block: Block): boolean {
    if (!block.validator) return false;

    const validator = this.accountService.users[block.validator];
    return !!validator && validator.getBalance('tripcoin') >= this.minStake && block.hash === block.calculateHash();
  }
}
