import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Pool, PoolConnection } from 'mysql2/promise';

@Injectable()
export class BaseService {
  constructor(
    @Inject('MYSQL') protected pool: Pool,
    @Inject('MYSQL_CLIENTS') protected poolClient: Pool,
  ) {}

  // Método público para ejecutar queries que devuelven filas
  public async executeQuery<T = any>(
    query: string,
    params: any[] = [],
  ): Promise<T[]> {
    try {
      const [rows] = await this.pool.query(query, params);

      if (!Array.isArray(rows)) {
        throw new Error('La consulta no devolvió un array de resultados');
      }

      return rows as T[];
    } catch (error) {
      if (error.message && error.message.includes('Duplicate entry')) {
        throw new HttpException(
          `Error en la consulta: ${error.message}`,
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        `Error en la consulta: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método público para queries que no devuelven filas (INSERT, UPDATE, DELETE)
  public async executeNonSelectQuery(
    query: string,
    params: any[] = [],
  ): Promise<any> {
    try {
      const [result] = await this.pool.query(query, params);
      return result;
    } catch (error) {
      if (error.message && error.message.includes('Duplicate entry')) {
        throw new HttpException(
          `Error en la consulta: ${error.message}`,
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        `Error en la consulta: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 🆕 Método para ejecutar operaciones dentro de una transacción
  public async executeTransaction<T>(
    callback: (connection: PoolConnection) => Promise<T>,
  ): Promise<T> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      
      const result = await callback(connection);
      
      await connection.commit();
      
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Método público para verificar permisos del negocio
  public async verifyBusinessAccess(
    businessId: number,
    userId: string,
  ): Promise<void> {
    try {
      const [businessRows] = await this.pool.query(
        'SELECT id FROM negocios WHERE id = ? AND propietario = ?',
        [businessId, userId],
      );

      if (!Array.isArray(businessRows) || businessRows.length === 0) {
        throw new HttpException(
          'El negocio no existe o no tienes permisos para acceder a él',
          HttpStatus.NOT_FOUND,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al verificar permisos del negocio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método público para obtener el pool de conexiones
  public getPool(): Pool {
    return this.pool;
  }

  // Método público para obtener el pool de clientes
  public getClientPool(): Pool {
    return this.poolClient;
  }
}