import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BaseService } from 'src/common/base.service';
import CreateBusinessDto from './dto/CreateBusiness';
import { PoolConnection } from 'mysql2/promise';
import { CreateBusinessWithPointsDto } from './dto/CreateBusinessWithPointsDto.dto';
import { UpdateBusinessDto } from './dto/updateBusiness.dto';

@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);

  constructor(private readonly baseService: BaseService) {}

  // Método existente para crear negocio simple
  async create(userId: string, newBusiness: CreateBusinessDto) {
    try {
      const userRows = await this.baseService.executeQuery(
        'SELECT id FROM users WHERE id = ?',
        [userId],
      );

      if (!userRows || userRows.length === 0) {
        throw new HttpException(
          'El usuario especificado no existe',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.baseService.executeNonSelectQuery(
        'INSERT INTO negocios (nombre, nit, direccion, telefono, email, propietario) VALUES (?, ?, ?, ?, ?, ?)',
        [
          newBusiness.nombre,
          newBusiness.nit,
          newBusiness.direccion || null,
          newBusiness.telefono || null,
          newBusiness.email || null,
          userId,
        ],
      );

      const createdBusiness = await this.baseService.executeQuery(
        'SELECT * FROM negocios WHERE id = ?',
        [result.insertId],
      );

      return createdBusiness[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al crear el negocio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método para crear negocio con puntos de venta
  async createBusinessWithPoints(
    userId: string,
    businessData: CreateBusinessWithPointsDto,
  ) {
    const pool = this.baseService.getPool();
    let connection: PoolConnection | null = null;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // 1. Verificar que el usuario existe
      const [userRows]: [any[], any] = await connection.query(
        'SELECT id FROM users WHERE id = ?',
        [userId],
      );

      if (!userRows || userRows.length === 0) {
        throw new HttpException(
          'El usuario especificado no existe',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. Verificar departamento y municipio del negocio
      const [deptRows]: [any[], any] = await connection.query(
        'SELECT id_departamento, departamento FROM departamentos WHERE id_departamento = ?',
        [businessData.departamento],
      );

      if (!deptRows || deptRows.length === 0) {
        throw new HttpException(
          'El departamento especificado no existe',
          HttpStatus.BAD_REQUEST,
        );
      }

      const [muniRows]: [any[], any] = await connection.query(
        'SELECT id_municipio, municipio FROM municipios WHERE id_municipio = ? AND departamento_id = ?',
        [businessData.municipio, businessData.departamento],
      );

      if (!muniRows || muniRows.length === 0) {
        throw new HttpException(
          'El municipio especificado no existe o no pertenece al departamento',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. Crear el negocio
      const [businessResult]: [any, any] = await connection.query(
        `INSERT INTO negocios 
         (nombre, nit, direccion, telefono, email, propietario, departamento, municipio) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          businessData.nombre,
          businessData.nit || null,
          businessData.direccion,
          businessData.telefono,
          businessData.email,
          userId,
          businessData.departamento,
          businessData.municipio,
        ],
      );

      const businessId = businessResult.insertId;

      // 4. Validar y crear los puntos de venta
      const createdPoints: any[] = [];

      if (!businessData.puntosVenta || businessData.puntosVenta.length === 0) {
        throw new HttpException(
          'Debe incluir al menos un punto de venta',
          HttpStatus.BAD_REQUEST,
        );
      }

      for (let i = 0; i < businessData.puntosVenta.length; i++) {
        const punto = businessData.puntosVenta[i];

        this.logger.log(
          `Procesando punto de venta ${i + 1}/${businessData.puntosVenta.length}: ${punto.nombre}`,
        );

        // Verificar departamento del punto
        const [puntoDeptRows]: [any[], any] = await connection.query(
          'SELECT id_departamento, departamento FROM departamentos WHERE id_departamento = ?',
          [punto.departamento],
        );

        if (!puntoDeptRows || puntoDeptRows.length === 0) {
          throw new HttpException(
            `El departamento no existe para el punto de venta "${punto.nombre}"`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // Verificar municipio del punto
        const [puntoMuniRows]: [any[], any] = await connection.query(
          'SELECT id_municipio, municipio FROM municipios WHERE id_municipio = ? AND departamento_id = ?',
          [punto.municipio, punto.departamento],
        );

        if (!puntoMuniRows || puntoMuniRows.length === 0) {
          throw new HttpException(
            `El municipio no existe o no pertenece al departamento para el punto "${punto.nombre}"`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // Insertar punto de venta (latitud y longitud quedan NULL por ahora)
        const [pointResult]: [any, any] = await connection.query(
          `INSERT INTO puntos_venta 
           (negocio_id, nombre, ubicacion, responsable, telefono, departamento, municipio, nota, activo) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            businessId,
            punto.nombre,
            punto.ubicacion,
            punto.responsable || null,
            punto.telefono || null,
            punto.departamento,
            punto.municipio,
            punto.nota || null,
          ],
        );

        // Obtener el punto creado
        const [createdPoint] = await connection.query(
          `SELECT 
            pv.*,
            d.departamento as departamento_nombre,
            m.municipio as municipio_nombre
           FROM puntos_venta pv
           LEFT JOIN departamentos d ON pv.departamento = d.id_departamento
           LEFT JOIN municipios m ON pv.municipio = m.id_municipio
           WHERE pv.id = ?`,
          [pointResult.insertId],
        );

        createdPoints.push(createdPoint[0]);
      }

      // 5. Obtener el negocio creado con detalles completos
      const [createdBusiness] = await connection.query(
        `SELECT 
          n.id,
          n.nombre,
          n.nit,
          n.direccion,
          n.telefono,
          n.email,
          n.fecha_creacion,
          n.propietario,
          n.created_at,
          d.departamento as departamento_nombre,
          m.municipio as municipio_nombre,
          n.departamento as departamento_id,
          n.municipio as municipio_id
        FROM negocios n
        LEFT JOIN departamentos d ON n.departamento = d.id_departamento
        LEFT JOIN municipios m ON n.municipio = m.id_municipio
        WHERE n.id = ?`,
        [businessId],
      );

      // Confirmar la transacción
      await connection.commit();

      this.logger.log(
        `✅ Negocio creado exitosamente con ${createdPoints.length} puntos de venta`,
      );

      return {
        success: true,
        message: 'Negocio y puntos de venta creados exitosamente',
        business: createdBusiness[0],
        puntosVenta: createdPoints,
        totalPuntosCreados: createdPoints.length,
      };
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Error al crear el negocio con puntos de venta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // 🆕 Método para actualizar negocio
  async update(businessId: number, userId: string, updateBusinessDto: UpdateBusinessDto) {
    try {
      // Verificar que el negocio existe y pertenece al usuario
      await this.baseService.verifyBusinessAccess(businessId, userId);

      // Construir la consulta de actualización dinámicamente
      const fieldsToUpdate: string[] = [];
      const values: any[] = [];

      if (updateBusinessDto.nombre !== undefined) {
        fieldsToUpdate.push('nombre = ?');
        values.push(updateBusinessDto.nombre);
      }
      if (updateBusinessDto.nit !== undefined) {
        fieldsToUpdate.push('nit = ?');
        values.push(updateBusinessDto.nit);
      }
      if (updateBusinessDto.email !== undefined) {
        fieldsToUpdate.push('email = ?');
        values.push(updateBusinessDto.email);
      }
      if (updateBusinessDto.telefono !== undefined) {
        fieldsToUpdate.push('telefono = ?');
        values.push(updateBusinessDto.telefono);
      }
      if (updateBusinessDto.direccion !== undefined) {
        fieldsToUpdate.push('direccion = ?');
        values.push(updateBusinessDto.direccion);
      }

      if (fieldsToUpdate.length === 0) {
        throw new HttpException(
          'No hay campos para actualizar',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Agregar el ID al final de los valores
      values.push(businessId);

      const query = `UPDATE negocios SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

      await this.baseService.executeNonSelectQuery(query, values);

      // Obtener el negocio actualizado
      const updatedBusiness = await this.baseService.executeQuery(
        `SELECT 
          n.id,
          n.nombre,
          n.nit,
          n.direccion,
          n.telefono,
          n.email,
          n.fecha_creacion,
          n.created_at,
          d.departamento as departamento_nombre,
          m.municipio as municipio_nombre,
          n.departamento as departamento_id,
          n.municipio as municipio_id
        FROM negocios n
        LEFT JOIN departamentos d ON n.departamento = d.id_departamento
        LEFT JOIN municipios m ON n.municipio = m.id_municipio
        WHERE n.id = ?`,
        [businessId],
      );

      return {
        success: true,
        message: 'Negocio actualizado exitosamente',
        data: updatedBusiness[0],
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al actualizar el negocio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método existente para obtener negocios del usuario
  async findByUser(userId: string) {
    try {
      const userRows = await this.baseService.executeQuery(
        'SELECT id FROM users WHERE id = ?',
        [userId],
      );

      if (!userRows || userRows.length === 0) {
        throw new HttpException(
          'El usuario especificado no existe',
          HttpStatus.BAD_REQUEST,
        );
      }

      const businesses = await this.baseService.executeQuery(
        `SELECT 
          n.id,
          n.nombre,
          n.nit,
          n.direccion,
          n.telefono,
          n.email,
          n.fecha_creacion,
          n.propietario,
          n.created_at,
          d.departamento as departamento_nombre,
          m.municipio as municipio_nombre,
          n.departamento as departamento_id,
          n.municipio as municipio_id
        FROM negocios n
        LEFT JOIN departamentos d ON n.departamento = d.id_departamento
        LEFT JOIN municipios m ON n.municipio = m.id_municipio
        WHERE n.propietario = ?
        ORDER BY n.created_at DESC`,
        [userId],
      );

      return businesses;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al obtener los negocios del usuario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método existente para eliminar negocio
  async deleteBusiness(businessId: number, userId: string) {
    const pool = this.baseService.getPool();
    let connection: PoolConnection | null = null;

    try {
      connection = await pool.getConnection();

      const businessRows = await this.baseService.executeQuery(
        'SELECT id FROM negocios WHERE id = ? AND propietario = ?',
        [businessId, userId],
      );

      if (!businessRows || businessRows.length === 0) {
        throw new HttpException(
          'El negocio no existe o no tienes permisos para eliminarlo',
          HttpStatus.NOT_FOUND,
        );
      }

      await connection.beginTransaction();

      try {
        await connection.query(
          'DELETE FROM puntos_venta WHERE negocio_id = ?',
          [businessId],
        );

        await connection.query('DELETE FROM negocios WHERE id = ?', [
          businessId,
        ]);

        await connection.commit();

        return {
          success: true,
          message:
            'Negocio eliminado correctamente junto con todos sus puntos de venta',
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al eliminar el negocio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // Método para obtener un negocio con sus puntos de venta
  async getBusinessWithPoints(businessId: number, userId: string) {
    try {
      await this.baseService.verifyBusinessAccess(businessId, userId);

      const business = await this.baseService.executeQuery(
        `SELECT 
          n.id,
          n.nombre,
          n.nit,
          n.direccion,
          n.telefono,
          n.email,
          n.fecha_creacion,
          n.created_at,
          d.departamento as departamento_nombre,
          m.municipio as municipio_nombre,
          n.departamento as departamento_id,
          n.municipio as municipio_id
        FROM negocios n
        LEFT JOIN departamentos d ON n.departamento = d.id_departamento
        LEFT JOIN municipios m ON n.municipio = m.id_municipio
        WHERE n.id = ?`,
        [businessId],
      );

      if (!business || business.length === 0) {
        throw new HttpException('Negocio no encontrado', HttpStatus.NOT_FOUND);
      }

      const puntosVenta = await this.baseService.executeQuery(
        `SELECT 
          pv.*,
          d.departamento as departamento_nombre,
          m.municipio as municipio_nombre
        FROM puntos_venta pv
        LEFT JOIN departamentos d ON pv.departamento = d.id_departamento
        LEFT JOIN municipios m ON pv.municipio = m.id_municipio
        WHERE pv.negocio_id = ?
        ORDER BY pv.fecha_creacion DESC`,
        [businessId],
      );

      return {
        business: business[0],
        puntosVenta: puntosVenta,
        totalPuntos: puntosVenta.length,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al obtener el negocio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}