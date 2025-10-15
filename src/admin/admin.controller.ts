import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtauthGuard } from 'src/auth/guards/JwtGuard.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BusinessService } from 'src/main/business/business.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtauthGuard, RolesGuard)
@Roles('admin') 
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly businessService: BusinessService
  ) {}

  @Get('dashboard/stats')
  @ApiOperation({ 
    summary: 'Obtener estadísticas del dashboard de administrador',
    description: 'Retorna los KPIs principales: usuarios, negocios, transacciones y valor total. Solo accesible para administradores.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      example: {
        success: true,
        data: {
          totalUsuarios: {
            total: 1234,
            cambioMensual: 12,
            porcentajeCambio: 12.5
          },
          totalNegocios: {
            total: 342,
            cambioMensual: 8,
            porcentajeCambio: 8.3
          },
          transaccionesDelMes: {
            total: 2847,
            cambioMensual: 156,
            porcentajeCambio: 23.4
          },
          valorTotalTransaccionado: {
            total: 45230000,
            cambioMensual: 6780000,
            porcentajeCambio: 15.2
          }
        }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol de administrador' })
  @ApiResponse({ status: 500, description: 'Error al obtener estadísticas' })
  async getDashboardStats() {
    try {
      return await this.adminService.getDashboardStats();
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener estadísticas del dashboard',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('dashboard/top-regions')
@ApiOperation({ 
  summary: 'Obtener top regiones por usuarios activos',
  description: 'Retorna el top de municipios ordenados por cantidad de usuarios activos. Solo accesible para administradores.'
})
@ApiResponse({ 
  status: 200, 
  description: 'Top de regiones obtenido exitosamente',
  schema: {
    example: {
      success: true,
      data: [
        {
          ranking: 1,
          municipio: 'Barranquilla',
          departamento: 'Atlántico',
          totalUsuarios: 2039,
          porcentaje: 18.5
        },
        {
          ranking: 2,
          municipio: 'Puerto Colombia',
          departamento: 'Atlántico',
          totalUsuarios: 1847,
          porcentaje: 16.8
        }
      ],
      totalUsuarios: 11000
    }
  }
})
@ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol de administrador' })
@ApiResponse({ status: 500, description: 'Error al obtener top de regiones' })
async getTopRegions() {
  try {
    return await this.adminService.getTopRegions();
  } catch (error) {
    throw new HttpException(
      error.message || 'Error al obtener top de regiones',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}


@Get('business/:id/full-details')
@ApiOperation({
  summary: 'Obtener información completa de un negocio (Admin)',
  description: 'Obtiene toda la información detallada de un negocio: propietario, puntos de venta, productos, categorías de gastos y transacciones',
})
@ApiResponse({
  status: 200,
  description: 'Información completa del negocio',
})
@ApiResponse({ status: 404, description: 'Negocio no encontrado' })
getBusinessFullDetails(@Param('id', ParseIntPipe) businessId: number) {
  return this.businessService.getBusinessFullDetails(businessId);
}
}