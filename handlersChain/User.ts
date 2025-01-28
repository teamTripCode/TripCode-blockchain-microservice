import * as crypto from 'crypto';
import { IUser, ApiKey } from 'src/account/dto/create-account.dto';
import { CryptoUtils } from './CryptoUtils';
import { Injectable } from '@nestjs/common';

@Injectable()
export class User implements IUser {
    public privateKey: crypto.KeyObject;
    public publicKey: crypto.KeyObject;
    public accountHash: string;
    public name: string;
    public email: string;
    public balances: Record<string, number>;
    public apiKeys: ApiKey[];
    public rewardPlanEnabled: boolean;
    public gasBalance: number;
    public smartContracts: {
        contractId: string;
        businessPublicKey: string;
        tokenId: string;
        businessName: string;
        isActive: boolean
    }[];


    constructor(name: string, email: string) {
        try {
            if (!name || !email) throw new Error('Name and email are required to create a User.');

            console.log('Creating account hash...');
            this.accountHash = crypto.createHash('sha256')
                .update(name + email + Date.now().toString())
                .digest('hex');
            console.log('Account hash generated:', this.accountHash);

            this.balances = { tripcoin: 0 }; // Inicializar con Tripcoins
            this.gasBalance = 0; // Inicio de el saldo de gas en 0
            this.rewardPlanEnabled = false; // Por defecto, el plan de recompensas está desactivado
            this.apiKeys = [];

            this.name = name;
            this.email = email;

            console.log('Generating ECDSA keypair...');

            const keyPair = crypto.generateKeyPairSync('ec', {
                namedCurve: 'secp256k1',
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });

            console.log('Setting private key...');
            this.privateKey = crypto.createPrivateKey(keyPair.privateKey);

            console.log('Setting public key...');
            this.publicKey = crypto.createPublicKey(keyPair.publicKey);
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error in User constructor:', error.message);
                throw error;
            }
            console.error('Unexpected error in User constructor:', error);
            throw new Error('Failed to create user');
        }
    }

    /**
     * Añadir o actualizar el saldo de una criptomoneda.
     * @param currency - Nombre de la criptomoneda.
     * @param amount - Cantidad a añadir o restar.
     */
    public updateBalance(currency: number | string, amount: number): void {
        if (!this.balances[currency]) {
            this.balances[currency] = 0;  // Inicializar el saldo si la criptomoneda no existe.
        }
        this.balances[currency] += amount;  // Actualizar el saldo.
    }

    /**
     * Obtener el saldo de una criptomoneda específica.
     * @param currency - Nombre de la criptomoneda.
     * @returns El saldo de la criptomoneda.
     */
    public getBalance(currency: string): number {
        return this.balances[currency] || 0;  // Devolver 0 si la criptomoneda no existe.
    }

    // Firmar datos con la clave privada
    signData(data: string): string {
        try {
            const sign = crypto.createSign('SHA256');
            sign.update(data);
            sign.end();

            const signature = sign.sign(this.privateKey);
            return signature.toString('hex');
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error in signData:', error.message);
                throw error;
            }
            console.error('Unexpected error in signData:', error);
            throw new Error('Unexpected error in signData');
        }
    }

    // Verificar firma usando la clave pública
    verifyData(data: string, signature: string): boolean {
        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(data);
            verify.end();

            const isValid = verify.verify(
                this.publicKey,
                Buffer.from(signature, 'hex')
            );

            return isValid;
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error in verifyData:', error.message);
            } else {
                console.error('Unexpected error in verifyData:', error);
            }
            return false;
        }
    }

    // Obtener datos de la cuenta - retorna la clave pública en formato PEM
    getAccountData(): { publicKey: string } {
        try {
            const publicKeyPem = this.publicKey.export({
                type: 'spki',
                format: 'pem',
            }).toString();
            return {
                publicKey: publicKeyPem,
            };
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error in getAccountData:', error.message);
            } else {
                console.error('Unexpected error in getAccountData:', error);
            }
            throw new Error('Failed to get account data');
        }
    }

    // Añade un método para verificar que las claves son válidas
    public validateKeyPairWithEncryption(): boolean {
        try {
            const testData = 'test';
            const encrypted = CryptoUtils.encryptData(testData, this.publicKey);
            const decrypted = CryptoUtils.decryptData(encrypted, this.privateKey);
            return testData === decrypted;
        } catch (error) {
            console.error('Key pair encryption validation failed:', error);
            return false;
        }
    }

    /**
     * Añade una nueva API Key al usuario.
     * @param apiKey - API Key a añadir.
     * @param description - Descripción de la API Key (opcional).
     * @param expiresAt - Fecha de expiración (opcional).
     * @param permissions - Permisos asociados a la API Key.
     */
    addApiKey(apiKey: string, description?: string, expiresAt?: Date, permissions: string[] = []): void {
        const newApiKey: ApiKey = {
            key: apiKey,
            createdAt: new Date(),
            expiresAt,
            description,
            permissions,
            isActive: true,
        };
        this.apiKeys.push(newApiKey);
    }

    /**
     * Elimina una API Key del usuario.
     * @param apiKey - API Key a eliminar.
     */
    removeApiKey(apiKey: string): void {
        this.apiKeys = this.apiKeys.filter((key) => key.key !== apiKey);
    }

    /**
     * Verifica si una API Key pertenece al usuario y está activa.
     * @param apiKey - API Key a verificar.
     * @returns Verdadero si la API Key es válida y está activa.
     */
    hasApiKey(apiKey: string): boolean {
        const key = this.apiKeys.find((k) => k.key === apiKey);
        return key ? key.isActive && (!key.expiresAt || key.expiresAt > new Date()) : false;
    }

    /**
     * Desactiva una API Key.
     * @param apiKey - API Key a desactivar.
     */
    deactivateApiKey(apiKey: string): void {
        const key = this.apiKeys.find((k) => k.key === apiKey);
        if (key) {
            key.isActive = false;
        }
    }

    /**
     * Activar o desactivar el plan de recompensas.
     * @param enabled - Estado del plan (true para activar, false para desactivar).
     */
    public setRewardPlanEnabled(enabled: boolean): void {
        this.rewardPlanEnabled = enabled;
    }

    /**
     * Verificar si el plan de recompensas está activado.
     * @returns Verdadero si el plan está activado, falso en caso contrario.
     */
    public hasRewardPlanEnabled(): boolean {
        return this.rewardPlanEnabled;
    }

    /**
     * Añadir o restar gas al saldo del usuario.
     * @param amount - Cantidad de gas a añadir o restar.
     */
    public updateGasBalance(amount: number): void {
        if (this.gasBalance + amount < 0) {
            throw new Error('Saldo de gas insuficiente');
        }
        this.gasBalance += amount;
    }

    /**
     * Obtener el saldo de gas del usuario.
     * @returns El saldo de gas.
     */
    public getGasBalance(): number {
        return this.gasBalance;
    }

    /**
     * Añadir un contrato inteligente al usuario.
     * @param contractId - ID del contrato inteligente.
     * @param businessPublicKey - Clave pública del negocio asociado.
     * @param tokenId - Token ID asociado al contrato.
     * @param businessName - Nombre del negocio.
     */
    public addSmartContract(contractId: string, businessPublicKey: string, tokenId: string, businessName: string): void {
        this.smartContracts.push({
            contractId,
            businessPublicKey,
            tokenId,
            businessName,
            isActive: true, // Por defecto, el contrato está activo
        });
    }

    /**
     * Obtener el tokenId asociado a un negocio específico.
     * @param businessPublicKey - Clave pública del negocio.
     * @returns El tokenId asociado al negocio.
     * @throws Error si no se encuentra un contrato activo para el negocio.
     */
    public getTokenIdByBusinessPublicKey(businessPublicKey: string): string {
        const contract = this.smartContracts.find(
            (contract) => contract.businessPublicKey === businessPublicKey && contract.isActive
        );

        if (!contract) {
            throw new Error('No se encontró un contrato activo para la clave pública del negocio proporcionada');
        }

        return contract.tokenId;
    }
}