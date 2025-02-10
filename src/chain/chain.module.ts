import { forwardRef, Module } from '@nestjs/common';
import { ChainService } from './chain.service';
import { ChainController } from './chain.controller';
import { AccountModule } from 'src/account/account.module';
import { ConsensusModule } from 'src/consensus/consensus.module';
import { SmartContractsModule } from 'src/smart-contracts/smart-contracts.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GasModule } from 'src/gas/gas.module';
import { BlockModule } from 'src/block/block.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { RewardModule } from 'src/reward/reward.module';

@Module({
  imports: [
    forwardRef(() => AccountModule),
    ConsensusModule,
    PrismaModule,
    GasModule,
    BlockModule,
    TransactionModule,
    RewardModule,
  ],
  controllers: [ChainController],
  providers: [ChainService],
  exports: [ChainService]
})
export class ChainModule {}