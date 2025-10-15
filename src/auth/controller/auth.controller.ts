import {
  Controller,
  Get,
  HttpException,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtauthGuard } from '../guards/JwtGuard.guard';
import { ApiOperation } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: 'Inicio de sesion' })
  async login(@Request() req) {
    try {
      const user = req.user;

      return await this.authService.login(user, req);
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  @UseGuards(JwtauthGuard)
  @Get('check')
  @ApiOperation({ summary: 'Validar datos de sesion' })
  checkSession(@Request() req) {
    return {
      status: 'success',
      message: 'Sesión activa',
      user: req.user,
    };
  }
}
