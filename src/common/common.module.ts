import { Global, Module } from '@nestjs/common';
import { BaseService } from './base.service';
import { GeocodingService } from './geocoding.service';

@Global() // Hace que BaseService esté disponible globalmente
@Module({
  providers: [BaseService, GeocodingService],
  exports: [BaseService,GeocodingService],
})
export class CommonModule {}
