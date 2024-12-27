import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoUtils {
    /**
     * Cifra los datos usando ECIES (Elliptic Curve Integrated Encryption Scheme)
     * @param {any} data - Los datos a cifrar.
     * @param {crypto.KeyObject} publicKey - La clave pública EC del usuario.
     * @returns {string} - Los datos cifrados en formato Base64.
     */
    static encryptData(data: any, publicKey: crypto.KeyObject): string {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);

        try {
            // Generar una clave efímera para ECDH
            const ephemeralKeyPair = crypto.createECDH('secp256k1');
            ephemeralKeyPair.generateKeys();

            // La clave pública debe estar en formato raw para ECDH
            const publicKeyRaw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-65);

            const sharedSecret = ephemeralKeyPair.computeSecret(publicKeyRaw);

            // Derivar la clave de cifrado usando HKDF
            const derivedKeyArrayBuffer = crypto.hkdfSync(
                'sha256',
                sharedSecret,
                Buffer.from('salt', 'utf8'),
                Buffer.from('encryption', 'utf8'),
                32
            );

            // Convertir el ArrayBuffer a Buffer
            const derivedKey = Buffer.from(derivedKeyArrayBuffer);

            // Generar IV y cifrar los datos
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
            const encryptedData = Buffer.concat([cipher.update(dataString, 'utf8'), cipher.final()]);

            // Obtener el tag de autenticación
            const authTag = cipher.getAuthTag();

            // Combinar todos los componentes necesarios para el descifrado
            const combined = Buffer.concat([
                ephemeralKeyPair.getPublicKey(),
                iv,
                authTag,
                encryptedData
            ]);

            return combined.toString('base64');
        } catch (error) {
            console.error('Error encrypting data:', error);
            throw new Error(`Failed to encrypt data: ${(error as Error).message}`);
        }
    }

    /**
 * Descifra los datos con la clave privada del usuario.
 * @param {string} encryptedData - Los datos cifrados en formato Base64.
 * @param {crypto.KeyObject} privateKey - La clave privada del usuario.
 * @returns {any} - Los datos descifrados.
 */
    static decryptData(encryptedData: string, privateKey: crypto.KeyObject): any {
        try {
            const buffer = Buffer.from(encryptedData, 'base64');

            // Extraer componentes del buffer
            const ephemeralPublicKey = buffer.subarray(0, 65);
            const iv = buffer.subarray(65, 81);
            const authTag = buffer.subarray(81, 97);
            const encrypted = buffer.subarray(97);

            // Crear instancia de ECDH
            const ecdh = crypto.createECDH('secp256k1');

            // Extraer clave privada en formato PEM
            const rawPrivateKey = privateKey.export({
                format: 'pem',
                type: 'pkcs8',
            });

            // Convertir clave privada PEM a formato DER y obtener últimos 32 bytes
            const privateKeyPem = rawPrivateKey.toString('utf8'); // Asegurarse de que es string
            const privateKeyBuffer = Buffer.from(
                privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, ''),
                'base64'
            ).subarray(-32);

            // Establecer clave privada en ECDH
            ecdh.setPrivateKey(privateKeyBuffer);

            // Crear clave pública efímera desde los datos extraídos
            const ephemeralPublicKeyObject = crypto.createPublicKey({
                key: Buffer.concat([
                    Buffer.from('3056301006072a8648ce3d020106052b8104000a034200', 'hex'),
                    ephemeralPublicKey,
                ]),
                format: 'der',
                type: 'spki',
            });

            // Calcular secreto compartido
            const sharedSecret = ecdh.computeSecret(
                ephemeralPublicKeyObject.export({ format: 'der', type: 'spki' }).subarray(-65)
            );

            // Derivar clave con HKDF
            const derivedKey = Buffer.from(crypto.hkdfSync(
                'sha256',
                sharedSecret,
                Buffer.from('salt', 'utf8'),
                Buffer.from('encryption', 'utf8'),
                32
            ))

            // Descifrar datos
            const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
            decipher.setAuthTag(authTag);

            let decryptedData = decipher.update(encrypted);
            decryptedData = Buffer.concat([decryptedData, decipher.final()]);

            // Intentar parsear el resultado como JSON
            const decryptedString = decryptedData.toString('utf-8');
            try {
                return JSON.parse(decryptedString);
            } catch {
                return decryptedString; // Devolver como string si no es JSON
            }
        } catch (error) {
            console.error('Error de descifrado:', error);
            if (error instanceof Error) {
                throw new Error(`Fallo al descifrar los datos: ${error.message}`);
            } else {
                throw new Error('Fallo al descifrar los datos: Error desconocido');
            }
        }
    }


}