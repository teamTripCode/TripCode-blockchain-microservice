import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ConsensusService } from './consensus.service';
import { CreateConsensusDto } from './dto/create-consensus.dto';
import { UpdateConsensusDto } from './dto/update-consensus.dto';

@Controller('consensus')
export class ConsensusController {
  constructor(private readonly consensusService: ConsensusService) {}

}
