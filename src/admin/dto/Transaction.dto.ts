import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoTransaccion {
  INGRESO = 'ingreso',
  EGRESO = 'egreso',
}

export enum PeriodoTransaccion {
  HOY = 'hoy',
  SIETE_DIAS = '7dias',
  TREINTA_DIAS = '30dias',
  MES_ACTUAL = 'mes_actual',
  MES_ANTERIOR = 'mes_anterior',
}

export class DetailedTransactionsQueryDto {
  @ApiPropertyOptional({
    description: 'ID del departamento para filtrar',
    example: 8,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El departamento debe ser un número entero' })
  departamento?: number;

  @ApiPropertyOptional({
    description: 'Tipo de transacción',
    enum: TipoTransaccion,
    example: TipoTransaccion.INGRESO,
  })
  @IsOptional()
  @IsEnum(TipoTransaccion, {
    message: 'El tipo debe ser "ingreso" o "egreso"',
  })
  tipo?: TipoTransaccion;

  @ApiPropertyOptional({
    description: 'ID de categoría de egreso',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La categoría debe ser un número entero' })
  categoria?: number;

  @ApiPropertyOptional({
    description: 'Período de tiempo para filtrar',
    enum: PeriodoTransaccion,
    example: PeriodoTransaccion.TREINTA_DIAS,
  })
  @IsOptional()
  @IsEnum(PeriodoTransaccion, {
    message:
      'El período debe ser uno de: hoy, 7dias, 30dias, mes_actual, mes_anterior',
  })
  periodo?: PeriodoTransaccion;

  @ApiPropertyOptional({
    description: 'Número de registros a retornar (máximo 100)',
    example: 50,
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(100, { message: 'El límite máximo es 100' })
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Offset para paginación',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El offset debe ser un número entero' })
  @Min(0, { message: 'El offset no puede ser negativo' })
  offset?: number = 0;
}

// Response DTOs para documentación
export class TransaccionDetalladaDto {
  id: number;
  negocio_ciudad: string;
  negocio: string;
  ciudad: string;
  departamento: string;
  id_departamento: number;
  tipo: string;
  fecha: Date;
  fecha_formateada: string;
  tiempo_transcurrido: string;
  monto_total: number;
  monto_formateado: string;
  concepto: string;
  categoria: string;
  categoria_id: number | null;
  tipo_costo: string | null;
  punto_venta: string;
  punto_venta_id: number;
  usuario: string;
  productos_detalle: string | null;
  cantidad_items: number;
}

export class ResumenTransaccionesDto {
  total_transacciones: number;
  total_ingresos: number;
  total_egresos: number;
  balance: number;
  ingresos_formateado: string;
  egresos_formateado: string;
  balance_formateado: string;
}

export class PaginationDto {
  limit: number;
  offset: number;
  has_more: boolean;
}

export class DetailedTransactionsResponseDto {
  success: boolean;
  data: {
    transacciones: TransaccionDetalladaDto[];
    resumen: ResumenTransaccionesDto;
    pagination: PaginationDto;
  };
}

export class FiltroOpcionDto {
  value: string | number;
  label: string;
  count?: number;
  tipo_costo?: string;
}

export class TransactionFiltersResponseDto {
  success: boolean;
  data: {
    departamentos: FiltroOpcionDto[];
    categorias: FiltroOpcionDto[];
    tipos: FiltroOpcionDto[];
    periodos: FiltroOpcionDto[];
  };
}