import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/CreateUserDto';
import { BaseService } from 'src/common/base.service';

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
      throw new HttpException(
        'El registro ya existe',
        HttpStatus.CONFLICT,
      );
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
