import { PartialType } from '@nestjs/mapped-types';
import { KycDto } from './create-kyc.dto';

export class UpdateKycDto extends PartialType(KycDto) {}
