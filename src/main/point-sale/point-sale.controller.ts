import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  HttpStatus,
  HttpException,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PointSaleService } from './point-sale.service';
import { JwtPayload } from 'src/auth/models/token.model';
import CreatePointSaleDto from './dto/CreatePoitnSale.dt';
import {
  UpdatePointSaleDto,
  UpdatePointSaleStatusDto,
} from './dto/UpdatePointSale.dto';
import { JwtauthGuard } from 'src/auth/guards/JwtGuard.guard';

@UseGuards(JwtauthGuard)
@ApiTags('point-sale')
@Controller('point-sale')
@ApiBearerAuth()
export class PointSaleController {
  constructor(private readonly pointSaleService: PointSaleService) {}

  // POST /point-sale - Crear punto de venta
  @Post()
  @ApiOperation({ summary: 'Crear punto de venta' })
  @ApiResponse({
    status: 201,
    description: 'Punto de venta creado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  async createPointSale(
    @Request() req,
    @Body() newPointSale: CreatePointSaleDto,
  ) {
    try {
      const user = req.user as JwtPayload;
      return await this.pointSaleService.createPointSale(
        user.sub,
        newPointSale,
      );
    } catch (error) {
      throw error;
    }
  }

  // GET /point-sale/business/:businessId - Obtener todos los puntos de venta de un negocio
  @Get('business/:businessId')
  @ApiOperation({ summary: 'Obtener todos los puntos de venta de un negocio' })
  @ApiResponse({
    status: 200,
    description: 'Lista de puntos de venta obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  async getPointsSaleByBusiness(
    @Request() req,
    @Param('businessId', ParseIntPipe) businessId: number,
  ) {
    try {
      const user = req.user as JwtPayload;
      return await this.pointSaleService.getPointsSaleByBusiness(
        user.sub,
        businessId,
      );
    } catch (error) {
      throw error;
    }
  }

  // GET /point-sale/business/:businessId/active - Obtener solo puntos de venta activos
  @Get('business/:businessId/active')
  @ApiOperation({ summary: 'Obtener puntos de venta activos de un negocio' })
  @ApiResponse({
    status: 200,
    description: 'Lista de puntos de venta activos obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  async getActivePointsSaleByBusiness(
    @Request() req,
    @Param('businessId', ParseIntPipe) businessId: number,
  ) {
    try {
      const user = req.user as JwtPayload;
      return await this.pointSaleService.getActivePointsSaleByBusiness(
        user.sub,
        businessId,
      );
    } catch (error) {
      throw error;
    }
  }

  // GET /point-sale/:id - Obtener información de un punto de venta específico
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener información detallada de un punto de venta',
  })
  @ApiResponse({
    status: 200,
    description: 'Información del punto de venta obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Punto de venta no encontrado' })
  async getPointSaleById(
    @Request() req,
    @Param('id', ParseIntPipe) pointSaleId: number,
  ) {
    try {
      const user = req.user as JwtPayload;
      return await this.pointSaleService.getPointSaleById(
        user.sub,
        pointSaleId,
      );
    } catch (error) {
      throw error;
    }
  }

  // PUT /point-sale/:id - Actualizar punto de venta completo
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar información completa de punto de venta',
  })
  @ApiResponse({
    status: 200,
    description: 'Punto de venta actualizado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Punto de venta no encontrado' })
  async updatePointSale(
    @Request() req,
    @Param('id', ParseIntPipe) pointSaleId: number,
    @Body() updatePointSaleDto: UpdatePointSaleDto,
  ) {
    try {
      const user = req.user as JwtPayload;
      return await this.pointSaleService.updatePointSale(
        user.sub,
        pointSaleId,
        updatePointSaleDto,
      );
    } catch (error) {
      throw error;
    }
  }

  // PATCH /point-sale/:id/status - Actualizar solo el estado activo/inactivo
  @Patch(':id/status')
  @ApiOperation({ summary: 'Activar o desactivar un punto de venta' })
  @ApiResponse({
    status: 200,
    description: 'Estado del punto de venta actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Punto de venta no encontrado' })
  async updatePointSaleStatus(
    @Request() req,
    @Param('id', ParseIntPipe) pointSaleId: number,
    @Body() statusDto: UpdatePointSaleStatusDto,
  ) {
    try {
      const user = req.user as JwtPayload;
      return await this.pointSaleService.updatePointSaleStatus(
        user.sub,
        pointSaleId,
        statusDto,
      );
    } catch (error) {
      throw error;
    }
  }

  // DELETE /point-sale/:id - Eliminar punto de venta
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar punto de venta' })
  @ApiResponse({
    status: 200,
    description: 'Punto de venta eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Punto de venta no encontrado' })
  async deletePointSale(
    @Request() req,
    @Param('id', ParseIntPipe) pointSaleId: number,
  ) {
    try {
      const user = req.user as JwtPayload;
      return await this.pointSaleService.deletePointSale(pointSaleId, user.sub);
    } catch (error) {
      throw error;
    }
  }
}
