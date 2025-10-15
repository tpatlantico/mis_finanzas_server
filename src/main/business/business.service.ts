import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BaseService } from 'src/common/base.service';
import CreateBusinessDto from './dto/CreateBusiness';
import { PoolConnection } from 'mysql2/promise';
import { CreateBusinessWithPointsDto } from './dto/CreateBusinessWithPointsDto.dto';
import { UpdateBusinessDto } from './dto/updateBusiness.dto';
import { GeocodingService } from 'src/common/geocoding.service';

@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);

  constructor(
    private readonly baseService: BaseService,
    private readonly geocodingService: GeocodingService,
  ) {}

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
    try {
      // ✅ Usar executeTransaction para manejar automáticamente la conexión
      const result = await this.baseService.executeTransaction(
        async (connection) => {
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

          // 🌍 3. GEOCODIFICAR LA DIRECCIÓN DEL NEGOCIO
          this.logger.log('🌍 Geocodificando dirección del negocio...');

          const businessGeocode = await this.geocodingService.getCoordinates(
            businessData.direccion,
            muniRows[0].municipio,
            deptRows[0].departamento,
          );

          const businessLatitude = businessGeocode.latitude;
          const businessLongitude = businessGeocode.longitude;

          if (businessGeocode.success) {
            this.logger.log(
              `✅ Coordenadas del negocio: Lat ${businessLatitude}, Lon ${businessLongitude}`,
            );
          } else {
            this.logger.warn(
              '⚠️ No se pudieron obtener coordenadas del negocio',
            );
          }

          // 4. Crear el negocio CON COORDENADAS
          const [businessResult]: [any, any] = await connection.query(
            `INSERT INTO negocios 
         (nombre, nit, direccion, telefono, email, propietario, departamento, municipio, latitud, longitud) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              businessData.nombre,
              businessData.nit || null,
              businessData.direccion,
              businessData.telefono,
              businessData.email,
              userId,
              businessData.departamento,
              businessData.municipio,
              businessLatitude,
              businessLongitude,
            ],
          );

          const businessId = businessResult.insertId;

          // 5. Crear los puntos de venta CON GEOCODIFICACIÓN
          const createdPoints: any[] = [];

          if (
            !businessData.puntosVenta ||
            businessData.puntosVenta.length === 0
          ) {
            throw new HttpException(
              'Debe incluir al menos un punto de venta',
              HttpStatus.BAD_REQUEST,
            );
          }

          for (let i = 0; i < businessData.puntosVenta.length; i++) {
            const punto = businessData.puntosVenta[i];

            this.logger.log(
              `📍 Procesando punto ${i + 1}/${businessData.puntosVenta.length}: ${punto.nombre}`,
            );

            // Verificar departamento del punto
            const [puntoDeptRows]: [any[], any] = await connection.query(
              'SELECT id_departamento, departamento FROM departamentos WHERE id_departamento = ?',
              [punto.departamento],
            );

            if (!puntoDeptRows || puntoDeptRows.length === 0) {
              throw new HttpException(
                `El departamento no existe para "${punto.nombre}"`,
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
                `El municipio no existe para "${punto.nombre}"`,
                HttpStatus.BAD_REQUEST,
              );
            }

            // 🌍 GEOCODIFICAR PUNTO DE VENTA
            this.logger.log(`🌍 Geocodificando: ${punto.nombre}...`);

            const pointGeocode = await this.geocodingService.getCoordinates(
              punto.ubicacion,
              puntoMuniRows[0].municipio,
              puntoDeptRows[0].departamento,
            );

            const pointLatitude = pointGeocode.latitude;
            const pointLongitude = pointGeocode.longitude;

            if (pointGeocode.success) {
              this.logger.log(
                `✅ Coordenadas "${punto.nombre}": Lat ${pointLatitude}, Lon ${pointLongitude}`,
              );
            } else {
              this.logger.warn(
                `⚠️ No se pudieron obtener coordenadas de "${punto.nombre}"`,
              );
            }

            // Insertar punto de venta CON COORDENADAS
            const [pointResult]: [any, any] = await connection.query(
              `INSERT INTO puntos_venta 
           (negocio_id, nombre, ubicacion, responsable, telefono, departamento, municipio, nota, activo, latitud, longitud) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
              [
                businessId,
                punto.nombre,
                punto.ubicacion,
                punto.responsable || null,
                punto.telefono || null,
                punto.departamento,
                punto.municipio,
                punto.nota || null,
                pointLatitude,
                pointLongitude,
              ],
            );

            // Obtener el punto creado
            const [createdPoint]: [any[], any] = await connection.query(
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

            // ⏱️ Delay para rate limits (solo si hay más puntos)
            if (i < businessData.puntosVenta.length - 1) {
              this.logger.log('⏱️ Esperando 1 segundo...');
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          // 6. Obtener el negocio creado completo
          const [createdBusiness]: [any[], any] = await connection.query(
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
          n.latitud,
          n.longitud,
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

          // 📊 Estadísticas de geocodificación
          const geocodedPoints = createdPoints.filter(
            (p) => p.latitud !== null && p.longitud !== null,
          ).length;

          this.logger.log(
            `✅ Negocio creado con ${createdPoints.length} puntos de venta`,
          );
          this.logger.log(
            `📍 Geocodificación - Negocio: ${businessGeocode.success ? '✅' : '❌'} | Puntos: ${geocodedPoints}/${createdPoints.length}`,
          );

          // Retornar resultado desde el callback
          return {
            businessGeocode,
            createdBusiness: createdBusiness[0],
            createdPoints,
            geocodedPoints,
          };
        },
      );

      // Construir respuesta final
      return {
        success: true,
        message: 'Negocio y puntos de venta creados exitosamente',
        business: result.createdBusiness,
        puntosVenta: result.createdPoints,
        totalPuntosCreados: result.createdPoints.length,
        geocodingInfo: {
          businessGeocodingSuccess: result.businessGeocode.success,
          businessCoordinates: result.businessGeocode.success
            ? {
                latitude: result.businessGeocode.latitude,
                longitude: result.businessGeocode.longitude,
              }
            : null,
          pointsGeocoded: result.geocodedPoints,
          totalPoints: result.createdPoints.length,
          geocodingRate: `${result.geocodedPoints}/${result.createdPoints.length}`,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Error al crear el negocio con puntos de venta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método auxiliar para delays (agrégalo al final de la clase)
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 🆕 Método para actualizar negocio
  async update(
    businessId: number,
    userId: string,
    updateBusinessDto: UpdateBusinessDto,
  ) {
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
        n.latitud,               -- ✅ AGREGADO
        n.longitud,              -- ✅ AGREGADO
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

  // 🆕 Método para obtener TODOS los negocios (para el mapa)
  async findAll() {
    try {
      const businesses = await this.baseService.executeQuery(
        `SELECT 
        n.id,
        n.nombre,
        n.nit,
        n.direccion,
        n.telefono,
        n.email,
        n.latitud,
        n.longitud,
        n.fecha_creacion,
        n.created_at,
        d.departamento as departamento_nombre,
        m.municipio as municipio_nombre,
        n.departamento as departamento_id,
        n.municipio as municipio_id
      FROM negocios n
      LEFT JOIN departamentos d ON n.departamento = d.id_departamento
      LEFT JOIN municipios m ON n.municipio = m.id_municipio
      WHERE n.latitud IS NOT NULL AND n.longitud IS NOT NULL
      ORDER BY n.created_at DESC`,
      );

      return businesses;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener todos los negocios',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método existente para eliminar negocio
  async deleteBusiness(businessId: number, userId: string) {
    try {
      // Verificar permisos ANTES de la transacción
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

      // ✅ Usar executeTransaction
      await this.baseService.executeTransaction(async (connection) => {
        await connection.query(
          'DELETE FROM puntos_venta WHERE negocio_id = ?',
          [businessId],
        );

        await connection.query('DELETE FROM negocios WHERE id = ?', [
          businessId,
        ]);
      });

      return {
        success: true,
        message:
          'Negocio eliminado correctamente junto con todos sus puntos de venta',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Error al eliminar el negocio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método para obtener un negocio con sus puntos de venta
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
        n.latitud,               -- ✅ AGREGADO
        n.longitud,              -- ✅ AGREGADO
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

  // En business.service.ts

  // 🆕 Método para obtener puntos de venta de un negocio (Admin)
  async getBusinessPointsAdmin(businessId: number) {
    try {
      // Verificar que el negocio existe
      const business = await this.baseService.executeQuery(
        `SELECT 
        n.id,
        n.nombre,
        n.direccion,
        n.latitud,
        n.longitud,
        d.departamento as departamento_nombre,
        m.municipio as municipio_nombre
      FROM negocios n
      LEFT JOIN departamentos d ON n.departamento = d.id_departamento
      LEFT JOIN municipios m ON n.municipio = m.id_municipio
      WHERE n.id = ?`,
        [businessId],
      );

      if (!business || business.length === 0) {
        throw new HttpException('Negocio no encontrado', HttpStatus.NOT_FOUND);
      }

      // Obtener puntos de venta con coordenadas
      const puntosVenta = await this.baseService.executeQuery(
        `SELECT 
        pv.id,
        pv.nombre,
        pv.ubicacion,
        pv.latitud,
        pv.longitud,
        pv.responsable,
        pv.telefono,
        pv.activo,
        pv.nota,
        pv.fecha_creacion,
        d.departamento as departamento_nombre,
        m.municipio as municipio_nombre,
        pv.departamento as departamento_id,
        pv.municipio as municipio_id
      FROM puntos_venta pv
      LEFT JOIN departamentos d ON pv.departamento = d.id_departamento
      LEFT JOIN municipios m ON pv.municipio = m.id_municipio
      WHERE pv.negocio_id = ? AND pv.latitud IS NOT NULL AND pv.longitud IS NOT NULL
      ORDER BY pv.fecha_creacion DESC`,
        [businessId],
      );

      return {
        success: true,
        businessId: business[0].id,
        businessName: business[0].nombre,
        businessLocation: {
          latitud: business[0].latitud,
          longitud: business[0].longitud,
          direccion: business[0].direccion,
          departamento: business[0].departamento_nombre,
          municipio: business[0].municipio_nombre,
        },
        puntosVenta: puntosVenta,
        totalPuntos: puntosVenta.length,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al obtener los puntos de venta del negocio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  // En business.service.ts

 // En business.service.ts

async getBusinessFullDetails(businessId: number) {
  try {
    // 1. Obtener información del negocio
    const business = await this.baseService.executeQuery(
      `SELECT 
        n.id,
        n.nombre,
        n.nit,
        n.direccion,
        n.telefono,
        n.email,
        n.latitud,
        n.longitud,
        n.fecha_creacion,
        n.created_at,
        d.departamento as departamento_nombre,
        m.municipio as municipio_nombre,
        n.departamento as departamento_id,
        n.municipio as municipio_id,
        n.propietario as propietario_id
      FROM negocios n
      LEFT JOIN departamentos d ON n.departamento = d.id_departamento
      LEFT JOIN municipios m ON n.municipio = m.id_municipio
      WHERE n.id = ?`,
      [businessId],
    );

    if (!business || business.length === 0) {
      throw new HttpException('Negocio no encontrado', HttpStatus.NOT_FOUND);
    }

    const businessData = business[0];

    // 2. Obtener información del propietario
    const propietario = await this.baseService.executeQuery(
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
        created_at
      FROM users
      WHERE id = ?`,
      [businessData.propietario_id],
    );

    // 3. Obtener puntos de venta
    const puntosVenta = await this.baseService.executeQuery(
      `SELECT 
        pv.id,
        pv.nombre,
        pv.ubicacion,
        pv.latitud,
        pv.longitud,
        pv.responsable,
        pv.telefono,
        pv.activo,
        pv.nota,
        pv.fecha_creacion,
        d.departamento as departamento_nombre,
        m.municipio as municipio_nombre
      FROM puntos_venta pv
      LEFT JOIN departamentos d ON pv.departamento = d.id_departamento
      LEFT JOIN municipios m ON pv.municipio = m.id_municipio
      WHERE pv.negocio_id = ?
      ORDER BY pv.fecha_creacion DESC`,
      [businessId],
    );

    // 4. Obtener catálogo de productos
    const productos = await this.baseService.executeQuery(
      `SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.unidad_medida,
        p.precio_unitario,
        p.costo_unitario,
        p.codigo_interno,
        p.activo,
        p.fecha_creacion,
        p.updated_at,
        (p.precio_unitario - p.costo_unitario) as margen_unitario,
        ROUND(((p.precio_unitario - p.costo_unitario) / p.precio_unitario * 100), 2) as margen_porcentaje
      FROM productos p
      WHERE p.negocio_id = ?
      ORDER BY p.fecha_creacion DESC`,
      [businessId],
    );

    // 5. Obtener categorías de egresos con sus totales
    const categoriasEgresos = await this.baseService.executeQuery(
      `SELECT 
        ce.id,
        ce.nombre,
        ce.descripcion,
        ce.tipo_costo,
        ce.activo,
        ce.fecha_creacion,
        COUNT(DISTINCT t.id) as total_transacciones,
        COALESCE(SUM(CASE WHEN t.tipo = 'egreso' THEN t.monto_total ELSE 0 END), 0) as total_egresos,
        COALESCE(
          (SELECT ccf.monto_mensual 
           FROM configuracion_costos_fijos ccf 
           WHERE ccf.categoria_egreso_id = ce.id 
           AND ccf.activo = 1 
           LIMIT 1), 
          0
        ) as costo_fijo_mensual
      FROM categorias_egresos ce
      LEFT JOIN transacciones t ON ce.id = t.categoria_id
      WHERE ce.negocio_id = ?
      GROUP BY ce.id, ce.nombre, ce.descripcion, ce.tipo_costo, ce.activo, ce.fecha_creacion
      ORDER BY ce.nombre`,
      [businessId],
    );

    // 6. Obtener transacciones recientes (últimas 50) con detalles
    const transacciones = await this.baseService.executeQuery(
      `SELECT 
        t.id,
        t.tipo,
        t.fecha,
        t.monto_total,
        t.concepto,
        t.fecha_creacion,
        pv.nombre as punto_venta_nombre,
        u.nombres as usuario_nombres,
        u.apellidos as usuario_apellidos,
        ce.nombre as categoria_nombre,
        COUNT(dt.id) as cantidad_items
      FROM transacciones t
      LEFT JOIN puntos_venta pv ON t.punto_venta_id = pv.id
      LEFT JOIN users u ON t.usuario_id = u.id
      LEFT JOIN categorias_egresos ce ON t.categoria_id = ce.id
      LEFT JOIN detalle_transacciones dt ON t.id = dt.transaccion_id
      WHERE pv.negocio_id = ?
      GROUP BY t.id, t.tipo, t.fecha, t.monto_total, t.concepto, t.fecha_creacion,
               pv.nombre, u.nombres, u.apellidos, ce.nombre
      ORDER BY t.fecha DESC
      LIMIT 50`,
      [businessId],
    );

    // 7. Obtener costos fijos configurados
    const costosFijos = await this.baseService.executeQuery(
      `SELECT 
        ccf.id,
        ccf.monto_mensual,
        ccf.descripcion,
        ccf.activo,
        ccf.fecha_creacion,
        ce.nombre as categoria_nombre,
        ce.tipo_costo
      FROM configuracion_costos_fijos ccf
      LEFT JOIN categorias_egresos ce ON ccf.categoria_egreso_id = ce.id
      WHERE ccf.negocio_id = ?
      ORDER BY ccf.monto_mensual DESC`,
      [businessId],
    );

    // 8. Calcular estadísticas generales
    const estadisticas = await this.baseService.executeQuery(
      `SELECT 
        COUNT(DISTINCT pv.id) as total_puntos_venta,
        COUNT(DISTINCT p.id) as total_productos,
        COUNT(DISTINCT ce.id) as total_categorias_egresos,
        COUNT(DISTINCT t.id) as total_transacciones,
        COALESCE(SUM(CASE WHEN t.tipo = 'ingreso' THEN t.monto_total ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN t.tipo = 'egreso' THEN t.monto_total ELSE 0 END), 0) as total_egresos,
        COALESCE(SUM(CASE WHEN t.tipo = 'ingreso' THEN t.monto_total ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN t.tipo = 'egreso' THEN t.monto_total ELSE 0 END), 0) as balance_total
      FROM negocios n
      LEFT JOIN puntos_venta pv ON n.id = pv.negocio_id
      LEFT JOIN productos p ON n.id = p.negocio_id
      LEFT JOIN categorias_egresos ce ON n.id = ce.negocio_id
      LEFT JOIN transacciones t ON pv.id = t.punto_venta_id
      WHERE n.id = ?`,
      [businessId],
    );

    // 9. Obtener estadísticas del mes actual
    const estadisticasMes = await this.baseService.executeQuery(
      `SELECT 
        COUNT(DISTINCT t.id) as transacciones_mes,
        COALESCE(SUM(CASE WHEN t.tipo = 'ingreso' THEN t.monto_total ELSE 0 END), 0) as ingresos_mes,
        COALESCE(SUM(CASE WHEN t.tipo = 'egreso' THEN t.monto_total ELSE 0 END), 0) as egresos_mes,
        COALESCE(SUM(CASE WHEN t.tipo = 'ingreso' THEN t.monto_total ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN t.tipo = 'egreso' THEN t.monto_total ELSE 0 END), 0) as balance_mes
      FROM transacciones t
      INNER JOIN puntos_venta pv ON t.punto_venta_id = pv.id
      WHERE pv.negocio_id = ?
      AND MONTH(t.fecha) = MONTH(CURRENT_DATE())
      AND YEAR(t.fecha) = YEAR(CURRENT_DATE())`,
      [businessId],
    );

    // 10. Productos más vendidos
    const productosMasVendidos = await this.baseService.executeQuery(
      `SELECT 
        p.id,
        p.nombre,
        p.unidad_medida,
        p.precio_unitario,
        COUNT(dt.id) as veces_vendido,
        SUM(dt.cantidad) as cantidad_total_vendida,
        SUM(dt.subtotal) as ingresos_generados
      FROM productos p
      INNER JOIN detalle_transacciones dt ON p.id = dt.producto_id
      INNER JOIN transacciones t ON dt.transaccion_id = t.id
      INNER JOIN puntos_venta pv ON t.punto_venta_id = pv.id
      WHERE p.negocio_id = ?
      GROUP BY p.id, p.nombre, p.unidad_medida, p.precio_unitario
      ORDER BY cantidad_total_vendida DESC
      LIMIT 10`,
      [businessId],
    );

    return {
      success: true,
      data: {
        negocio: businessData,
        propietario: propietario[0] || null,
        puntosVenta: puntosVenta,
        productos: productos,
        categoriasEgresos: categoriasEgresos,
        transacciones: transacciones,
        costosFijos: costosFijos,
        productosMasVendidos: productosMasVendidos,
        estadisticas: estadisticas[0] || {
          total_puntos_venta: 0,
          total_productos: 0,
          total_categorias_egresos: 0,
          total_transacciones: 0,
          total_ingresos: 0,
          total_egresos: 0,
          balance_total: 0,
        },
        estadisticasMes: estadisticasMes[0] || {
          transacciones_mes: 0,
          ingresos_mes: 0,
          egresos_mes: 0,
          balance_mes: 0,
        },
      },
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException(
      error.message || 'Error al obtener información completa del negocio',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
}
