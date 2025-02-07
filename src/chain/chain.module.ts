import { forwardRef, Module } from '@nestjs/common';
import { ChainService } from './chain.service';
import { ChainController } from './chain.controller';
import { AccountModule } from 'src/account/account.module';
import { ConsensusModule } from 'src/consensus/consensus.module';
import { SmartContractsModule } from 'src/smart-contracts/smart-contracts.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    forwardRef(() => AccountModule),
    ConsensusModule,
    forwardRef(() => SmartContractsModule),
    PrismaModule
  ],
  controllers: [ChainController],
  providers: [ChainService],
  exports: [ChainService]
})
export class ChainModule {}