import { PartialType } from '@nestjs/mapped-types';
import { CreateGasDto } from './create-gas.dto';

export class UpdateGasDto extends PartialType(CreateGasDto) {}
