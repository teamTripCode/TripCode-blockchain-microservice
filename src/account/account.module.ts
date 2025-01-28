import { forwardRef, Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SmartContractsModule } from 'src/smart-contracts/smart-contracts.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => SmartContractsModule)
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService]
})
export class AccountModule {}