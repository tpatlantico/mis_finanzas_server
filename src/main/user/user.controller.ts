import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/CreateUserDto';
import { UpdateUserDto } from './dto/updateUser.dto';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

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

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    try {
      return this.userService.findById(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener usuario',
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

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    try {
      return this.userService.update(id, updateUserDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al actualizar usuario',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    try {
      return this.userService.delete(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al eliminar usuario',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}