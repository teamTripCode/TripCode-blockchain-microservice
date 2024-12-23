import { forwardRef, Module } from '@nestjs/common';
import { ChainService } from './chain.service';
import { ChainController } from './chain.controller';
import { AccountModule } from 'src/account/account.module';

@Module({
  imports: [forwardRef(() => AccountModule)],
  controllers: [ChainController],
  providers: [ChainService],
  exports: [ChainService]
})
export class ChainModule {}
