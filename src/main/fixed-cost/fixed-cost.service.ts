import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { BaseService } from 'src/common/base.service';
import { createFixedCost } from '../financial-analysis/dto/createFixedCost.dto';
import { UpdateFixedCostDto } from '../financial-analysis/dto/updateFixedCost.dto';

@Injectable()
export class FixedCostService {
  
  constructor(private readonly baseService: BaseService) {}

  async getFixedCostConfiguration(businessId: number, userId: string) {
    try {
      // Verify business access
      await this.baseService.verifyBusinessAccess(businessId, userId);

      // Get fixed costs configuration
      const fixedCosts = await this.baseService.executeQuery(
        `SELECT
           ccf.id,
           ccf.negocio_id,
           ccf.categoria_egreso_id,
           ccf.monto_mensual,
           ccf.descripcion,
           ccf.activo,
           ccf.fecha_creacion,
           ccf.ultima_actualizacion,
           ce.nombre as categoria_nombre
         FROM configuracion_costos_fijos ccf
         JOIN categorias_egresos ce ON ccf.categoria_egreso_id = ce.id
         WHERE ccf.negocio_id = ?
         ORDER BY ccf.fecha_creacion DESC`,
        [businessId],
      );

      return fixedCosts;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al obtener los costos fijos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createFixedCostConfiguration(
    userId: string,
    newFixedCost: createFixedCost,
  ) {
    const pool = this.baseService.getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Verify business exists and belongs to user
      const businessRows = await this.baseService.executeQuery(
        'SELECT id, nombre FROM negocios WHERE id = ? AND propietario = ?',
        [newFixedCost.negocio_id, userId],
      );

      if (!businessRows.length) {
        throw new HttpException(
          'El negocio no existe o no tienes permisos para acceder a él',
          HttpStatus.NOT_FOUND,
        );
      }

      // Verify category exists
      const categoryRows = await this.baseService.executeQuery(
        'SELECT id, nombre FROM categorias_egresos WHERE id = ?',
        [newFixedCost.categoria_egreso_id],
      );

      if (!categoryRows.length) {
        throw new HttpException(
          'La categoría de egreso especificada no existe',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Insert new fixed cost configuration
      const insertResult = await this.baseService.executeNonSelectQuery(
        `INSERT INTO configuracion_costos_fijos 
         (negocio_id, categoria_egreso_id, descripcion, monto_mensual)
         VALUES (?, ?, ?, ?)`,
        [
          newFixedCost.negocio_id,
          newFixedCost.categoria_egreso_id,
          newFixedCost.descripcion || null,
          newFixedCost.monto_mensual,
        ],
      );

      // Get the created record with all details
      const createdRecord = await this.baseService.executeQuery(
        `SELECT 
           ccf.id,
           ccf.negocio_id,
           ccf.categoria_egreso_id,
           ccf.monto_mensual,
           ccf.descripcion,
           ccf.activo,
           ccf.fecha_creacion,
           ccf.ultima_actualizacion,
           n.nombre as negocio_nombre,
           ce.nombre as categoria_nombre
         FROM configuracion_costos_fijos ccf
         JOIN negocios n ON ccf.negocio_id = n.id
         JOIN categorias_egresos ce ON ccf.categoria_egreso_id = ce.id
         WHERE ccf.id = ?`,
        [insertResult.insertId],
      );

      await connection.commit();

      return {
        success: true,
        message: 'Configuración de costo fijo creada exitosamente',
        data: createdRecord[0],
      };
    } catch (error) {
      await connection.rollback();
      
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al crear la configuración de costo fijo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      connection.release();
    }
  }

  async updateFixedCostConfiguration(
    userId: string,
    fixedCostId: number,
    updateFixedCostDto: UpdateFixedCostDto,
  ) {
    const pool = this.baseService.getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Verify fixed cost exists and user has permission
      const fixedCostRows = await this.baseService.executeQuery(
        `SELECT ccf.*, n.propietario 
         FROM configuracion_costos_fijos ccf 
         JOIN negocios n ON ccf.negocio_id = n.id 
         WHERE ccf.id = ?`,
        [fixedCostId],
      );

      if (!fixedCostRows.length) {
        throw new HttpException(
          'La configuración de costo fijo especificada no existe',
          HttpStatus.NOT_FOUND,
        );
      }

      const fixedCost = fixedCostRows[0];

      if (fixedCost.propietario !== userId) {
        throw new HttpException(
          'No tienes permisos para actualizar esta configuración de costo fijo',
          HttpStatus.FORBIDDEN,
        );
      }

      // Verify category exists if provided
      if (updateFixedCostDto.categoria_egreso_id) {
        const categoryRows = await this.baseService.executeQuery(
          'SELECT id FROM categorias_egresos WHERE id = ?',
          [updateFixedCostDto.categoria_egreso_id],
        );

        if (!categoryRows.length) {
          throw new HttpException(
            'La categoría de egreso especificada no existe',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Build update fields
      const updateFields = this.buildUpdateFields(updateFixedCostDto);

      // If no fields to update, return current record
      if (updateFields.fields.length === 1) { // Only timestamp field
        await connection.commit();

        const currentRecord = await this.getDetailedFixedCost(fixedCostId);
        return {
          success: true,
          message: 'No se realizaron cambios en la configuración',
          data: currentRecord,
        };
      }

      // Update the record
      updateFields.values.push(fixedCostId);
      await this.baseService.executeNonSelectQuery(
        `UPDATE configuracion_costos_fijos SET ${updateFields.fields.join(', ')} WHERE id = ?`,
        updateFields.values,
      );

      const updatedRecord = await this.getDetailedFixedCost(fixedCostId);
      await connection.commit();

      return {
        success: true,
        message: 'Configuración de costo fijo actualizada exitosamente',
        data: updatedRecord,
      };
    } catch (error) {
      await connection.rollback();
      
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al actualizar la configuración de costo fijo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      connection.release();
    }
  }

  async deleteFixedCostConfiguration(fixedCostId: number, userId: string) {
    const pool = this.baseService.getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Verify fixed cost exists and user has permission
      const existingRows = await this.baseService.executeQuery(
        `SELECT ccf.id, ccf.negocio_id, n.nombre as negocio_nombre
         FROM configuracion_costos_fijos ccf
         JOIN negocios n ON ccf.negocio_id = n.id
         WHERE ccf.id = ? AND n.propietario = ?`,
        [fixedCostId, userId],
      );

      if (!existingRows.length) {
        throw new HttpException(
          'La configuración de costo fijo no existe o no tienes permisos para eliminarla',
          HttpStatus.NOT_FOUND,
        );
      }

      // Delete the record
      const deleteResult = await this.baseService.executeNonSelectQuery(
        'DELETE FROM configuracion_costos_fijos WHERE id = ?',
        [fixedCostId],
      );

      if (deleteResult.affectedRows === 0) {
        throw new HttpException(
          'No se pudo eliminar la configuración de costo fijo',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      await connection.commit();

      return {
        success: true,
        message: 'Configuración de costo fijo eliminada exitosamente',
        data: {
          id: fixedCostId,
          negocio_id: existingRows[0].negocio_id,
          negocio_nombre: existingRows[0].negocio_nombre,
        },
      };
    } catch (error) {
      await connection.rollback();
      
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al eliminar la configuración de costo fijo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      connection.release();
    }
  }

  async generateFixedCosts(negocioId: number, año?: number, mes?: number) {
    try {
      const now = new Date();
      const targetAño = año || now.getFullYear();
      const targetMes = mes || now.getMonth() + 1;

      // Here you would call the method to generate fixed costs
      // await this.generarCostosFijosPorNegocio(negocioId, targetAño, targetMes);

      return {
        message: `Costos fijos generados para ${targetMes}/${targetAño}`,
        negocioId,
        año: targetAño,
        mes: targetMes,
      };
    } catch (error) {
      throw new HttpException(
        'Error al generar costos fijos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFixedCostsHistory(businessId: number, userId: string) {
    try {
      // Verify business access
      await this.baseService.verifyBusinessAccess(businessId, userId);

      // Get total fixed costs for the business
      const totalCosts = await this.baseService.executeQuery(
        `SELECT SUM(ccf.monto_mensual) as total_costos_mes 
         FROM configuracion_costos_fijos ccf 
         WHERE ccf.negocio_id = ?`,
        [businessId],
      );

      return totalCosts;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al obtener el historial de costos fijos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Private helper methods
  private buildUpdateFields(updateData: UpdateFixedCostDto): {
    fields: string[];
    values: any[];
  } {
    const fields: string[] = [];
    const values: any[] = [];

    const fieldsToUpdate = [
      'categoria_egreso_id',
      'monto_mensual',
      'descripcion',
    ];

    fieldsToUpdate.forEach((field) => {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = ?`);
        
        if (field === 'descripcion') {
          values.push(updateData[field] || null);
        } else {
          values.push(updateData[field]);
        }
      }
    });

    fields.push('ultima_actualizacion = CURRENT_TIMESTAMP');

    return { fields, values };
  }

  private async getDetailedFixedCost(fixedCostId: number) {
    const records = await this.baseService.executeQuery(
      `SELECT 
         ccf.id,
         ccf.negocio_id,
         ccf.categoria_egreso_id,
         ccf.monto_mensual,
         ccf.descripcion,
         ccf.activo,
         ccf.fecha_creacion,
         ccf.ultima_actualizacion,
         n.nombre as negocio_nombre,
         ce.nombre as categoria_nombre
       FROM configuracion_costos_fijos ccf
       JOIN negocios n ON ccf.negocio_id = n.id
       JOIN categorias_egresos ce ON ccf.categoria_egreso_id = ce.id
       WHERE ccf.id = ?`,
      [fixedCostId],
    );

    return records[0];
  }
}