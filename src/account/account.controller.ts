import { Controller, Get, Param, Post } from '@nestjs/common';
import { AccountService } from './account.service';
import { Payload, MessagePattern } from '@nestjs/microservices';
import { CreateAccountDto } from './dto/create-account.dto';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  @Get()
  GetAllAccounts() {
    return this.accountService.getAllAccounts();
  }

  @Post()
  CreateAccount(@Payload() payload: CreateAccountDto) {
    return this.accountService.createAccount(payload)
  }


  @Get(':hash')
  BlocksByAccount(@Param('hash') hash: string ) {
    return this.accountService.blocksByAccount(hash);
  }
}
