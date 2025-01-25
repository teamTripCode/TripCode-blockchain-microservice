import crypto from 'crypto';

export interface IUser {
    publicKey: crypto.KeyObject;   // Clave pública del usuario (se comparte)
    privateKey: crypto.KeyObject;
    accountHash: string;
    name: string;
    email: string;
    gasBalance: number;   // Saldo de gas
    signData(data: string): string;   // Método para firmar datos
    verifyData(data: string, signature: string): boolean;   // Método para verificar la firma
}

export interface ApiKey {
    key: string; // La clave API en sí
    createdAt: Date; // Fecha de creación
    expiresAt?: Date; // Fecha de expiración (opcional)
    description?: string; // Descripción de la API Key (opcional)
    permissions: string[]; // Permisos asociados a la API Key
    isActive: boolean; // Indica si la API Key está activa
  }