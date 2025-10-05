import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import CreatePointSaleDto from './dto/CreatePoitnSale.dt';
import { BaseService } from 'src/common/base.service';
import { UpdatePointSaleDto } from './dto/UpdatePointSale.dto';

// Interfaz para el DTO de actualización de estado
interface UpdatePuntoVentaStatusDto {
  activo: boolean;
}

@Injectable()
export class PointSaleService {
  constructor(private readonly baseService: BaseService) {}

  async createPointSale(userId: string, newPuntoVenta: CreatePointSaleDto) {
    try {
      // 1. Verificar acceso al negocio (esto ya valida usuario y negocio)
      await this.baseService.verifyBusinessAccess(
        newPuntoVenta.negocio_id,
        userId,
      );

      // 2. Verificar que el departamento existe
      const departmentRows = await this.baseService.executeQuery(
        'SELECT id_departamento FROM departamentos WHERE id_departamento = ?',
        [newPuntoVenta.departamento],
      );

      if (!departmentRows || departmentRows.length === 0) {
        throw new HttpException(
          'El departamento especificado no existe',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. Verificar que el municipio existe y pertenece al departamento
      const municipalityRows = await this.baseService.executeQuery(
        'SELECT id_municipio FROM municipios WHERE id_municipio = ? AND departamento_id = ?',
        [newPuntoVenta.municipio, newPuntoVenta.departamento],
      );

      if (!municipalityRows || municipalityRows.length === 0) {
        throw new HttpException(
          'El municipio especificado no existe o no pertenece al departamento indicado',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 4. CORREGIDO: Crear el punto de venta usando executeNonSelectQuery
      const insertResult = await this.baseService.executeNonSelectQuery(
        `INSERT INTO puntos_venta 
         (negocio_id, nombre, ubicacion, latitud, longitud, responsable, telefono, activo, nota, departamento, municipio) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newPuntoVenta.negocio_id,
          newPuntoVenta.nombre,
          newPuntoVenta.ubicacion,
          newPuntoVenta.latitud || null,
          newPuntoVenta.longitud || null,
          newPuntoVenta.responsable || null,
          newPuntoVenta.telefono || null,
          newPuntoVenta.activo !== undefined ? newPuntoVenta.activo : 1,
          newPuntoVenta.nota || null,
          newPuntoVenta.departamento,
          newPuntoVenta.municipio,
        ],
      );

      // 5. Obtener el ID del registro insertado
      const insertId = insertResult.insertId;

      // 6. Consultar el registro recién creado
      const newPointSale = await this.baseService.executeQuery(
        'SELECT * FROM puntos_venta WHERE id = ?',
        [insertId],
      );

      // 7. Verificar que se encontró el registro
      if (!newPointSale || newPointSale.length === 0) {
        throw new HttpException(
          'Error al recuperar el punto de venta creado',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return newPointSale[0];
    } catch (error) {
      // Si ya es una HttpException, verificar si es error de duplicación
      if (error instanceof HttpException) {
        if (
          error.getStatus() === HttpStatus.CONFLICT &&
          error.message.includes('Duplicate entry')
        ) {
          throw new HttpException(
            'Ya existe un punto de venta con el mismo nombre o ubicación en este negocio',
            HttpStatus.CONFLICT,
          );
        }
        throw error;
      }

      // Si es otro tipo de error, lo envolvemos
      throw new HttpException(
        error.message || 'Error al crear el punto de venta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método para obtener un punto de venta específico por ID
  async getPointSaleById(userId: string, pointSaleId: number) {
    try {
      // CORREGIDO: Consulta simplificada sin JOIN problemático
      const pointSale = await this.baseService.executeQuery(
        `SELECT pv.*, n.nombre as negocio_nombre
         FROM puntos_venta pv
         INNER JOIN negocios n ON pv.negocio_id = n.id
         WHERE pv.id = ? AND n.propietario = ?`,
        [pointSaleId, userId],
      );

      if (!pointSale || pointSale.length === 0) {
        throw new HttpException(
          'El punto de venta no existe o no tienes permisos para acceder a él',
          HttpStatus.NOT_FOUND,
        );
      }

      return pointSale[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error al obtener el punto de venta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // CORREGIDO: Método para obtener puntos de venta por negocio
  async getPointsSaleByBusiness(userId: string, businessId: number) {
    try {
      await this.baseService.verifyBusinessAccess(businessId, userId);

      // Consulta simplificada sin JOIN problemático
      const pointsSale = await this.baseService.executeQuery(
        `SELECT pv.*
         FROM puntos_venta pv
         WHERE pv.negocio_id = ?
         ORDER BY pv.fecha_creacion DESC`,
        [businessId],
      );

      return pointsSale;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error al obtener los puntos de venta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método para actualizar punto de venta
  async updatePointSale(
    userId: string,
    pointSaleId: number,
    updateData: Partial<UpdatePointSaleDto>,
  ) {
    try {
      // Verificar que el punto de venta existe y pertenece al usuario
      const pointSaleExists = await this.baseService.executeQuery(
        `SELECT pv.*, pv.negocio_id 
         FROM puntos_venta pv
         INNER JOIN negocios n ON pv.negocio_id = n.id
         WHERE pv.id = ? AND n.propietario = ?`,
        [pointSaleId, userId],
      );

      if (!pointSaleExists || pointSaleExists.length === 0) {
        throw new HttpException(
          'El punto de venta no existe o no tienes permisos para modificarlo',
          HttpStatus.NOT_FOUND,
        );
      }

      // Si se actualiza departamento/municipio, validar
      if (updateData.departamento && updateData.municipio) {
        const municipalityRows = await this.baseService.executeQuery(
          'SELECT id_municipio FROM municipios WHERE id_municipio = ? AND departamento_id = ?',
          [updateData.municipio, updateData.departamento],
        );

        if (!municipalityRows || municipalityRows.length === 0) {
          throw new HttpException(
            'El municipio especificado no existe o no pertenece al departamento indicado',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Construir query de actualización dinámicamente
      const updateFields: any = [];
      const updateValues: any = [];

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined && key !== 'negocio_id') {
          updateFields.push(`${key} = ?`);
          updateValues.push(updateData[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new HttpException(
          'No se proporcionaron campos para actualizar',
          HttpStatus.BAD_REQUEST,
        );
      }

      updateValues.push(pointSaleId);

      await this.baseService.executeNonSelectQuery(
        `UPDATE puntos_venta SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        updateValues,
      );

      // Retornar el registro actualizado
      const updatedPointSale = await this.baseService.executeQuery(
        'SELECT * FROM puntos_venta WHERE id = ?',
        [pointSaleId],
      );

      return updatedPointSale[0];
    } catch (error) {
      if (error instanceof HttpException) {
        if (
          error.getStatus() === HttpStatus.CONFLICT &&
          error.message.includes('Duplicate entry')
        ) {
          throw new HttpException(
            'Ya existe otro punto de venta con el mismo nombre o ubicación en este negocio',
            HttpStatus.CONFLICT,
          );
        }
        throw error;
      }

      throw new HttpException(
        'Error al actualizar el punto de venta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // CORREGIDO: Servicio de puntos activos
  async getActivePointsSaleByBusiness(userId: string, businessId: number) {
    try {
      await this.baseService.verifyBusinessAccess(businessId, userId);

      // Consulta simplificada sin JOIN problemático
      const activePointsSale = await this.baseService.executeQuery(
        `SELECT pv.*
         FROM puntos_venta pv
         WHERE pv.negocio_id = ? AND pv.activo = 1
         ORDER BY pv.nombre ASC`,
        [businessId],
      );

      return activePointsSale;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error al obtener los puntos de venta activos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 🚀 MÉTODO MEJORADO: Actualizar solo el estado activo/inactivo con validación
  async updatePointSaleStatus(
    userId: string,
    pointSaleId: number,
    statusDto: UpdatePuntoVentaStatusDto,
  ) {
    try {
      // Verificar que el punto de venta existe
      const pointSaleRows = await this.baseService.executeQuery(
        'SELECT * FROM puntos_venta WHERE id = ?',
        [pointSaleId],
      );

      if (!pointSaleRows || pointSaleRows.length === 0) {
        throw new HttpException(
          'El punto de venta especificado no existe',
          HttpStatus.NOT_FOUND,
        );
      }

      const pointSale = pointSaleRows[0];

      // Verificar que el negocio existe y pertenece al usuario
      await this.baseService.verifyBusinessAccess(pointSale.negocio_id, userId);

      // 🔥 NUEVA VALIDACIÓN: Si intenta desactivar, verificar que no sea el último punto activo
      if (!statusDto.activo) {
        const activePointsRows = await this.baseService.executeQuery(
          'SELECT COUNT(*) as total_activos FROM puntos_venta WHERE negocio_id = ? AND activo = 1',
          [pointSale.negocio_id],
        );

        const totalActivos = activePointsRows[0].total_activos;

        // Si solo hay 1 activo y es el que se quiere desactivar, no permitirlo
        if (totalActivos <= 1 && pointSale.activo === 1) {
          throw new HttpException(
            'No puedes desactivar el último punto de venta activo. Un negocio debe tener al menos un punto de venta activo',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Actualizar solo el campo 'activo' y el timestamp
      const activoValue = statusDto.activo ? 1 : 0;

      await this.baseService.executeNonSelectQuery(
        'UPDATE puntos_venta SET activo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [activoValue, pointSaleId],
      );

      // Obtener el registro actualizado
      const updatedRecord = await this.baseService.executeQuery(
        'SELECT * FROM puntos_venta WHERE id = ?',
        [pointSaleId],
      );

      // 📊 CONTAR PUNTOS ACTIVOS DESPUÉS DE LA ACTUALIZACIÓN
      const finalActivePointsRows = await this.baseService.executeQuery(
        'SELECT COUNT(*) as total_activos FROM puntos_venta WHERE negocio_id = ? AND activo = 1',
        [pointSale.negocio_id],
      );

      const totalActivosRestantes = finalActivePointsRows[0].total_activos;

      // Convertir el campo activo a booleano para la respuesta
      const updatedPointSale = {
        ...updatedRecord[0],
        activo: updatedRecord[0].activo === 1,
        mensaje: `El punto de venta ha sido ${statusDto.activo ? 'activado' : 'desactivado'} correctamente`,
        puntos_activos_restantes: totalActivosRestantes, // 🆕 NUEVA INFORMACIÓN
        negocio_id: pointSale.negocio_id,
      };

      return updatedPointSale;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Error al actualizar el estado del punto de venta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 🚀 NUEVO MÉTODO: Obtener estadísticas de puntos de venta por negocio
  async getPointSaleStats(userId: string, businessId: number) {
    try {
      await this.baseService.verifyBusinessAccess(businessId, userId);

      const statsRows = await this.baseService.executeQuery(
        `SELECT 
          COUNT(*) as total_puntos,
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as puntos_activos,
          SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as puntos_inactivos
         FROM puntos_venta 
         WHERE negocio_id = ?`,
        [businessId],
      );

      return {
        total_puntos: statsRows[0].total_puntos,
        puntos_activos: statsRows[0].puntos_activos,
        puntos_inactivos: statsRows[0].puntos_inactivos,
        negocio_id: businessId,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error al obtener las estadísticas de puntos de venta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método para eliminar punto de venta
  async deletePointSale(pointSaleId: number, userId: string) {
    try {
      // Verificar que el punto de venta existe y pertenece a un negocio del usuario
      const pointSaleRows = await this.baseService.executeQuery(
        `SELECT pv.id, pv.negocio_id, pv.activo
         FROM puntos_venta pv 
         INNER JOIN negocios n ON pv.negocio_id = n.id 
         WHERE pv.id = ? AND n.propietario = ?`,
        [pointSaleId, userId],
      );

      if (!pointSaleRows || pointSaleRows.length === 0) {
        throw new HttpException(
          'El punto de venta no existe o no tienes permisos para eliminarlo',
          HttpStatus.NOT_FOUND,
        );
      }

      const pointSale = pointSaleRows[0];

      // ✅ VALIDACIÓN MEJORADA: Verificar que no es el último punto de venta activo
      const activePointsRows = await this.baseService.executeQuery(
        'SELECT COUNT(*) as total_activos FROM puntos_venta WHERE negocio_id = ? AND activo = 1',
        [pointSale.negocio_id],
      );

      const totalPuntosActivos = activePointsRows[0].total_activos;

      // Si es el último punto activo y está activo, no permitir eliminación
      if (totalPuntosActivos <= 1 && pointSale.activo === 1) {
        throw new HttpException(
          'No puedes eliminar el último punto de venta activo. Un negocio debe tener al menos un punto de venta activo',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Eliminar el punto de venta
      await this.baseService.executeNonSelectQuery(
        'DELETE FROM puntos_venta WHERE id = ?',
        [pointSaleId],
      );

      // 📊 OBTENER ESTADÍSTICAS FINALES
      const finalStatsRows = await this.baseService.executeQuery(
        `SELECT 
          COUNT(*) as total_puntos,
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as puntos_activos
         FROM puntos_venta 
         WHERE negocio_id = ?`,
        [pointSale.negocio_id],
      );

      return {
        success: true,
        message: 'Punto de venta eliminado correctamente',
        puntos_activos_restantes: finalStatsRows[0].puntos_activos,
        total_puntos_restantes: finalStatsRows[0].total_puntos,
        negocio_id: pointSale.negocio_id,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Error al eliminar el punto de venta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
