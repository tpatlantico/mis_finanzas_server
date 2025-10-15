import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  Request, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ExpenseCategoriesService } from './expense-categories.service';
import { JwtPayload } from 'src/auth/models/token.model';
import { CreateExpenseCategoryDto } from '../transactions/dto/CreateExpenseCategoryDto';


@ApiTags('expense-categories')
@Controller('expense-categories')
export class ExpenseCategoriesController {
  
  constructor(private readonly expenseCategoriesService: ExpenseCategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva categoría de gasto' })
  @ApiResponse({ status: 201, description: 'Categoría de gasto creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createExpenseCategory(
    @Request() req,
    @Body() newCategory: CreateExpenseCategoryDto,
  ) {
    const info = req.user as JwtPayload;
    
    return this.expenseCategoriesService.createExpenseCategory(
      info.sub,
      newCategory,
    );
  }

  @Get('business/:id')
  @ApiOperation({ summary: 'Obtener todas las categorías de gasto de un negocio' })
  @ApiParam({ name: 'id', description: 'ID del negocio' })
  @ApiQuery({ 
    name: 'tipo_costo', 
    required: false, 
    description: 'Tipo de costo: "fijo" o "variable"',
    enum: ['fijo', 'variable']
  })
  @ApiResponse({ status: 200, description: 'Lista de categorías de gasto' })
  @ApiResponse({ status: 400, description: 'Tipo de costo inválido' })
  async findExpenseCategories(
    @Param('id') id: string,
    @Query('tipo_costo') tipoCosto: string,
    @Request() req,
  ) {
    const info = req.user as JwtPayload;

    // Validar que el tipo_costo sea válido
    if (tipoCosto && !this.isValidCostType(tipoCosto)) {
      throw new HttpException(
        'El tipo de costo debe ser "fijo" o "variable"',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.expenseCategoriesService.findExpenseCategoriesByBusiness(
      +id,
      info.sub,
      tipoCosto?.toLowerCase(),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una categoría de gasto específica por ID' })
  @ApiParam({ name: 'id', description: 'ID de la categoría de gasto' })
  @ApiResponse({ status: 200, description: 'Categoría de gasto encontrada' })
  @ApiResponse({ status: 404, description: 'Categoría de gasto no encontrada' })
  async findExpenseCategoryById(
    @Param('id') id: string, 
    @Request() req
  ) {
    const info = req.user as JwtPayload;
    return this.expenseCategoriesService.findExpenseCategoryById(+id, info.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una categoría de gasto' })
  @ApiParam({ name: 'id', description: 'ID de la categoría de gasto' })
  @ApiResponse({ status: 200, description: 'Categoría de gasto actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría de gasto no encontrada' })
  async updateExpenseCategory(
    @Param('id') id: string,
    @Request() req,
    @Body() updateData: Partial<CreateExpenseCategoryDto>,
  ) {
    const info = req.user as JwtPayload;
    return this.expenseCategoriesService.updateExpenseCategory(
      +id,
      info.sub,
      updateData,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una categoría de gasto' })
  @ApiParam({ name: 'id', description: 'ID de la categoría de gasto' })
  @ApiResponse({ status: 200, description: 'Categoría de gasto eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría de gasto no encontrada' })
  async deleteExpenseCategory(
    @Param('id') id: string, 
    @Request() req
  ) {
    const info = req.user as JwtPayload;
    return this.expenseCategoriesService.deleteExpenseCategory(+id, info.sub);
  }

  // Método auxiliar privado para validar el tipo de costo
  private isValidCostType(tipoCosto: string): boolean {
    return ['fijo', 'variable'].includes(tipoCosto.toLowerCase());
  }
}