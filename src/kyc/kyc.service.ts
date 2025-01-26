import { Injectable } from '@nestjs/common';
import { KycDto, statusTypes } from './dto/create-kyc.dto';

@Injectable()
export class KycService {
  private kycRecords: Record<string, KycDto> = {};

  /**
   * Envía la información de KYC para su verificación.
   * @param userId - ID del usuario.
   * @param kycData - Información de KYC.
   * @returns El registro de KYC creado.
   */
  submitKyc(
    accountId: string,
    kycData: Omit<KycDto, 'accountId' | 'status' | 'createdAt' | 'updatedAt'>
  ): KycDto {

    const kycRecord: KycDto = {
      accountId,
      ...kycData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.kycRecords[accountId] = kycRecord;
    return kycRecord
  }

  /**
   * Verifica la información de KYC.
   * @param userId - ID del usuario.
   * @param status - Estado de la verificación ('approved' o 'rejected').
   * @returns El registro de KYC actualizado.
   */
  verifyKyc(userId: string, status: statusTypes): KycDto {
    const kycRecord = this.kycRecords[userId];
    if (!kycRecord) {
      throw new Error('Registro de KYC no encontrado');
    }

    kycRecord.status = status;
    kycRecord.updatedAt = new Date();
    return kycRecord;
  }

  /**
   * Obtiene el estado de KYC de un usuario.
   * @param userId - ID del usuario.
   * @returns El estado de KYC.
   */
  getKycStatus(userId: string): { status: string } {
    const kycRecord = this.kycRecords[userId];
    if (!kycRecord) {
      throw new Error('Registro de KYC no encontrado');
    }

    return { status: kycRecord.status };
  }
}
