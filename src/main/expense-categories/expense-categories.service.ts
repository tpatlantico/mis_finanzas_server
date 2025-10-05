import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { BaseService } from 'src/common/base.service';
import { CreateExpenseCategoryDto } from '../transactions/dto/CreateExpenseCategoryDto';


@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly baseService: BaseService) {}

  // Create a new expense category
  async createExpenseCategory(
    userId: string,
    newCategory: CreateExpenseCategoryDto,
  ) {
    try {
      // Verify that the business exists and belongs to the user
      await this.baseService.verifyBusinessAccess(
        newCategory.negocio_id,
        userId,
      );

      // Insert the new expense category
      const result = await this.baseService.executeNonSelectQuery(
        'INSERT INTO categorias_egresos (negocio_id, nombre, descripcion, tipo_costo, activo) VALUES (?, ?, ?, ?, ?)',
        [
          newCategory.negocio_id,
          newCategory.nombre,
          newCategory.descripcion || null,
          newCategory.tipo_costo,
          newCategory.activo === undefined ? 1 : newCategory.activo ? 1 : 0,
        ],
      );

      const categoryId = result.insertId;

      // Retrieve the newly created category to return it
      const newCategoryRecord = await this.baseService.executeQuery(
        'SELECT * FROM categorias_egresos WHERE id = ?',
        [categoryId],
      );

      if (!newCategoryRecord.length) {
        throw new HttpException(
          'Error al recuperar la categoría creada',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return newCategoryRecord[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al crear la categoría de egresos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get all expense categories for a specific business
  async findExpenseCategoriesByBusiness(
    businessId: number,
    userId: string,
    tipoCosto?: string,
  ) {
    try {
      // Verify that the business exists and belongs to the user
      await this.baseService.verifyBusinessAccess(businessId, userId);

      // Build query based on whether tipoCosto filter is provided
      let query = 'SELECT * FROM categorias_egresos WHERE negocio_id = ?';
      let queryParams: any[] = [businessId];

      if (tipoCosto) {
        query += ' AND LOWER(tipo_costo) = ?';
        queryParams.push(tipoCosto);
      }

      // Order by name for better UX
      query += ' ORDER BY nombre ASC';

      // Get expense categories for the business (filtered or all)
      const categories = await this.baseService.executeQuery(query, queryParams);

      return categories;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al obtener las categorías de egresos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get a specific expense category by ID
  async findExpenseCategoryById(categoryId: number, userId: string) {
    try {
      // Verify that the category exists and belongs to a business owned by the user
      const categoryRows = await this.baseService.executeQuery(
        'SELECT ce.* FROM categorias_egresos ce ' +
          'JOIN negocios n ON ce.negocio_id = n.id ' +
          'WHERE ce.id = ? AND n.propietario = ?',
        [categoryId, userId],
      );

      if (!categoryRows.length) {
        throw new HttpException(
          'La categoría no existe o no tienes permisos para acceder',
          HttpStatus.NOT_FOUND,
        );
      }

      return categoryRows[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al obtener la categoría de egresos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Update an expense category
  async updateExpenseCategory(
    categoryId: number,
    userId: string,
    updateData: Partial<CreateExpenseCategoryDto>,
  ) {
    try {
      // Verify that the category exists and belongs to a business owned by the user
      const categoryRows = await this.baseService.executeQuery(
        'SELECT ce.* FROM categorias_egresos ce ' +
          'JOIN negocios n ON ce.negocio_id = n.id ' +
          'WHERE ce.id = ? AND n.propietario = ?',
        [categoryId, userId],
      );

      if (!categoryRows.length) {
        throw new HttpException(
          'La categoría no existe o no tienes permisos para modificarla',
          HttpStatus.NOT_FOUND,
        );
      }

      // Prepare update fields and values
      const updateFields = this.buildUpdateFields(updateData);

      // Only proceed if there are fields to update
      if (updateFields.fields.length > 0) {
        // Add the categoryId to the values array
        updateFields.values.push(categoryId);

        // Update the category
        await this.baseService.executeNonSelectQuery(
          `UPDATE categorias_egresos SET ${updateFields.fields.join(', ')} WHERE id = ?`,
          updateFields.values,
        );
      }

      // Retrieve the updated category
      const updatedCategory = await this.baseService.executeQuery(
        'SELECT * FROM categorias_egresos WHERE id = ?',
        [categoryId],
      );

      if (!updatedCategory.length) {
        throw new HttpException(
          'Error al recuperar la categoría actualizada',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return updatedCategory[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al actualizar la categoría de egresos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Delete an expense category
  async deleteExpenseCategory(categoryId: number, userId: string) {
    try {
      // Verify that the category exists and belongs to a business owned by the user
      const categoryRows = await this.baseService.executeQuery(
        'SELECT ce.* FROM categorias_egresos ce ' +
          'JOIN negocios n ON ce.negocio_id = n.id ' +
          'WHERE ce.id = ? AND n.propietario = ?',
        [categoryId, userId],
      );

      if (!categoryRows.length) {
        throw new HttpException(
          'La categoría no existe o no tienes permisos para eliminarla',
          HttpStatus.NOT_FOUND,
        );
      }

      // Delete the category
      await this.baseService.executeNonSelectQuery(
        'DELETE FROM categorias_egresos WHERE id = ?',
        [categoryId],
      );

      return {
        success: true,
        message: 'Categoría de egresos eliminada correctamente',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al eliminar la categoría de egresos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Private helper method to build update fields and values
  private buildUpdateFields(updateData: Partial<CreateExpenseCategoryDto>): {
    fields: string[];
    values: any[];
  } {
    const fields: string[] = [];
    const values: any[] = [];

    if (updateData.nombre !== undefined) {
      fields.push('nombre = ?');
      values.push(updateData.nombre);
    }

    if (updateData.descripcion !== undefined) {
      fields.push('descripcion = ?');
      values.push(updateData.descripcion || null);
    }

    if (updateData.tipo_costo !== undefined) {
      fields.push('tipo_costo = ?');
      values.push(updateData.tipo_costo);
    }

    if (updateData.activo !== undefined) {
      fields.push('activo = ?');
      values.push(updateData.activo ? 1 : 0);
    }

    return { fields, values };
  }
}