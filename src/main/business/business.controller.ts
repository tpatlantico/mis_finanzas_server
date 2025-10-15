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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateBusinessWithPointsDto } from './dto/CreateBusinessWithPointsDto.dto';
import { UpdateBusinessDto } from './dto/updateBusiness.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';

@UseGuards(JwtauthGuard)
@ApiTags('business')
@Controller('business')
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  // POST /business - Crear negocio simple

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Crear negocio simple' })
  @ApiResponse({ status: 201, description: 'Negocio creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createBusiness(@Request() req, @Body() newBusiness: CreateBusinessDto) {
    const info = req.user as JwtPayload;
    return this.businessService.create(info.sub, newBusiness);
  }

  // POST /business/with-points - Crear negocio con puntos de venta
  @ApiBearerAuth()
  @Post('with-points')
  @ApiOperation({
    summary: 'Crear negocio con puntos de venta',
    description:
      'Crea un negocio junto con sus puntos de venta en una única transacción',
  })
  @ApiResponse({
    status: 201,
    description: 'Negocio y puntos de venta creados exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o validación fallida',
  })
  async createBusinessWithPoints(
    @Request() req,
    @Body() businessData: CreateBusinessWithPointsDto,
  ) {
    const info = req.user as JwtPayload;
    return this.businessService.createBusinessWithPoints(
      info.sub,
      businessData,
    );
  }

  // 🆕 GET /business/all - Obtener TODOS los negocios (público para el mapa)
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('all')
  @ApiOperation({
    summary: 'Obtener todos los negocios con coordenadas',
    description:
      'Devuelve todos los negocios que tienen coordenadas para mostrar en el mapa',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los negocios con coordenadas',
    schema: {
      example: [
        {
          id: 1,
          nombre: 'Tienda Don José',
          direccion: 'Calle 72 #54-32',
          latitud: 10.9875544,
          longitud: -74.7889321,
          telefono: '+57 305 123 4567',
          email: 'contacto@tiendonjose.com',
          departamento_nombre: 'Atlántico',
          municipio_nombre: 'Barranquilla',
        },
        {
          id: 2,
          nombre: 'Café Buena Vista',
          direccion: 'Carrera 43 #34-40',
          latitud: 11.0041072,
          longitud: -74.8069813,
          telefono: '+57 300 456 7890',
          email: 'info@cafebuenavis.com',
          departamento_nombre: 'Atlántico',
          municipio_nombre: 'Barranquilla',
        },
      ],
    },
  })
  getAllBusinesses() {
    return this.businessService.findAll();
  }

  // En business.controller.ts

// 🆕 GET /business/:id/points - Obtener puntos de venta de un negocio (Admin)
@UseGuards(RolesGuard)
@Roles('admin')
@Get(':id/points')
@ApiOperation({
  summary: 'Obtener puntos de venta de un negocio (Admin)',
  description: 'Obtiene todos los puntos de venta de un negocio específico. Solo para administradores',
})
@ApiResponse({
  status: 200,
  description: 'Lista de puntos de venta del negocio',
  schema: {
    example: {
      businessId: 1,
      businessName: 'Tienda Don José',
      puntosVenta: [
        {
          id: 1,
          nombre: 'Punto Centro',
          ubicacion: 'Calle 72 #54-32',
          latitud: 10.9875544,
          longitud: -74.7889321,
          responsable: 'María García',
          telefono: '+57 305 123 4567',
          departamento_nombre: 'Atlántico',
          municipio_nombre: 'Barranquilla',
          activo: 1
        }
      ],
      totalPuntos: 1
    }
  }
})
@ApiResponse({ status: 404, description: 'Negocio no encontrado' })
getBusinessPoints(@Param('id', ParseIntPipe) businessId: number) {
  return this.businessService.getBusinessPointsAdmin(businessId);
}

  // GET /business - Obtener negocios del usuario autenticado
  @ApiBearerAuth()
  @Get()
  @ApiOperation({
    summary: 'Obtener todos los negocios del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de negocios del usuario',
  })
  findUserBusinesses(@Request() req) {
    const info = req.user as JwtPayload;
    return this.businessService.findByUser(info.sub);
  }

  // GET /business/:id - Obtener un negocio con sus puntos de venta
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener negocio con sus puntos de venta',
    description:
      'Obtiene la información detallada de un negocio junto con todos sus puntos de venta',
  })
  @ApiResponse({
    status: 200,
    description: 'Negocio con puntos de venta',
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
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar información del negocio',
    description: 'Actualiza los datos de un negocio existente',
  })
  @ApiResponse({
    status: 200,
    description: 'Negocio actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para actualizar este negocio',
  })
  updateBusiness(
    @Request() req,
    @Param('id', ParseIntPipe) businessId: number,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    const info = req.user as JwtPayload;
    return this.businessService.update(businessId, info.sub, updateBusinessDto);
  }

  // DELETE /business/:id - Eliminar negocio
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar negocio',
    description: 'Elimina un negocio y todos sus puntos de venta asociados',
  })
  @ApiResponse({
    status: 200,
    description: 'Negocio eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  deleteBusiness(@Param('id') id: string, @Request() req) {
    const info = req.user as JwtPayload;
    return this.businessService.deleteBusiness(+id, info.sub);
  }
}
