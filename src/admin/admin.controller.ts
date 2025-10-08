import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtauthGuard } from 'src/auth/guards/JwtGuard.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @ApiOperation({ 
    summary: 'Obtener estadísticas del dashboard de administrador',
    description: 'Retorna los KPIs principales: usuarios, negocios, transacciones y valor total'
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
}