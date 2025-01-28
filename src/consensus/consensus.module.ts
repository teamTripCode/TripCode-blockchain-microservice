import { Module } from '@nestjs/common';
import { ConsensusService } from './consensus.service';
import { AccountModule } from 'src/account/account.module';

@Module({
  imports: [AccountModule],
  providers: [ConsensusService],
  exports: [ConsensusService]
})
export class ConsensusModule {}
