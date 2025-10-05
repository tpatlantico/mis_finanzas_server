import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  Request, 
  ParseIntPipe 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiParam, 
  ApiQuery, 
  ApiResponse, 
  ApiBody 
} from '@nestjs/swagger';
import { FixedCostService } from './fixed-cost.service';
import { createFixedCost } from '../financial-analysis/dto/createFixedCost.dto';
import { JwtPayload } from 'src/auth/models/token.model';
import { UpdateFixedCostDto } from '../financial-analysis/dto/updateFixedCost.dto';

@ApiTags('fixed-cost')
@Controller('fixed-cost')
export class FixedCostController {
  
  constructor(private readonly fixedCostService: FixedCostService) {}

  @Post()
  @ApiOperation({ summary: 'Crear configuración de costo fijo' })
  @ApiBody({ type: createFixedCost })
  @ApiResponse({ status: 201, description: 'Configuración de costo fijo creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  async createFixedCostConfiguration(
    @Request() req,
    @Body() newFixedCost: createFixedCost,
  ) {
    const user = req.user as JwtPayload;
    
    return this.fixedCostService.createFixedCostConfiguration(
      user.sub,
      newFixedCost,
    );
  }

  @Get('business/:businessId')
  @ApiOperation({ summary: 'Obtener configuración de costos fijos de un negocio' })
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiResponse({ status: 200, description: 'Lista de costos fijos' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  async getFixedCostConfiguration(
    @Request() req,
    @Param('businessId', ParseIntPipe) businessId: number,
  ) {
    const user = req.user as JwtPayload;
    
    return this.fixedCostService.getFixedCostConfiguration(
      businessId,
      user.sub,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar configuración de costo fijo' })
  @ApiParam({ name: 'id', description: 'ID de la configuración de costo fijo' })
  @ApiBody({ type: UpdateFixedCostDto })
  @ApiResponse({ status: 200, description: 'Configuración actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  @ApiResponse({ status: 403, description: 'Sin permisos para actualizar' })
  async updateFixedCostConfiguration(
    @Request() req,
    @Param('id', ParseIntPipe) fixedCostId: number,
    @Body() updateFixedCostDto: UpdateFixedCostDto,
  ) {
    const user = req.user as JwtPayload;
    
    return this.fixedCostService.updateFixedCostConfiguration(
      user.sub,
      fixedCostId,
      updateFixedCostDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar configuración de costo fijo' })
  @ApiParam({ name: 'id', description: 'ID de la configuración de costo fijo' })
  @ApiResponse({ status: 200, description: 'Configuración eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async deleteFixedCostConfiguration(
    @Request() req,
    @Param('id', ParseIntPipe) fixedCostId: number,
  ) {
    const user = req.user as JwtPayload;
    
    return this.fixedCostService.deleteFixedCostConfiguration(
      fixedCostId,
      user.sub,
    );
  }

  @Post('generate/:negocioId')
  @ApiOperation({ summary: 'Generar costos fijos para un período específico' })
  @ApiParam({ name: 'negocioId', description: 'ID del negocio' })
  @ApiQuery({ name: 'año', required: false, description: 'Año (por defecto: año actual)' })
  @ApiQuery({ name: 'mes', required: false, description: 'Mes (por defecto: mes actual)' })
  @ApiResponse({ status: 201, description: 'Costos fijos generados exitosamente' })
  async generateFixedCosts(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @Query('año') año?: number,
    @Query('mes') mes?: number,
  ) {
    return this.fixedCostService.generateFixedCosts(negocioId, año, mes);
  }

  @Get('history/:negocioId')
  @ApiOperation({ summary: 'Obtener historial de costos fijos de un negocio' })
  @ApiParam({ name: 'negocioId', description: 'ID del negocio' })
  @ApiResponse({ status: 200, description: 'Historial de costos fijos' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  async getFixedCostsHistory(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @Request() req,
  ) {
    const user = req.user as JwtPayload;
    
    return this.fixedCostService.getFixedCostsHistory(negocioId, user.sub);
  }
}