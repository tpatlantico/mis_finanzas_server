import { IsNotEmpty, IsString, IsOptional, Length, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class CreatePointSaleDto {
  @ApiProperty({
    description: 'ID del negocio al que pertenece el punto de venta',
    example: 1,
    type: 'number',
    minimum: 1
  })
  @IsNotEmpty({ message: 'El ID del negocio es requerido' })
  @IsNumber({}, { message: 'El ID del negocio debe ser un número' })
  negocio_id: number;

  @ApiProperty({
    description: 'Nombre identificativo del punto de venta',
    example: 'Sucursal Centro',
    minLength: 3,
    maxLength: 100,
    type: 'string'
  })
  @IsNotEmpty({ message: 'El nombre del punto de venta es requerido' })
  @IsString({ message: 'El nombre debe ser texto' })
  @Length(3, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres' })
  nombre: string;

  @ApiProperty({
    description: 'Dirección física del punto de venta',
    example: 'Calle 123 #45-67, Barrio Centro',
    minLength: 5,
    maxLength: 200,
    type: 'string'
  })
  @IsNotEmpty({ message: 'La ubicación es requerida' })
  @IsString({ message: 'La ubicación debe ser texto' })
  @Length(5, 200, { message: 'La ubicación debe tener entre 5 y 200 caracteres' })
  ubicacion: string;

  @ApiProperty({
    description: 'ID del departamento donde se ubica el punto de venta',
    example: 11,
    type: 'number',
    minimum: 1
  })
  @IsNotEmpty({ message: 'El departamento es requerido' })
  @IsNumber({}, { message: 'El departamento debe ser un número' })
  departamento: number;

  @ApiProperty({
    description: 'ID del municipio donde se ubica el punto de venta',
    example: 1101,
    type: 'number',
    minimum: 1
  })
  @IsNotEmpty({ message: 'El municipio es requerido' })
  @IsNumber({}, { message: 'El municipio debe ser un número' })
  municipio: number;

  @ApiProperty({
    description: 'Coordenada de latitud para ubicación geográfica (territorio colombiano)',
    example: 4.6097100,
    type: 'number',
    format: 'decimal',
    required: false,
    minimum: -4.227,
    maximum: 13.390
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 }, { message: 'La latitud debe ser un número decimal válido' })
  @Min(-4.227, { message: 'La latitud debe estar dentro del territorio colombiano (-4.227° a 13.390°)' })
  @Max(13.390, { message: 'La latitud debe estar dentro del territorio colombiano (-4.227° a 13.390°)' })
  latitud?: number;

  @ApiProperty({
    description: 'Coordenada de longitud para ubicación geográfica (territorio colombiano)',
    example: -74.0817500,
    type: 'number',
    format: 'decimal',
    required: false,
    minimum: -81.728,
    maximum: -66.847
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 }, { message: 'La longitud debe ser un número decimal válido' })
  @Min(-81.728, { message: 'La longitud debe estar dentro del territorio colombiano (-81.728° a -66.847°)' })
  @Max(-66.847, { message: 'La longitud debe estar dentro del territorio colombiano (-81.728° a -66.847°)' })
  longitud?: number;

  @ApiProperty({
    description: 'Nombre de la persona responsable del punto de venta',
    example: 'María García',
    minLength: 3,
    maxLength: 100,
    type: 'string',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El responsable debe ser texto' })
  @Length(3, 100, { message: 'El responsable debe tener entre 3 y 100 caracteres' })
  responsable?: string;

  @ApiProperty({
    description: 'Número de teléfono de contacto del punto de venta',
    example: '601-234-5678',
    minLength: 7,
    maxLength: 20,
    type: 'string',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @Length(7, 20, { message: 'El teléfono debe tener entre 7 y 20 caracteres' })
  telefono?: string;

  @ApiProperty({
    description: 'Estado de activación del punto de venta',
    example: true,
    type: 'boolean',
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser un valor booleano' })
  activo?: boolean;

  @ApiProperty({
    description: 'Observaciones o notas adicionales sobre el punto de venta',
    example: 'Punto de venta principal con mayor afluencia de clientes',
    minLength: 1,
    maxLength: 255,
    type: 'string',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'La nota debe ser texto' })
  @Length(1, 255, { message: 'La nota debe tener entre 1 y 255 caracteres' })
  nota?: string;
}