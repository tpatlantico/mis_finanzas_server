import { IsEmail, IsString, MinLength, IsOptional, IsDateString } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  nombres: string;

  @IsString()
  apellidos: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;
}