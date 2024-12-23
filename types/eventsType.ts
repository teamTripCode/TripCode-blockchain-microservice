/** 
 * @module types/eventsType 
 */

/**
 * Enum representing different events in the Blockchain.
 * @enum {string}
 */
export enum BlockchainEvent {
    BlockMined = 'blockMined',
    TransactionCreated = 'transactionCreated',
}

/**
 * Event listener callback type.
 * @callback EventListener
 * @param data - Data passed when the event is emitted.
 */
export type EventListener = (data: any) => void;
