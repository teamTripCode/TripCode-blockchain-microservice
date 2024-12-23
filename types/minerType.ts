/** 
 * @module types/minerType 
 */

/**
 * Interface representing a Miner in the blockchain.
 * @interface IMiner
 */
export interface IMiner {
    address: string;
    stake: number;
    delegateMining(delegatorAddress: string): void;
}
