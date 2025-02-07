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
   * Valida un bloque según el algoritmo de consenso (en este caso, PoW o PoS).
   * @param block - El bloque a validar.
   * @returns {boolean} True si el bloque es válido, de lo contrario false.
   */
  validateBlock(block: Block): boolean {
    console.log('Validando bloque con hash:', block.hash);

    if (this.consensusAlgorithm === 'PoW') {
      const isValid = block.hash.startsWith('0'.repeat(this.difficulty));
      console.log(`PoW validation: ${isValid ? 'Bloque válido' : 'Bloque inválido'}`);
      return isValid;
    }

    if (this.consensusAlgorithm === 'PoS') {
      const isValidPoS = this.validatePoSBlock(block);
      console.log(`PoS validation: ${isValidPoS ? 'Bloque válido' : 'Bloque inválido'}`);
      return isValidPoS;
    }

    return true;
  }

  /**
   * Realiza el trabajo de minería para encontrar un hash válido.
   * @param block - El bloque a minar.
   */
  mineBlock(block: Block): void {
    console.log('Algoritmo de consenso:', this.consensusAlgorithm);

    if (this.consensusAlgorithm === 'PoW') {
      console.log('Iniciando minería para el bloque...');
      while (!this.validateBlock(block)) {
        block.nonce++;
        block.hash = block.calculateHash();
        console.log(`Intento de hash: ${block.hash}, nonce: ${block.nonce}`);
      }
      console.log(`Bloque minado: ${block.hash}`);
    }

    if (this.consensusAlgorithm === 'PoS') {
      console.log('Iniciando minería PoS...');
      const validator = this.selectValidator();
      if (!validator) {
        console.log('No hay validadores disponibles');
        throw new Error('No validators available');
      }
      block.forgeBlock(validator);
      console.log(`Bloque forjado por el validador: ${validator}`);
    }
  }

  /**
   * Verifica si la cadena recibida cumple con las reglas de consenso.
   * @param chain - La cadena completa para verificar.
   * @returns {boolean} True si la cadena es válida, de lo contrario false.
   */
  validateChain(chain: Block[]): boolean {
    console.log('Validando la cadena de bloques...');

    if (this.consensusAlgorithm === 'PoW') {
      for (let i = 1; i < chain.length; i++) {
        const currentBlock = chain[i];
        const previousBlock = chain[i - 1];
        console.log(`Validando bloque ${i}: ${currentBlock.hash} con el bloque anterior ${previousBlock.hash}`);
        if (currentBlock.previousHash !== previousBlock.hash || !this.validateBlock(currentBlock)) {
          console.log('Cadena inválida detectada.');
          return false;
        }
      }
    }
    console.log('Cadena válida.');
    return true;
  }

  /**
   * Nuevo: Selecciona un validador basado en su stake.
   */
  private selectValidator(): string {
    console.log('Seleccionando validador...');

    const accounts = Object.values(this.accountService.users);
    const validators = accounts.filter(user => user.getBalance('tripcoin') >= this.minStake);
    console.log(`Validadores disponibles: ${validators.length}`);

    if (validators.length === 0) return '';

    // Algoritmo de selección proporcional al stake
    const totalStake = validators.reduce((sum, user) => sum + user.getBalance('tripcoin'), 0);
    const random = Math.random() * totalStake;

    let cumulative = 0;
    for (const user of validators) {
      cumulative += user.getBalance('tripcoin');
      if (random <= cumulative) {
        console.log(`Validador seleccionado: ${user.publicKey.export({ type: 'spki', format: 'pem' }).toString()}`);
        return user.publicKey.export({ type: 'spki', format: 'pem' }).toString();
      }
    }
    return '';
  }

  /**
   * Nuevo: Lógica de validación para PoS.
   */
  private validatePoSBlock(block: Block): boolean {
    console.log(`Validando bloque PoS con validador ${block.validator}...`);

    if (!block.validator) return false;

    const validator = this.accountService.users[block.validator];
    const isValid = !!validator && validator.getBalance('tripcoin') >= this.minStake && block.hash === block.calculateHash();
    console.log(`PoS Block validation result: ${isValid ? 'Válido' : 'Inválido'}`);

    return isValid;
  }
}
