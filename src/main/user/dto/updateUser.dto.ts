import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Los nombres deben ser texto' })
  @MinLength(2, { message: 'Los nombres deben tener al menos 2 caracteres' })
  nombres?: string;

  @IsOptional()
  @IsString({ message: 'Los apellidos deben ser texto' })
  @MinLength(2, { message: 'Los apellidos deben tener al menos 2 caracteres' })
  apellidos?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe ser válido' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @Matches(/^\d{10}$/, {
    message: 'El teléfono debe tener 10 dígitos',
  })
  telefono?: string;

  @IsOptional()
  @IsString({ message: 'El documento debe ser texto' })
  documento?: string;

  @IsOptional()
  @IsString({ message: 'La fecha de nacimiento debe ser texto' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe estar en formato YYYY-MM-DD',
  })
  fecha_nacimiento?: string;

  @IsOptional()
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;
}