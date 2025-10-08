import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/CreateUserDto';
import { BaseService } from 'src/common/base.service';
import { UpdateUserDto } from './dto/updateUser.dto';
import { PoolConnection } from 'mysql2/promise';

@Injectable()
export class UserService {
  constructor(private baseService: BaseService) {}

  async getUserByEmail(email: string) {
    try {
      const users = await this.baseService.executeQuery(
        'SELECT * FROM users WHERE email = ?',
        [email],
      );

      if (users.length === 0) {
        throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
      }

      return users[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al obtener usuario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findById(id: string) {
    try {
      const users = await this.baseService.executeQuery(
        `SELECT 
          id, 
          email, 
          nombres, 
          apellidos, 
          telefono, 
          documento, 
          fecha_nacimiento, 
          role, 
          is_active, 
          created_at,
          updated_at
        FROM users 
        WHERE id = ?`,
        [id],
      );

      if (users.length === 0) {
        throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: users[0],
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al obtener usuario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(newUser: CreateUserDto) {
    try {
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(newUser.password, 10);

      // Insertar usuario (el UUID se genera automáticamente)
      await this.baseService.executeNonSelectQuery(
        `INSERT INTO users (email, password, nombres, apellidos, telefono, documento, fecha_nacimiento)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newUser.email,
          hashedPassword,
          newUser.nombres,
          newUser.apellidos,
          newUser.telefono || null,
          newUser.documento || null,
          newUser.fecha_nacimiento || null,
        ],
      );

      // Obtener el usuario recién creado por su email (que es único)
      const users = await this.baseService.executeQuery(
        'SELECT id, email, nombres, apellidos, telefono, documento, fecha_nacimiento, role, is_active, created_at FROM users WHERE email = ?',
        [newUser.email],
      );

      return {
        success: true,
        message: 'Usuario registrado exitosamente',
        user: users[0],
      };
    } catch (error) {
      // Manejo de errores de duplicados
      if (error.status === HttpStatus.CONFLICT) {
        if (error.message.includes('email')) {
          throw new HttpException(
            'El email ya está registrado',
            HttpStatus.CONFLICT,
          );
        }
        if (error.message.includes('documento')) {
          throw new HttpException(
            'El documento ya está registrado',
            HttpStatus.CONFLICT,
          );
        }
        throw new HttpException('El registro ya existe', HttpStatus.CONFLICT);
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error al registrar el usuario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      // Verificar que el usuario existe
      const existingUser = await this.baseService.executeQuery(
        'SELECT id FROM users WHERE id = ?',
        [id],
      );

      if (existingUser.length === 0) {
        throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
      }

      // Construir la consulta de actualización dinámicamente
      const fieldsToUpdate: string[] = [];
      const values: any[] = [];

      if (updateUserDto.nombres !== undefined) {
        fieldsToUpdate.push('nombres = ?');
        values.push(updateUserDto.nombres);
      }
      if (updateUserDto.apellidos !== undefined) {
        fieldsToUpdate.push('apellidos = ?');
        values.push(updateUserDto.apellidos);
      }
      if (updateUserDto.email !== undefined) {
        fieldsToUpdate.push('email = ?');
        values.push(updateUserDto.email);
      }
      if (updateUserDto.telefono !== undefined) {
        fieldsToUpdate.push('telefono = ?');
        values.push(updateUserDto.telefono);
      }
      if (updateUserDto.documento !== undefined) {
        fieldsToUpdate.push('documento = ?');
        values.push(updateUserDto.documento);
      }
      if (updateUserDto.fecha_nacimiento !== undefined) {
        fieldsToUpdate.push('fecha_nacimiento = ?');
        values.push(updateUserDto.fecha_nacimiento);
      }

      // Si hay contraseña, hashearla
      if (updateUserDto.password) {
        const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
        fieldsToUpdate.push('password = ?');
        values.push(hashedPassword);
      }

      if (fieldsToUpdate.length === 0) {
        throw new HttpException(
          'No hay campos para actualizar',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Agregar updated_at
      fieldsToUpdate.push('updated_at = CURRENT_TIMESTAMP');

      // Agregar el ID al final de los valores
      values.push(id);

      const query = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

      await this.baseService.executeNonSelectQuery(query, values);

      // Obtener el usuario actualizado
      const updatedUsers = await this.baseService.executeQuery(
        `SELECT 
          id, 
          email, 
          nombres, 
          apellidos, 
          telefono, 
          documento, 
          fecha_nacimiento, 
          role, 
          is_active, 
          created_at,
          updated_at
        FROM users 
        WHERE id = ?`,
        [id],
      );

      return {
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: updatedUsers[0],
      };
    } catch (error) {
      // Manejo de errores de duplicados
      if (error.status === HttpStatus.CONFLICT) {
        if (error.message.includes('email')) {
          throw new HttpException(
            'El email ya está registrado',
            HttpStatus.CONFLICT,
          );
        }
        if (error.message.includes('documento')) {
          throw new HttpException(
            'El documento ya está registrado',
            HttpStatus.CONFLICT,
          );
        }
        throw new HttpException(
          'El registro ya existe',
          HttpStatus.CONFLICT,
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error al actualizar el usuario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

 async delete(id: string) {
  const pool = this.baseService.getPool();
  let connection: PoolConnection | null = null;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verificar que el usuario existe
    const [existingUser]: [any[], any] = await connection.query(
      'SELECT id, email FROM users WHERE id = ?',
      [id],
    );

    if (!existingUser || existingUser.length === 0) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    // 1. Obtener todos los negocios del usuario
    const [userBusinesses]: [any[], any] = await connection.query(
      'SELECT id FROM negocios WHERE propietario = ?',
      [id],
    );

    let totalProductosEliminados = 0;
    let totalPuntosVentaEliminados = 0;
    let totalTransaccionesEliminadas = 0;
    let totalDetallesEliminados = 0;

    // 2. Para cada negocio, eliminar todas sus relaciones
    for (const business of userBusinesses) {
      const businessId = business.id;

      // Obtener todos los puntos de venta del negocio
      const [puntosVenta]: [any[], any] = await connection.query(
        'SELECT id FROM puntos_venta WHERE negocio_id = ?',
        [businessId],
      );

      // Para cada punto de venta, eliminar sus transacciones y detalles
      for (const punto of puntosVenta) {
        const puntoVentaId = punto.id;

        // Obtener transacciones del punto de venta
        const [transacciones]: [any[], any] = await connection.query(
          'SELECT id FROM transacciones WHERE punto_venta_id = ?',
          [puntoVentaId],
        );

        // Eliminar detalles de cada transacción
        for (const transaccion of transacciones) {
          const [resultDetalles]: [any, any] = await connection.query(
            'DELETE FROM detalle_transacciones WHERE transaccion_id = ?',
            [transaccion.id],
          );
          totalDetallesEliminados += resultDetalles.affectedRows || 0;
        }

        // Eliminar transacciones del punto de venta
        const [resultTransacciones]: [any, any] = await connection.query(
          'DELETE FROM transacciones WHERE punto_venta_id = ?',
          [puntoVentaId],
        );
        totalTransaccionesEliminadas += resultTransacciones.affectedRows || 0;
      }

      // Eliminar productos del negocio
      const [resultProductos]: [any, any] = await connection.query(
        'DELETE FROM productos WHERE negocio_id = ?',
        [businessId],
      );
      totalProductosEliminados += resultProductos.affectedRows || 0;

      // Eliminar puntos de venta del negocio
      const [resultPuntos]: [any, any] = await connection.query(
        'DELETE FROM puntos_venta WHERE negocio_id = ?',
        [businessId],
      );
      totalPuntosVentaEliminados += resultPuntos.affectedRows || 0;

      // Eliminar configuración de costos fijos y mensuales del negocio
      await connection.query(
        'DELETE FROM configuracion_costos_fijos WHERE negocio_id = ?',
        [businessId],
      );

      // Eliminar histórico de costos fijos y mensuales del negocio
      await connection.query(
        'DELETE FROM historico_costos_fijos_mensuales WHERE negocio_id = ?',
        [businessId],
      );
    }

    // 3. Eliminar todos los negocios del usuario
    await connection.query(
      'DELETE FROM negocios WHERE propietario = ?',
      [id],
    );

    // 4. Eliminar sesiones del usuario (si la tabla existe)
    try {
      await connection.query(
        'DELETE FROM sessions WHERE user_id = ?',
        [id],
      );
    } catch (error) {
      // Si la tabla no existe, continuar sin problemas
      console.log('Tabla sessions no existe o no tiene registros');
    }

    // 5. Finalmente, eliminar el usuario
    await connection.query('DELETE FROM users WHERE id = ?', [id]);

    // Confirmar la transacción
    await connection.commit();

    return {
      success: true,
      message: 'Usuario y todos sus datos relacionados eliminados exitosamente',
      data: {
        id: id,
        email: existingUser[0].email,
        negociosEliminados: userBusinesses.length,
        productosEliminados: totalProductosEliminados,
        puntosVentaEliminados: totalPuntosVentaEliminados,
        transaccionesEliminadas: totalTransaccionesEliminadas,
        detallesEliminados: totalDetallesEliminados,
      },
    };
  } catch (error) {
    // Revertir la transacción en caso de error
    if (connection) {
      await connection.rollback();
    }

    if (error instanceof HttpException) {
      throw error;
    }

    throw new HttpException(
      error.message || 'Error al eliminar el usuario',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

  async findAll(search?: string, limit?: number, offset?: number) {
    try {
      let query = `
        SELECT 
          id, 
          email, 
          nombres, 
          apellidos, 
          telefono, 
          documento, 
          fecha_nacimiento, 
          role, 
          is_active, 
          created_at,
          updated_at
        FROM users
        WHERE 1=1
      `;

      const params: any[] = [];

      // Si hay búsqueda, agregar filtros
      if (search) {
        query += ` AND (
          nombres LIKE ? OR 
          apellidos LIKE ? OR 
          email LIKE ? OR 
          documento LIKE ?
        )`;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }

      // Ordenar por fecha de creación (más recientes primero)
      query += ' ORDER BY created_at DESC';

      // Paginación
      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      if (offset) {
        query += ' OFFSET ?';
        params.push(offset);
      }

      const users = await this.baseService.executeQuery(query, params);

      // Obtener el total de usuarios (para paginación)
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      const countParams: any[] = [];

      if (search) {
        countQuery += ` AND (
          nombres LIKE ? OR 
          apellidos LIKE ? OR 
          email LIKE ? OR 
          documento LIKE ?
        )`;
        const searchParam = `%${search}%`;
        countParams.push(searchParam, searchParam, searchParam, searchParam);
      }

      const countRows = await this.baseService.executeQuery<{ total: number }>(
        countQuery,
        countParams,
      );
      const total = countRows[0].total;

      return {
        success: true,
        data: users,
        total: total,
        count: users.length,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al obtener usuarios',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}