import { Injectable } from '@nestjs/common';
import { Block } from 'handlersChain/Block';

@Injectable()
export class ConsensusService {
  private readonly difficulty: number = 2; // Configuración de dificultad para PoW (ajustable)
  private readonly consensusAlgorithm: 'PoW' | 'PoS' = 'PoW'

  constructor() {}

  /**
   * Valida un bloque según el algoritmo de consenso (en este caso, PoW).
   * @param block - El bloque a validar.
   * @returns {boolean} True si el bloque es válido, de lo contrario false.
   */
  validateBlock(block: Block): boolean {
    if (this.consensusAlgorithm === 'PoW') {
      return block.hash.startsWith('0'.repeat(this.difficulty));
    }

    return true;
  }

  /**
   * Realiza el trabajo de minería para encontrar un hash válido.
   * @param block - El bloque a minar.
   */
  mineBlock(chain: Block): void {
    if (this.consensusAlgorithm === 'PoW') {
      while (!this.validateBlock(chain)) {
        chain.nonce++;
        chain.hash = chain.calculateHash();
      }
      console.log(`Block mined: ${chain.hash}`);
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
}
