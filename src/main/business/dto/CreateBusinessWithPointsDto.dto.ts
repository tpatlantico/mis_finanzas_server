import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsNotEmpty,
  MinLength,
  MaxLength,
  ArrayMinSize,
  Matches
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PointSaleDto {
  @ApiProperty({ 
    description: 'Nombre del punto de venta',
    example: 'Sucursal Centro'
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del punto de venta es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  nombre: string;

  @ApiProperty({ 
    description: 'Dirección del punto de venta',
    example: 'Calle 123 #45-67'
  })
  @IsString()
  @IsNotEmpty({ message: 'La ubicación es obligatoria' })
  @MinLength(5, { message: 'La ubicación debe tener al menos 5 caracteres' })
  @MaxLength(200)
  ubicacion: string;

  @ApiPropertyOptional({ 
    description: 'Nombre del responsable',
    example: 'Juan Pérez'
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  responsable?: string;

  @ApiPropertyOptional({ 
    description: 'Teléfono del punto de venta',
    example: '+57 300 123 4567'
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  telefono?: string;

  @ApiProperty({ 
    description: 'ID del departamento',
    example: '8'
  })
  @IsString()
  @IsNotEmpty({ message: 'El departamento es obligatorio' })
  departamento: string;

  @ApiProperty({ 
    description: 'ID del municipio',
    example: '1'
  })
  @IsString()
  @IsNotEmpty({ message: 'El municipio es obligatorio' })
  municipio: string;

  @ApiPropertyOptional({ 
    description: 'Notas adicionales sobre el punto de venta',
    example: 'Punto ubicado en centro comercial'
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nota?: string;
}

export class CreateBusinessWithPointsDto {
  @ApiProperty({ 
    description: 'Nombre del negocio',
    example: 'Mi Tienda S.A.S.'
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del negocio es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ 
    description: 'NIT del negocio',
    example: '900123456-7'
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  nit?: string;

  @ApiProperty({ 
    description: 'Dirección principal del negocio',
    example: 'Calle 85 #12-34'
  })
  @IsString()
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @MinLength(5, { message: 'La dirección debe tener al menos 5 caracteres' })
  @MaxLength(200)
  direccion: string;

  @ApiProperty({ 
    description: 'Teléfono de contacto del negocio',
    example: '+57 300 123 4567'
  })
  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @MaxLength(20)
  telefono: string;

  @ApiProperty({ 
    description: 'Email de contacto del negocio',
    example: 'contacto@minegocio.com'
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @MaxLength(100)
  email: string;

  @ApiProperty({ 
    description: 'ID del departamento donde se ubica el negocio',
    example: '8'
  })
  @IsString()
  @IsNotEmpty({ message: 'El departamento es obligatorio' })
  departamento: string;

  @ApiProperty({ 
    description: 'ID del municipio donde se ubica el negocio',
    example: '1'
  })
  @IsString()
  @IsNotEmpty({ message: 'El municipio es obligatorio' })
  municipio: string;

  @ApiProperty({ 
    description: 'Lista de puntos de venta a crear',
    type: [PointSaleDto]
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos un punto de venta' })
  @ValidateNested({ each: true })
  @Type(() => PointSaleDto)
  puntosVenta: PointSaleDto[];
}