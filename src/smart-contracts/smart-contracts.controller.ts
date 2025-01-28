import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { SmartContractsService } from './smart-contracts.service';
import { GetContractDto, AddActionDto, AddConditionDto, ContributeToContractDto, CreateSmartContractDto } from './dto/create-smart-contract.dto';
import { JwtAuthGuard } from '../auth/auth.guard'; // Importa tu JwtAuthGuard
import { User } from 'handlersChain/User';

@Controller('smart-contract')
@UseGuards(JwtAuthGuard)
export class SmartContractController {
  constructor(private readonly smartContractService: SmartContractsService) { }

  @Post('create')
  async createContract(@Body() createSmartContractDto: CreateSmartContractDto, @Request() req: { user: User }): Promise<any> {
    const creator: string = req.user.getAccountData().publicKey;

    return this.smartContractService.createContract(
      creator,
      createSmartContractDto.conditions,
      createSmartContractDto.actions,
      createSmartContractDto.metadata,
    );
  }

  @Post('contribute')
  async contributeToContract(@Body() contributeToContractDto: ContributeToContractDto, @Request() req: { user: User }): Promise<any> {
    const participant: string = req.user.getAccountData().publicKey; // Obtén el participante autenticado
    return this.smartContractService.contributeToContract(
      contributeToContractDto.contractId,
      participant, // Usa el participante autenticado
      contributeToContractDto.amount,
      contributeToContractDto.currency,
    );
  }

  @Post('add-condition')
  async addCondition(@Body() addConditionDto: AddConditionDto, @Request() req: { user: User }): Promise<any> {
    const creator: string = req.user.getAccountData().publicKey;
    return this.smartContractService.addCondition(
      addConditionDto.contractId,
      addConditionDto.condition,
      creator,
    );
  }

  @Post('add-action')
  async addAction(@Body() addActionDto: AddActionDto, @Request() req: { user: User }): Promise<any> {
    const creator: string = req.user.getAccountData().publicKey;
    return this.smartContractService.addAction(
      addActionDto.contractId,
      addActionDto.action,
      creator,
    );
  }

  @Get(':contractId')
  async getContract(@Param() getContractDto: GetContractDto): Promise<any> {
    return this.smartContractService.getContract(getContractDto.contractId);
  }
}