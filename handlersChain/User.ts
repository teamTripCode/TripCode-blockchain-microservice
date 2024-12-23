import * as crypto from 'crypto';
import { IUser } from 'types/userType';
import { CryptoUtils } from './CryptoUtils';
import { Injectable } from '@nestjs/common';

@Injectable()
export class User implements IUser {
    public privateKey: crypto.KeyObject;
    public publicKey: crypto.KeyObject;
    public accountHash: string;
    public name: string;
    public email: string;

    constructor(name: string, email: string) {
        try {
            if (!name || !email) throw new Error('Name and email are required to create a User.');

            console.log('Creating account hash...');
            this.accountHash = crypto.createHash('sha256')
                .update(name + email + Date.now().toString())
                .digest('hex');
            console.log('Account hash generated:', this.accountHash);

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
            })

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

    // Firmar datos con la clave privada
    signData(data: string): string {
        try {
            //console.log('Signing data...');
            const sign = crypto.createSign('SHA256');
            sign.update(data);
            sign.end();

            const signature = sign.sign(this.privateKey);
            //console.log('Data signed successfully:', signature.toString('hex'));
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
            //console.log('Verifying signature...');
            const verify = crypto.createVerify('SHA256');
            verify.update(data);
            verify.end();

            const isValid = verify.verify(
                this.publicKey,
                Buffer.from(signature, 'hex')
            );
            //console.log('Signature verification result:', isValid);
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
            // console.log('Exporting public key in PEM format...');
            const publicKeyPem = this.publicKey.export({
                type: 'spki',
                format: 'pem',
            }).toString();
            // console.log('Public key exported:', publicKeyPem);
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
}
