import { Module } from '@nestjs/common';
import { GasService } from './gas.service';
import { ChainModule } from 'src/chain/chain.module';
import { AccountModule } from 'src/account/account.module';
import { ConversionModule } from 'src/conversion/conversion.module';

@Module({
  providers: [GasService],
  imports: [ChainModule, AccountModule, ConversionModule],
  exports: [GasService]
})
export class GasModule {}
