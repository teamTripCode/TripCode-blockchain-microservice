import { forwardRef, Module } from '@nestjs/common';
import { ChainService } from './chain.service';
import { ChainController } from './chain.controller';
import { AccountModule } from 'src/account/account.module';
import { ConsensusModule } from 'src/consensus/consensus.module';
import { ChainGateway } from './chain.gateway';
import { ConsensusService } from 'src/consensus/consensus.service';

@Module({
  imports: [forwardRef(() => AccountModule), ConsensusModule],
  controllers: [ChainController],
  providers: [ChainService, ChainGateway],
  exports: [ChainService]
})
export class ChainModule {}
