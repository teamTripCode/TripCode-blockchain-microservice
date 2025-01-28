import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { AccountService } from 'src/account/account.service';
import { responseProp } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly accountService: AccountService,
  ) { }

  /**
   * Valida las credenciales del usuario y genera un token JWT.
   * @param publicKey - Clave pública del usuario.
   * @returns Un objeto con la estructura { success: boolean, data?: any, error?: string }.
   */
  async validateUser(publicKey: string): Promise<responseProp> {
    try {
      // Obtener el usuario por su clave pública
      const user = await this.accountService.getAccount(publicKey);
      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      // Generar la firma automáticamente en el servidor
      const messageToSign = 'login-request';
      const signature = user.data.signData(messageToSign);

      // Verificar la firma generada
      const isValid = user.data.verifyData(messageToSign, signature);
      if (!isValid) {
        return { success: false, error: 'Firma no válida' };
      }

      // Generar el token JWT
      const payload = { publicKey };
      const token = this.jwtService.sign(payload);

      // Devolver el token en la respuesta
      return { success: true, data: token };
    } catch (error) {
      // Manejar errores inesperados
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Error inesperado durante la validación del usuario' };
    }
  }

  /**
   * Genera una API Key para el usuario.
   * @param publicKey - Clave pública del usuario.
   * @returns Un objeto con la estructura { success: boolean, data?: any, error?: string }.
   */
  async generateApiKey(publicKey: crypto.KeyObject, description?: string, expiresAt?: Date, permissions?: string[]): Promise<responseProp> {
    try {
      // Convertir la clave pública a formato PEM
      const publicKeyPem = publicKey.export({
        type: 'spki',
        format: 'pem',
      }).toString();

      console.log('Clave pública en formato PEM:', publicKeyPem); // Depuración

      const user = await this.accountService.getAccount(publicKeyPem);
      if (!user) {
        console.error('Usuario no encontrado para la publicKeyPem:', publicKeyPem); // Depuración
        return { success: false, error: 'Usuario no encontrado' };
      }

      const apiKey = crypto.randomBytes(32).toString('hex');
      user.data.addApiKey(apiKey, description, expiresAt, permissions);

      // Devolver la API Key en la respuesta
      return { success: true, data: apiKey };
    } catch (error) {
      // Manejar errores inesperados
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Error inesperado al generar la API Key' };
    }
  }

  /**
   * Valida una API Key.
   * @param apiKey - API Key a validar.
   * @returns Un objeto con la estructura { success: boolean, data?: any, error?: string }.
   */
  async validateApiKey(apiKey: string): Promise<responseProp> {
    try {
      const user = Object.values(this.accountService.users).find((u) => u.hasApiKey(apiKey));
      if (!user) {
        return { success: false, error: 'API Key no válida' };
      }

      const exportedKey = user.publicKey.export({ type: 'spki', format: 'pem' });
      const publicKey = typeof exportedKey === 'string' ? exportedKey : exportedKey.toString('utf-8');

      // Devolver la clave pública en la respuesta
      return { success: true, data: publicKey };
    } catch (error) {
      // Manejar errores inesperados
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Error inesperado al validar la API Key' };
    }
  }

  /**
   * Elimina una API Key del usuario.
   * @param publicKey - Clave pública del usuario.
   * @param apiKey - API Key a eliminar.
   * @returns Un objeto con la estructura { success: boolean, data?: any, error?: string }.
   */
  async removeApiKey(publicKey: string, apiKey: string): Promise<responseProp> {
    try {
      const user = await this.accountService.getAccount(publicKey);
      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      user.data.removeApiKey(apiKey); // Eliminar la API Key del usuario
      return { success: true, data: 'API Key eliminada correctamente' };
    } catch (error) {
      // Manejar errores inesperados
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Error inesperado al eliminar la API Key' };
    }
  }

  /**
   * Desactiva una API Key del usuario.
   * @param publicKey - Clave pública del usuario.
   * @param apiKey - API Key a desactivar.
   * @returns Un objeto con la estructura { success: boolean, data?: any, error?: string }.
   */
  async deactivateApiKey(publicKey: string, apiKey: string): Promise<responseProp> {
    try {
      const user = await this.accountService.getAccount(publicKey);
      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      user.data.deactivateApiKey(apiKey); // Desactivar la API Key del usuario
      return { success: true, data: 'API Key desactivada correctamente' };
    } catch (error) {
      // Manejar errores inesperados
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Error inesperado al desactivar la API Key' };
    }
  }
}