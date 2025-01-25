import { Module } from '@nestjs/common';
import { ConversionService } from './conversion.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [ConversionService],
  exports: [ConversionService],
})

export class ConversionModule {}
