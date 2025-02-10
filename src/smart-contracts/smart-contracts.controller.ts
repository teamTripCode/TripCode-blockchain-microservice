import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { SmartContractsService } from './smart-contracts.service';
import { JwtAuthGuard } from '../auth/auth.guard'; // Importa tu JwtAuthGuard
import { CreateContractDto, CreateTokenDto, TradeTokenDto } from './dto/create-smart-contract.dto';

@Controller('smart-contract')
@UseGuards(JwtAuthGuard)
export class SmartContractController {
  constructor(private readonly smartContractService: SmartContractsService) { }

  @Post('token')
  async createToken(@Body() dto: CreateTokenDto) {
    return this.smartContractService.createToken(dto);
  }

  @Post()
  async createSmartContract(@Body() dto: CreateContractDto) {
    return this.smartContractService.createSmartContract(dto);
  }

  @Post('trade')
  async tradeToken(@Body() dto: TradeTokenDto) {
    return this.smartContractService.tradeToken(dto);
  }

  @Get('token/:id')
  async getToken(@Param('id') tokenId: string) {
    return this.smartContractService.getToken(tokenId);
  }

  @Get('contract/:id')
  async getContract(@Param('id') contractId: string) {
    return this.smartContractService.getContract(contractId);
  }

  @Get('tokens/business/:businessId')
  async getTokensByBusiness(@Param('businessId') businessId: string) {
    return this.smartContractService.getTokensByBusiness(businessId);
  }
}