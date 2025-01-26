import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycDto, statusTypes } from './dto/create-kyc.dto';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { User } from 'handlersChain/User';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private readonly kycService: KycService) { }

  @Post('submit')
  submitKyc(
    @Request() req: { user: User },
    @Body() kycData: Omit<KycDto, 'accountId' | 'status' | 'createdAt' | 'updatedAt'>,
  ): KycDto {
    const accountId = req.user.getAccountData().publicKey;
    return this.kycService.submitKyc(accountId, kycData);
  }

  @Post('verify/:accountId')
  verifyKyc(@Param('accountId') accountId: string, @Body('status') status: statusTypes): KycDto {
    return this.kycService.verifyKyc(accountId, status);
  }

  @Get('status/:accountId')
  getKycStatus(@Param('accountId') accountId: string): { status: string } {
    return this.kycService.getKycStatus(accountId);
  }
}
