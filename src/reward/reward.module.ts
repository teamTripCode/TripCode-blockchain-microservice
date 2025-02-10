import { Module } from '@nestjs/common';
import { AccountModule } from 'src/account/account.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RewardService } from 'src/reward/reward.service';
import { SmartContractsModule } from 'src/smart-contracts/smart-contracts.module';

@Module({
    imports: [
        PrismaModule,
        AccountModule,
        SmartContractsModule,
    ],
    providers: [RewardService],
    exports: [RewardService],
})

export class RewardModule { }