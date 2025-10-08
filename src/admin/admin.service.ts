import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base.service';

@Injectable()
export class AdminService {
  constructor(private readonly baseService: BaseService) {}

  async getDashboardStats() {
    try {
      // Obtener fechas para comparaciones
      const now = new Date();
      const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // 1. TOTAL DE USUARIOS
      const [totalUsuariosResult] = await this.baseService.executeQuery<{ total: number }>(
        'SELECT COUNT(*) as total FROM users',
      );
      const totalUsuarios = totalUsuariosResult.total;

      // Usuarios del mes pasado
      const [usuariosMesPasadoResult] = await this.baseService.executeQuery<{ total: number }>(
        `SELECT COUNT(*) as total FROM users 
         WHERE created_at < ?`,
        [firstDayCurrentMonth],
      );
      const usuariosMesPasado = usuariosMesPasadoResult.total;
      const cambioUsuarios = totalUsuarios - usuariosMesPasado;
      const porcentajeCambioUsuarios = usuariosMesPasado > 0 
        ? parseFloat(((cambioUsuarios / usuariosMesPasado) * 100).toFixed(1))
        : 0;

      // 2. TOTAL DE NEGOCIOS
      const [totalNegociosResult] = await this.baseService.executeQuery<{ total: number }>(
        'SELECT COUNT(*) as total FROM negocios',
      );
      const totalNegocios = totalNegociosResult.total;

      // Negocios del mes pasado
      const [negociosMesPasadoResult] = await this.baseService.executeQuery<{ total: number }>(
        `SELECT COUNT(*) as total FROM negocios 
         WHERE created_at < ?`,
        [firstDayCurrentMonth],
      );
      const negociosMesPasado = negociosMesPasadoResult.total;
      const cambioNegocios = totalNegocios - negociosMesPasado;
      const porcentajeCambioNegocios = negociosMesPasado > 0
        ? parseFloat(((cambioNegocios / negociosMesPasado) * 100).toFixed(1))
        : 0;

      // 3. TRANSACCIONES DEL MES ACTUAL
      const [transaccionesActualResult] = await this.baseService.executeQuery<{ total: number }>(
        `SELECT COUNT(*) as total FROM transacciones 
         WHERE fecha >= ?`,
        [firstDayCurrentMonth],
      );
      const transaccionesDelMes = transaccionesActualResult.total;

      // Transacciones del mes pasado
      const [transaccionesPasadoResult] = await this.baseService.executeQuery<{ total: number }>(
        `SELECT COUNT(*) as total FROM transacciones 
         WHERE fecha >= ? AND fecha <= ?`,
        [firstDayLastMonth, lastDayLastMonth],
      );
      const transaccionesMesPasado = transaccionesPasadoResult.total;
      const cambioTransacciones = transaccionesDelMes - transaccionesMesPasado;
      const porcentajeCambioTransacciones = transaccionesMesPasado > 0
        ? parseFloat(((cambioTransacciones / transaccionesMesPasado) * 100).toFixed(1))
        : 0;

      // 4. VALOR TOTAL TRANSACCIONADO DEL MES (SOLO INGRESOS)
      const [valorActualResult] = await this.baseService.executeQuery<{ total: number }>(
        `SELECT COALESCE(SUM(monto_total), 0) as total FROM transacciones 
         WHERE fecha >= ? AND tipo = 'ingreso'`,
        [firstDayCurrentMonth],
      );
      const valorTotalDelMes = valorActualResult.total || 0;

      // Valor del mes pasado
      const [valorPasadoResult] = await this.baseService.executeQuery<{ total: number }>(
        `SELECT COALESCE(SUM(monto_total), 0) as total FROM transacciones 
         WHERE fecha >= ? AND fecha <= ? AND tipo = 'ingreso'`,
        [firstDayLastMonth, lastDayLastMonth],
      );
      const valorMesPasado = valorPasadoResult.total || 0;
      const cambioValor = valorTotalDelMes - valorMesPasado;
      const porcentajeCambioValor = valorMesPasado > 0
        ? parseFloat(((cambioValor / valorMesPasado) * 100).toFixed(1))
        : 0;

      return {
        success: true,
        data: {
          totalUsuarios: {
            total: totalUsuarios,
            cambioMensual: cambioUsuarios,
            porcentajeCambio: porcentajeCambioUsuarios,
          },
          totalNegocios: {
            total: totalNegocios,
            cambioMensual: cambioNegocios,
            porcentajeCambio: porcentajeCambioNegocios,
          },
          transaccionesDelMes: {
            total: transaccionesDelMes,
            cambioMensual: cambioTransacciones,
            porcentajeCambio: porcentajeCambioTransacciones,
          },
          valorTotalTransaccionado: {
            total: valorTotalDelMes,
            cambioMensual: cambioValor,
            porcentajeCambio: porcentajeCambioValor,
          },
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al obtener estadísticas del dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}