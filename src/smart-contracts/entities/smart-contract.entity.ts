import { v4 as uuidv4 } from 'uuid';

export class SmartContract {
    id: string; // ID único del contrato
    creator: string; // Clave pública del creador del contrato
    participants: string[]; // Claves públicas de los participantes
    balance: number; // Saldo actual del contrato (en Tripcoins)
    conditions: ContractCondition[]; // Condiciones que deben cumplirse
    actions: ContractAction[]; // Acciones a ejecutar cuando se cumplen las condiciones
    metadata: Record<string, any>; // Datos adicionales del contrato
    isClosed: boolean; // Indica si el contrato está cerrado
    tokenId: string;

    constructor(
        creator: string,
        conditions: ContractCondition[],
        actions: ContractAction[],
        metadata: Record<string, any> = {},
    ) {
        this.id = uuidv4(); // Genera un ID único
        this.creator = creator;
        this.participants = [];
        this.balance = 0;
        this.conditions = conditions;
        this.actions = actions;
        this.metadata = metadata;
        this.isClosed = false;
    }
}

export type ContractCondition = (contract: SmartContract) => boolean;
export type ContractAction = (contract: SmartContract) => void;
