import { ContractCondition, ContractAction } from '../entities/smart-contract.entity';

export class CreateSmartContractDto {
    creator: string; // Clave pública del creador del contrato
    conditions: ContractCondition[]; // Condiciones que deben cumplirse
    actions: ContractAction[]; // Acciones a ejecutar cuando se cumplen las condiciones
    metadata?: Record<string, any>; // Datos adicionales del contrato (opcional)
}

export class ContributeToContractDto {
    contractId: string; // ID del contrato
    participant: string; // Clave pública del participante
    amount: number; // Cantidad de Tripcoins a contribuir
    currency: string; // Nombre de la criptomoneda (por ejemplo, "tripcoin")
}

export class AddConditionDto {
    contractId: string; // ID del contrato
    condition: ContractCondition; // Nueva condición a agregar
}

export class AddActionDto {
    contractId: string; // ID del contrato
    action: ContractAction; // Nueva acción a agregar
}

export class GetContractDto {
    contractId: string; // ID del contrato
}

export interface SmartContractTransaction {
    from: string; // Clave pública del emisor (participante o creador del contrato)
    to: string; // Clave pública del destinatario (contrato o beneficiario)
    amount: number; // Cantidad de Tripcoins
    description: string; // Descripción de la transacción
    timestamp: string; // Fecha y hora de la transacción
  }