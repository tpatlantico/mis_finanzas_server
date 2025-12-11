import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base.service';

interface DetailedTransactionsFilters {
  departamento?: number;
  tipo?: 'ingreso' | 'egreso';
  categoria?: number;
  periodo?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AdminService {
  constructor(private readonly baseService: BaseService) {}

  async getDashboardStats() {
    try {
      // Obtener fechas para comparaciones
      const now = new Date();
      const firstDayCurrentMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );
      const firstDayLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // 1. TOTAL DE USUARIOS
      const [totalUsuariosResult] = await this.baseService.executeQuery<{
        total: number;
      }>('SELECT COUNT(*) as total FROM users');
      const totalUsuarios = totalUsuariosResult.total;

      // Usuarios del mes pasado
      const [usuariosMesPasadoResult] = await this.baseService.executeQuery<{
        total: number;
      }>(
        `SELECT COUNT(*) as total FROM users 
         WHERE created_at < ?`,
        [firstDayCurrentMonth],
      );
      const usuariosMesPasado = usuariosMesPasadoResult.total;
      const cambioUsuarios = totalUsuarios - usuariosMesPasado;
      const porcentajeCambioUsuarios =
        usuariosMesPasado > 0
          ? parseFloat(((cambioUsuarios / usuariosMesPasado) * 100).toFixed(1))
          : 0;

      // 2. TOTAL DE NEGOCIOS
      const [totalNegociosResult] = await this.baseService.executeQuery<{
        total: number;
      }>('SELECT COUNT(*) as total FROM negocios');
      const totalNegocios = totalNegociosResult.total;

      // Negocios del mes pasado
      const [negociosMesPasadoResult] = await this.baseService.executeQuery<{
        total: number;
      }>(
        `SELECT COUNT(*) as total FROM negocios 
         WHERE created_at < ?`,
        [firstDayCurrentMonth],
      );
      const negociosMesPasado = negociosMesPasadoResult.total;
      const cambioNegocios = totalNegocios - negociosMesPasado;
      const porcentajeCambioNegocios =
        negociosMesPasado > 0
          ? parseFloat(((cambioNegocios / negociosMesPasado) * 100).toFixed(1))
          : 0;

      // 3. TRANSACCIONES DEL MES ACTUAL
      const [transaccionesActualResult] = await this.baseService.executeQuery<{
        total: number;
      }>(
        `SELECT COUNT(*) as total FROM transacciones 
         WHERE fecha >= ?`,
        [firstDayCurrentMonth],
      );
      const transaccionesDelMes = transaccionesActualResult.total;

      // Transacciones del mes pasado
      const [transaccionesPasadoResult] = await this.baseService.executeQuery<{
        total: number;
      }>(
        `SELECT COUNT(*) as total FROM transacciones 
         WHERE fecha >= ? AND fecha <= ?`,
        [firstDayLastMonth, lastDayLastMonth],
      );
      const transaccionesMesPasado = transaccionesPasadoResult.total;
      const cambioTransacciones = transaccionesDelMes - transaccionesMesPasado;
      const porcentajeCambioTransacciones =
        transaccionesMesPasado > 0
          ? parseFloat(
              ((cambioTransacciones / transaccionesMesPasado) * 100).toFixed(1),
            )
          : 0;

      // 4. VALOR TOTAL TRANSACCIONADO DEL MES (SOLO INGRESOS)
      const [valorActualResult] = await this.baseService.executeQuery<{
        total: number;
      }>(
        `SELECT COALESCE(SUM(monto_total), 0) as total FROM transacciones 
         WHERE fecha >= ? AND tipo = 'ingreso'`,
        [firstDayCurrentMonth],
      );
      const valorTotalDelMes = valorActualResult.total || 0;

      // Valor del mes pasado
      const [valorPasadoResult] = await this.baseService.executeQuery<{
        total: number;
      }>(
        `SELECT COALESCE(SUM(monto_total), 0) as total FROM transacciones 
         WHERE fecha >= ? AND fecha <= ? AND tipo = 'ingreso'`,
        [firstDayLastMonth, lastDayLastMonth],
      );
      const valorMesPasado = valorPasadoResult.total || 0;
      const cambioValor = valorTotalDelMes - valorMesPasado;
      const porcentajeCambioValor =
        valorMesPasado > 0
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

  async getTopRegions() {
    try {
      const totalNegociosResult = await this.baseService.executeQuery(
        'SELECT COUNT(*) as total FROM negocios WHERE municipio IS NOT NULL',
      );
      const totalNegocios = totalNegociosResult[0]?.total || 0;

      const topRegions = await this.baseService.executeQuery(
        `SELECT 
          m.id_municipio,
          m.municipio,
          d.departamento,
          COUNT(n.id) as totalNegocios,
          COUNT(DISTINCT n.propietario) as totalUsuarios,
          ROUND((COUNT(n.id) * 100.0 / ?), 1) as porcentaje
        FROM municipios m
        INNER JOIN departamentos d ON m.departamento_id = d.id_departamento
        LEFT JOIN negocios n ON n.municipio = m.id_municipio
        GROUP BY m.id_municipio, m.municipio, d.departamento
        HAVING totalNegocios > 0
        ORDER BY totalNegocios DESC
        LIMIT 10`,
        [totalNegocios],
      );

      const topRegionsWithRanking = topRegions.map((region, index) => ({
        ranking: index + 1,
        municipio: region.municipio,
        departamento: region.departamento,
        totalUsuarios: parseInt(region.totalUsuarios),
        totalNegocios: parseInt(region.totalNegocios),
        porcentaje: parseFloat(region.porcentaje),
      }));

      return {
        success: true,
        data: topRegionsWithRanking,
        totalNegocios: totalNegocios,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener top de regiones',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene transacciones detalladas con filtros opcionales
   */
  async getDetailedTransactions(filters: DetailedTransactionsFilters) {
    try {
      const {
        departamento,
        tipo,
        categoria,
        periodo,
        limit = 50,
        offset = 0,
      } = filters;

      // Construir condiciones WHERE dinámicamente
      const whereConditions: string[] = ['1=1'];
      const params: any[] = [];

      if (departamento) {
        whereConditions.push('d.id_departamento = ?');
        params.push(departamento);
      }

      if (tipo) {
        whereConditions.push('t.tipo = ?');
        params.push(tipo);
      }

      if (categoria) {
        whereConditions.push('ce.id = ?');
        params.push(categoria);
      }

      // Filtro de período
      if (periodo) {
        switch (periodo) {
          case 'hoy':
            whereConditions.push('DATE(t.fecha) = CURDATE()');
            break;
          case '7dias':
            whereConditions.push('t.fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
            break;
          case '30dias':
            whereConditions.push(
              't.fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
            );
            break;
          case 'mes_actual':
            whereConditions.push(
              'YEAR(t.fecha) = YEAR(NOW()) AND MONTH(t.fecha) = MONTH(NOW())',
            );
            break;
          case 'mes_anterior':
            whereConditions.push(`
              YEAR(t.fecha) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH)) 
              AND MONTH(t.fecha) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))
            `);
            break;
        }
      }

      const whereClause = whereConditions.join(' AND ');

      // Query principal para transacciones
      const queryTransacciones = `
        SELECT 
          t.id,
          CONCAT(n.nombre, ' - ', m.municipio) AS negocio_ciudad,
          n.nombre AS negocio,
          m.municipio AS ciudad,
          d.departamento,
          d.id_departamento,
          t.tipo,
          t.fecha,
          DATE_FORMAT(t.fecha, '%d/%m/%Y %H:%i') AS fecha_formateada,
          CASE 
            WHEN TIMESTAMPDIFF(MINUTE, t.fecha, NOW()) < 60 THEN 
              CONCAT('Hace ', TIMESTAMPDIFF(MINUTE, t.fecha, NOW()), ' min')
            WHEN TIMESTAMPDIFF(HOUR, t.fecha, NOW()) < 24 THEN 
              CONCAT('Hace ', TIMESTAMPDIFF(HOUR, t.fecha, NOW()), ' horas')
            WHEN TIMESTAMPDIFF(DAY, t.fecha, NOW()) < 7 THEN 
              CONCAT('Hace ', TIMESTAMPDIFF(DAY, t.fecha, NOW()), ' días')
            ELSE 
              DATE_FORMAT(t.fecha, '%d/%m/%Y')
          END AS tiempo_transcurrido,
          t.monto_total,
          CASE 
            WHEN t.tipo = 'ingreso' THEN CONCAT('+$ ', FORMAT(t.monto_total, 0))
            ELSE CONCAT('-$ ', FORMAT(t.monto_total, 0))
          END AS monto_formateado,
          t.concepto,
          IFNULL(ce.nombre, 'N/A') AS categoria,
          IFNULL(ce.id, NULL) AS categoria_id,
          IFNULL(ce.tipo_costo, NULL) AS tipo_costo,
          pv.nombre AS punto_venta,
          pv.id AS punto_venta_id,
          CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
          (SELECT GROUP_CONCAT(
            CONCAT(p.nombre, ' (', dt.cantidad, 'x)')
            SEPARATOR ', '
          )
          FROM detalle_transacciones dt
          JOIN productos p ON dt.producto_id = p.id
          WHERE dt.transaccion_id = t.id
          ) AS productos_detalle,
          (SELECT COUNT(*)
          FROM detalle_transacciones dt
          WHERE dt.transaccion_id = t.id
          ) AS cantidad_items
        FROM transacciones t
        JOIN puntos_venta pv ON t.punto_venta_id = pv.id
        JOIN negocios n ON pv.negocio_id = n.id
        JOIN municipios m ON pv.municipio = m.id_municipio
        JOIN departamentos d ON pv.departamento = d.id_departamento
        LEFT JOIN categorias_egresos ce ON t.categoria_id = ce.id
        LEFT JOIN users u ON t.usuario_id = u.id
        WHERE ${whereClause}
        ORDER BY t.fecha DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      const transacciones = await this.baseService.executeQuery(
        queryTransacciones,
        params,
      );

      // Query para resumen (sin limit/offset)
      const querySummary = `
        SELECT 
          COUNT(*) AS total_transacciones,
          SUM(CASE WHEN t.tipo = 'ingreso' THEN t.monto_total ELSE 0 END) AS total_ingresos,
          SUM(CASE WHEN t.tipo = 'egreso' THEN t.monto_total ELSE 0 END) AS total_egresos,
          SUM(CASE WHEN t.tipo = 'ingreso' THEN t.monto_total ELSE -t.monto_total END) AS balance
        FROM transacciones t
        JOIN puntos_venta pv ON t.punto_venta_id = pv.id
        JOIN negocios n ON pv.negocio_id = n.id
        JOIN municipios m ON pv.municipio = m.id_municipio
        JOIN departamentos d ON pv.departamento = d.id_departamento
        LEFT JOIN categorias_egresos ce ON t.categoria_id = ce.id
        WHERE ${whereClause}
      `;

      const summaryParams = params.slice(0, -2); // Remover limit y offset
      const [summary] = await this.baseService.executeQuery(
        querySummary,
        summaryParams,
      );

      // Formatear números
      const formatCurrency = (value: number): string => {
        return `$${value.toLocaleString('es-CO')}`;
      };

      return {
        success: true,
        data: {
          transacciones: transacciones,
          resumen: {
            total_transacciones: summary.total_transacciones || 0,
            total_ingresos: summary.total_ingresos || 0,
            total_egresos: summary.total_egresos || 0,
            balance: summary.balance || 0,
            ingresos_formateado: formatCurrency(summary.total_ingresos || 0),
            egresos_formateado: formatCurrency(summary.total_egresos || 0),
            balance_formateado: formatCurrency(summary.balance || 0),
          },
          pagination: {
            limit: limit,
            offset: offset,
            has_more: transacciones.length === limit,
          },
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener transacciones detalladas',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene las opciones para los filtros de transacciones
   */
  async getTransactionFilters() {
    try {
      // Departamentos con cantidad de transacciones
      const departamentos = await this.baseService.executeQuery(`
        SELECT DISTINCT
          d.id_departamento AS value,
          d.departamento AS label,
          COUNT(t.id) AS count
        FROM departamentos d
        JOIN municipios m ON d.id_departamento = m.departamento_id
        JOIN puntos_venta pv ON m.id_municipio = pv.municipio
        JOIN transacciones t ON pv.id = t.punto_venta_id
        GROUP BY d.id_departamento, d.departamento
        ORDER BY d.departamento
      `);

      // Categorías de egresos
      const categorias = await this.baseService.executeQuery(`
        SELECT 
          ce.id AS value,
          ce.nombre AS label,
          ce.tipo_costo,
          COUNT(t.id) AS count
        FROM categorias_egresos ce
        LEFT JOIN transacciones t ON ce.id = t.categoria_id
        WHERE ce.activo = 1
        GROUP BY ce.id, ce.nombre, ce.tipo_costo
        ORDER BY ce.nombre
      `);

      // Tipos de transacción
      const tipos = await this.baseService.executeQuery(`
        SELECT 'ingreso' AS value, 'Ingresos' AS label, COUNT(*) AS count
        FROM transacciones WHERE tipo = 'ingreso'
        UNION ALL
        SELECT 'egreso', 'Egresos', COUNT(*)
        FROM transacciones WHERE tipo = 'egreso'
      `);

      // Períodos (estáticos)
      const periodos = [
        { value: 'hoy', label: 'Hoy' },
        { value: '7dias', label: 'Últimos 7 días' },
        { value: '30dias', label: 'Últimos 30 días' },
        { value: 'mes_actual', label: 'Mes actual' },
        { value: 'mes_anterior', label: 'Mes anterior' },
      ];

      return {
        success: true,
        data: {
          departamentos,
          categorias,
          tipos,
          periodos,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener filtros',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene los detalles completos de una transacción específica
   */
  async getTransactionDetails(transactionId: number) {
    try {
      // Información de la transacción
      const transaccionQuery = `
        SELECT 
          t.*,
          n.nombre AS negocio,
          m.municipio,
          d.departamento,
          pv.nombre AS punto_venta,
          pv.ubicacion,
          IFNULL(ce.nombre, 'N/A') AS categoria,
          ce.tipo_costo,
          CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
          u.email AS usuario_email
        FROM transacciones t
        JOIN puntos_venta pv ON t.punto_venta_id = pv.id
        JOIN negocios n ON pv.negocio_id = n.id
        JOIN municipios m ON pv.municipio = m.id_municipio
        JOIN departamentos d ON pv.departamento = d.id_departamento
        LEFT JOIN categorias_egresos ce ON t.categoria_id = ce.id
        LEFT JOIN users u ON t.usuario_id = u.id
        WHERE t.id = ?
      `;

      const transaccion = await this.baseService.executeQuery(
        transaccionQuery,
        [transactionId],
      );

      if (!transaccion || transaccion.length === 0) {
        throw new HttpException(
          'Transacción no encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      // Detalles de productos (si aplica)
      const detallesQuery = `
        SELECT 
          dt.*,
          p.nombre AS producto,
          p.unidad_medida,
          p.precio_unitario,
          p.costo_unitario,
          (dt.precio_unitario - p.costo_unitario) * dt.cantidad AS utilidad
        FROM detalle_transacciones dt
        JOIN productos p ON dt.producto_id = p.id
        WHERE dt.transaccion_id = ?
      `;

      const detalles = await this.baseService.executeQuery(detallesQuery, [
        transactionId,
      ]);

      return {
        success: true,
        data: {
          transaccion: transaccion[0],
          detalles: detalles,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al obtener detalles de transacción',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}