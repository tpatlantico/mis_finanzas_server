import { Global, Module } from '@nestjs/common';
import { BaseService } from './base.service';

@Global() // Hace que BaseService esté disponible globalmente
@Module({
  providers: [BaseService],
  exports: [BaseService],
})
export class CommonModule {}
