// safeOptimizer.js - Безопасная система оптимизации с fallback
import { features, featureFlags, checkFeatureSupport } from './featureDetection.js';

export class SafeOptimizer {
  constructor() {
    this.initialized = false;
    this.optimizers = {};
    this.initializeOptimizations();
  }

  async initializeOptimizations() {
    try {
      console.log('🚀 Initializing SafeOptimizer with advanced features...');
      
      // Инициализируем оптимизации только если они доступны
      if (checkFeatureSupport('wasm')) {
        this.optimizers.wasm = await this.createWasmProcessor();
        console.log('✅ WASM processor initialized');
      }
      
      if (checkFeatureSupport('serviceWorker')) {
        this.optimizers.serviceWorker = await this.createServiceWorkerCache();
        console.log('✅ Service Worker cache initialized');
      }
      
      if (checkFeatureSupport('sharedArrayBuffer')) {
        this.optimizers.sharedBuffer = await this.createSharedBufferWorker();
        console.log('✅ Shared Buffer Worker initialized');
      }
      
      if (checkFeatureSupport('compression')) {
        this.optimizers.compression = true;
        console.log('✅ Compression API available');
      }
      
      this.initialized = true;
      console.log('✅ SafeOptimizer initialized with optimizations:', Object.keys(this.optimizers));
    } catch (error) {
      console.warn('⚠️ SafeOptimizer initialization failed, using fallbacks:', error);
      this.initialized = true; // Все равно помечаем как инициализированный
    }
  }

  async createWasmProcessor() {
    try {
      // Динамический импорт для WASM
      const { WasmImageProcessor } = await import('./wasmImageProcessor.js');
      return new WasmImageProcessor();
    } catch (error) {
      console.warn('⚠️ WASM processor creation failed:', error);
      return null;
    }
  }

  async createServiceWorkerCache() {
    try {
      const { ServiceWorkerCache } = await import('./serviceWorkerCache.js');
      return new ServiceWorkerCache();
    } catch (error) {
      console.warn('⚠️ Service Worker cache creation failed:', error);
      return null;
    }
  }

  async createSharedBufferWorker() {
    try {
      const { SharedBufferWorker } = await import('./sharedBufferWorker.js');
      return new SharedBufferWorker();
    } catch (error) {
      console.warn('⚠️ Shared Buffer Worker creation failed:', error);
      return null;
    }
  }

  // Безопасная оптимизация изображений
  async optimizeImage(file, quality = 0.8) {
    if (this.optimizers.wasm) {
      try {
        const result = await this.optimizers.wasm.optimize(file, quality);
        console.log('✅ WASM optimization successful');
        return result;
      } catch (error) {
        console.warn('⚠️ WASM optimization failed, using Canvas fallback:', error);
      }
    }
    
    // Fallback на Canvas API
    return await this.canvasOptimize(file, quality);
  }

