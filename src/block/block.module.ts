import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BlockService } from './block.service';

@Module({
    imports: [PrismaModule],
    providers: [BlockService],
    exports: [BlockService],
})

export class BlockModule { }