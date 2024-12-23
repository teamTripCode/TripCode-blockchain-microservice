import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChainModule } from './chain/chain.module';
import { AccountModule } from './account/account.module';

@Module({
  imports: [ChainModule, AccountModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
