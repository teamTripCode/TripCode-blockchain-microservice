import { Module } from '@nestjs/common';
import { SmartContractsService } from './smart-contracts.service';
import { SmartContractController } from './smart-contracts.controller';
import { ChainModule } from 'src/chain/chain.module';
import { AccountModule } from 'src/account/account.module';

@Module({
  controllers: [SmartContractController],
  providers: [SmartContractsService],
  imports: [AccountModule, ChainModule],
})
export class SmartContractsModule {}
