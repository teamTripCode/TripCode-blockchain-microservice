export class KycDto {
    accountId: string;
    fullName: string; // Nombre completo
    email: string; // Correo electrónico
    documentType: string; // Tipo de documento (cédula, pasaporte, etc.)
    documentNumber: string; // Número de documento
    documentFront: string; // URL o base64 de la imagen del frente del documento
    documentBack?: string; // URL o base64 de la imagen del reverso del documento (opcional)
    selfie: string; // URL o base64 de la selfie
    status: statusTypes; // Estado de KYC
    createdAt: Date; // Fecha de creación
    updatedAt: Date; // Fecha de actualización
}

export type statusTypes = 'pending' | 'approved' | 'rejected';