import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChainModule } from './chain/chain.module';
import { AccountModule } from './account/account.module';
import { ConsensusModule } from './consensus/consensus.module';
import { SmartContractsModule } from './smart-contracts/smart-contracts.module';
import { AuthModule } from './auth/auth.module';
import { GasModule } from './gas/gas.module';
import { ConversionModule } from './conversion/conversion.module';
import { ConfigModule } from '@nestjs/config';
import { KycModule } from './kyc/kyc.module';
import { PrismaModule } from './prisma/prisma.module';
import { ChainGatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ChainModule,
    AccountModule,
    ConsensusModule,
    SmartContractsModule,
    AuthModule,
    GasModule,
    ConversionModule,
    KycModule,
    PrismaModule,
    ChainGatewayModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
