import { forwardRef, Module } from '@nestjs/common';
import { GasService } from './gas.service';
import { ChainModule } from 'src/chain/chain.module';
import { AccountModule } from 'src/account/account.module';
import { ConversionModule } from 'src/conversion/conversion.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  providers: [GasService],
  imports: [
    forwardRef(() => ChainModule),
    forwardRef(() => AccountModule),
    ConversionModule,
    PrismaModule
  ],
  exports: [GasService],
})
export class GasModule { }
