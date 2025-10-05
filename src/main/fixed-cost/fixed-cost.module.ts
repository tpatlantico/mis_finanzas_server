import { Module } from '@nestjs/common';
import { FixedCostController } from './fixed-cost.controller';
import { FixedCostService } from './fixed-cost.service';

@Module({
  controllers: [FixedCostController],
  providers: [FixedCostService]
})
export class FixedCostModule {}
