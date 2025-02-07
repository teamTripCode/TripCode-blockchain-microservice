import { forwardRef, Module } from '@nestjs/common';
import { SmartContractsService } from './smart-contracts.service';
import { SmartContractController } from './smart-contracts.controller';
import { ChainModule } from 'src/chain/chain.module';
import { AccountModule } from 'src/account/account.module';
import { GasModule } from 'src/gas/gas.module';

@Module({
  imports: [
    forwardRef(() => AccountModule),
    forwardRef(() => ChainModule),
    forwardRef(() => GasModule),
  ],
  controllers: [SmartContractController],
  providers: [SmartContractsService],
  exports: [SmartContractsService],
})
export class SmartContractsModule { }
