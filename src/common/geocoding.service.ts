import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface GeocodingResult {
  latitude: number | null;
  longitude: number | null;
  success: boolean;
  address?: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  
  async getCoordinates(
    direccion: string,
    municipio: string,
    departamento: string,
  ): Promise<GeocodingResult> {
    try {
      const fullAddress = `${direccion}, ${municipio}, ${departamento}, Colombia`;
      
      this.logger.log(`Geocodificando: ${fullAddress}`);

      const response = await axios.get(this.NOMINATIM_URL, {
        params: {
          q: fullAddress,
          format: 'json',
          addressdetails: 1,
          limit: 1,
          countrycodes: 'co',
        },
        headers: {
          'User-Agent': 'MiSFinanzas/1.0 (Business Management App)',
        },
        timeout: 5000,
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        
        this.logger.log(`Coordenadas encontradas: ${result.lat}, ${result.lon}`);
        
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          success: true,
          address: result.display_name,
        };
      }

      this.logger.warn(`No se encontraron coordenadas para: ${fullAddress}`);
      return await this.getFallbackCoordinates(municipio, departamento);
      
    } catch (error) {
      this.logger.error(`Error en geocodificación: ${error.message}`);
      return await this.getFallbackCoordinates(municipio, departamento);
    }
  }

  private async getFallbackCoordinates(
    municipio: string,
    departamento: string,
  ): Promise<GeocodingResult> {
    try {
      const fallbackAddress = `${municipio}, ${departamento}, Colombia`;
      
      this.logger.log(`Intentando geocodificación fallback: ${fallbackAddress}`);

      const response = await axios.get(this.NOMINATIM_URL, {
        params: {
          q: fallbackAddress,
          format: 'json',
          limit: 1,
          countrycodes: 'co',
        },
        headers: {
          'User-Agent': 'MiSFinanzas/1.0 (Business Management App)',
        },
        timeout: 5000,
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        
        this.logger.log(`Coordenadas fallback encontradas: ${result.lat}, ${result.lon}`);
        
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          success: true,
          address: result.display_name,
        };
      }

      this.logger.warn('No se pudieron obtener coordenadas');
      
      return {
        latitude: null,
        longitude: null,
        success: false,
      };
      
    } catch (error) {
      this.logger.error(`Error en geocodificación fallback: ${error.message}`);
      
      return {
        latitude: null,
        longitude: null,
        success: false,
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isValidColombiaCoordinates(latitude: number, longitude: number): boolean {
    const colombiaBounds = {
      latMin: -4.2,
      latMax: 13.4,
      lonMin: -79.0,
      lonMax: -66.9,
    };

    return (
      latitude >= colombiaBounds.latMin &&
      latitude <= colombiaBounds.latMax &&
      longitude >= colombiaBounds.lonMin &&
      longitude <= colombiaBounds.lonMax
    );
  }
}