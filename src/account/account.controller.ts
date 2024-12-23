import { Controller } from '@nestjs/common';
import { AccountService } from './account.service';
import { Payload, MessagePattern } from '@nestjs/microservices';
import { CreateAccountDto } from './dto/create-account.dto';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  @MessagePattern({ cmd: 'getAllAccounts' })
  GetAllAccounts() {
    return this.accountService.getAllAccounts();
  }

  @MessagePattern({ cmd: 'createAccount' })
  CreateAccount(@Payload() payload: CreateAccountDto) {
    return this.accountService.createAccount(payload)
  }

  @MessagePattern({ cmd: 'blocksByAccount' })
  BlocksByAccount(@Payload() accountHash: string ) {
    return this.accountService.blocksByAccount(accountHash)
  }
}
