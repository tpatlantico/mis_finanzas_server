import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports:[CommonModule],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports:[BusinessService]
})
export class BusinessModule {}
