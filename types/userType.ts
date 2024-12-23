import crypto from 'crypto';

export interface IUser {
    publicKey: crypto.KeyObject;   // Clave pública del usuario (se comparte)
    privateKey: crypto.KeyObject;
    accountHash: string;
    name: string;
    email: string;
    signData(data: string): string;   // Método para firmar datos
    verifyData(data: string, signature: string): boolean;   // Método para verificar la firma
}