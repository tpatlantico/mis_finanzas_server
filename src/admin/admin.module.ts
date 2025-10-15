import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { BusinessModule } from 'src/main/business/business.module';

@Module({
  imports:[BusinessModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
