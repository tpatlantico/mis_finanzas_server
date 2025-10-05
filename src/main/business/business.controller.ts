import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { JwtauthGuard } from 'src/auth/guards/JwtGuard.guard';
import { JwtPayload } from 'src/auth/models/token.model';
import CreateBusinessDto from './dto/CreateBusiness';

@UseGuards(JwtauthGuard)
@Controller('business')
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  //BUSINESS

  @Post()
  createBusiness(@Request() req, @Body() newBusiness: CreateBusinessDto) {
    const info = req.user as JwtPayload;
    return this.businessService.create(info.sub, newBusiness);
  }

  @Get()
  findUserBusinesses(@Request() req) {
    const info = req.user as JwtPayload;
    return this.businessService.findByUser(info.sub);
  }

  @Delete(':id')
  deleteBusiness(@Param('id') id: string, @Request() req) {
    const info = req.user as JwtPayload;
    return this.businessService.deleteBusiness(+id, info.sub);
  }

}
