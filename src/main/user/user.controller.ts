import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/CreateUserDto';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) { }

   @Get()
  async getAllUsers(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit) : undefined;
      const offsetNum = offset ? parseInt(offset) : undefined;
      
      return this.userService.findAll(search, limitNum, offsetNum);
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener usuarios',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async register(@Body() newUser: CreateUserDto) {
    try {
      console.log(newUser);
      
      return this.userService.create(newUser);
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al registrar el usuario',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


}
