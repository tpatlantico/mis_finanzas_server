import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { JwtauthGuard } from 'src/auth/guards/JwtGuard.guard';
import { JwtPayload } from 'src/auth/models/token.model';
import CreateBusinessDto from './dto/CreateBusiness';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateBusinessWithPointsDto } from './dto/CreateBusinessWithPointsDto.dto';
import { UpdateBusinessDto } from './dto/updateBusiness.dto';

@UseGuards(JwtauthGuard)
@ApiTags('business')
@ApiBearerAuth()
@Controller('business')
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  // POST /business - Crear negocio simple
  @Post()
  @ApiOperation({ summary: 'Crear negocio simple' })
  @ApiResponse({ status: 201, description: 'Negocio creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createBusiness(@Request() req, @Body() newBusiness: CreateBusinessDto) {
    const info = req.user as JwtPayload;
    return this.businessService.create(info.sub, newBusiness);
  }

  // POST /business/with-points - Crear negocio con puntos de venta
  @Post('with-points')
  @ApiOperation({ 
    summary: 'Crear negocio con puntos de venta',
    description: 'Crea un negocio junto con sus puntos de venta en una única transacción'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Negocio y puntos de venta creados exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Negocio y puntos de venta creados exitosamente',
        business: {
          id: 1,
          nombre: 'Mi Negocio',
          nit: '123456789',
          direccion: 'Calle 123',
          telefono: '3001234567',
          email: 'negocio@example.com',
          departamento_id: 8,
          municipio_id: 1,
          departamento_nombre: 'Atlántico',
          municipio_nombre: 'Barranquilla'
        },
        puntosVenta: [
          {
            id: 1,
            nombre: 'Sucursal Centro',
            ubicacion: 'Calle 85 #12-34',
            responsable: 'Juan Pérez',
            telefono: '3001234567',
            activo: 1,
            departamento_nombre: 'Atlántico',
            municipio_nombre: 'Barranquilla'
          }
        ],
        totalPuntosCreados: 1
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o validación fallida' })
  async createBusinessWithPoints(
    @Request() req,
    @Body() businessData: CreateBusinessWithPointsDto,
  ) {
    const info = req.user as JwtPayload;
    return this.businessService.createBusinessWithPoints(info.sub, businessData);
  }

  // GET /business - Obtener todos los negocios del usuario
  @Get()
  @ApiOperation({ summary: 'Obtener todos los negocios del usuario' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de negocios del usuario autenticado' 
  })
  findUserBusinesses(@Request() req) {
    const info = req.user as JwtPayload;
    return this.businessService.findByUser(info.sub);
  }

  // GET /business/:id - Obtener un negocio con sus puntos de venta
  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener negocio con sus puntos de venta',
    description: 'Obtiene la información detallada de un negocio junto con todos sus puntos de venta'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Negocio con puntos de venta',
    schema: {
      example: {
        business: {
          id: 1,
          nombre: 'Mi Negocio',
          nit: '123456789',
          direccion: 'Calle 123',
          telefono: '3001234567',
          email: 'negocio@example.com',
          departamento_nombre: 'Atlántico',
          municipio_nombre: 'Barranquilla'
        },
        puntosVenta: [],
        totalPuntos: 2
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  getBusinessWithPoints(
    @Request() req,
    @Param('id', ParseIntPipe) businessId: number,
  ) {
    const info = req.user as JwtPayload;
    return this.businessService.getBusinessWithPoints(businessId, info.sub);
  }

  // PATCH /business/:id - Actualizar negocio
  @Patch(':id')
  @ApiOperation({ 
    summary: 'Actualizar información del negocio',
    description: 'Actualiza los datos de un negocio existente'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Negocio actualizado exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Negocio actualizado exitosamente',
        data: {
          id: 1,
          nombre: 'Mi Negocio Actualizado',
          nit: '123456789-0',
          direccion: 'Nueva Dirección',
          telefono: '3001234567',
          email: 'nuevo@email.com'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para actualizar este negocio' })
  updateBusiness(
    @Request() req,
    @Param('id', ParseIntPipe) businessId: number,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    const info = req.user as JwtPayload;
    return this.businessService.update(businessId, info.sub, updateBusinessDto);
  }

  // DELETE /business/:id - Eliminar negocio
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Eliminar negocio',
    description: 'Elimina un negocio y todos sus puntos de venta asociados'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Negocio eliminado exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Negocio eliminado correctamente junto con todos sus puntos de venta'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  deleteBusiness(@Param('id') id: string, @Request() req) {
    const info = req.user as JwtPayload;
    return this.businessService.deleteBusiness(+id, info.sub);
  }
}