  // Canvas оптимизация как fallback
  async canvasOptimize(file, quality) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 900;
        
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Рисуем изображение с сглаживанием
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Конвертируем в blob с указанным качеством
        canvas.toBlob((blob) => {
          const optimizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          
          console.log(`📱 Canvas optimization: ${file.size} -> ${optimizedFile.size} bytes (${Math.round((1 - optimizedFile.size / file.size) * 100)}% reduction)`);
          resolve(optimizedFile);
        }, file.type, quality);
      };
      
      img.onerror = () => {
        console.warn('⚠️ Image loading failed, returning original file');
        resolve(file);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  // Оптимизированная загрузка файлов
  async uploadFiles(files, endpoint, options = {}) {
    const results = [];
    
    // Используем Shared Buffer Worker если доступен
    if (this.optimizers.sharedBuffer) {
      try {
        console.log('🚀 Using Shared Buffer Worker for file processing...');
        const processedFiles = await this.optimizers.sharedBuffer.processFiles(files);
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const processed = processedFiles[i];
          
          if (processed && processed.processed) {
            // Используем Service Worker кэш если доступен
            if (this.optimizers.serviceWorker) {
              await this.optimizers.serviceWorker.cacheUpload(file, processed);
            }
            
            results.push(processed);
          } else {
            // Fallback на обычную загрузку
            const result = await this.regularUpload(file, endpoint, options);
            results.push(result);
          }
        }
      } catch (error) {
        console.warn('⚠️ Shared Buffer processing failed, using regular upload:', error);
        for (const file of files) {
          const result = await this.regularUpload(file, endpoint, options);
          results.push(result);
        }
      }
    } else {
      // Обычная загрузка
      for (const file of files) {
        const result = await this.regularUpload(file, endpoint, options);
        results.push(result);
      }
    }
    
    return results;
  }

  // Обычная загрузка файла
  async regularUpload(file, endpoint, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Кэшируем результат если Service Worker доступен
    if (this.optimizers.serviceWorker) {
      await this.optimizers.serviceWorker.cacheUpload(file, result);
    }
    
    return result;
  }

  // Сжатие данных
  async compressData(data) {
    if (this.optimizers.compression && this.optimizers.sharedBuffer) {
      try {
        return await this.optimizers.sharedBuffer.compressData(data);
      } catch (error) {
        console.warn('⚠️ Shared Buffer compression failed, using fallback:', error);
      }
    }
    
    // Fallback сжатие
    return await this.fallbackCompression(data);
  }

  // Fallback сжатие
  async fallbackCompression(data) {
    try {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      const reader = cs.readable.getReader();
      
      const uint8Array = new Uint8Array(data);
      writer.write(uint8Array);
      writer.close();
      
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }
      
      return compressed.buffer;
    } catch (error) {
      console.warn('⚠️ Fallback compression failed:', error);
      return data; // Возвращаем оригинальные данные
    }
  }

  // Распаковка данных
  async decompressData(compressedData) {
    if (this.optimizers.compression && this.optimizers.sharedBuffer) {
      try {
        return await this.optimizers.sharedBuffer.decompressData(compressedData);
      } catch (error) {
        console.warn('⚠️ Shared Buffer decompression failed, using fallback:', error);
      }
    }
    
    // Fallback распаковка
    return await this.fallbackDecompression(compressedData);
  }

  // Fallback распаковка
  async fallbackDecompression(compressedData) {
    try {
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      
      const uint8Array = new Uint8Array(compressedData);
      writer.write(uint8Array);
      writer.close();
      
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        decompressed.set(chunk, offset);
        offset += chunk.length;
      }
      
      return decompressed.buffer;
    } catch (error) {
      console.warn('⚠️ Fallback decompression failed:', error);
      return compressedData; // Возвращаем сжатые данные
    }
  }

  // Получение статистики оптимизаций
  getOptimizationStats() {
    const stats = {
      initialized: this.initialized,
      availableOptimizers: Object.keys(this.optimizers),
      features: features,
      featureFlags: featureFlags
    };
    
    // Добавляем статистику от каждого оптимизатора
    if (this.optimizers.serviceWorker) {
      stats.serviceWorker = this.optimizers.serviceWorker.getCacheStats();
    }
    
    if (this.optimizers.sharedBuffer) {
      stats.sharedBuffer = 'available';
    }
    
    if (this.optimizers.wasm) {
      stats.wasm = 'available';
    }
    
    if (this.optimizers.compression) {
      stats.compression = 'available';
    }
    
    return stats;
  }

  // Очистка ресурсов
  destroy() {
    if (this.optimizers.sharedBuffer) {
      this.optimizers.sharedBuffer.destroy();
    }
    
    if (this.optimizers.serviceWorker) {
      this.optimizers.serviceWorker.clearCache();
    }
    
    this.optimizers = {};
    this.initialized = false;
  }
}

// Глобальный экземпляр безопасного оптимизатора
export const safeOptimizer = new SafeOptimizer(); 