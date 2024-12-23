import { forwardRef, Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { ChainModule } from 'src/chain/chain.module';

@Module({
  imports: [forwardRef(() => ChainModule)],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService]
})
export class AccountModule {}
