import { PartialType } from '@nestjs/mapped-types';
import { responseProp } from './create-auth.dto';

export class UpdateAuthDto extends PartialType(responseProp) {}
