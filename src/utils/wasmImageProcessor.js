// wasmImageProcessor.js - WASM процессор для обработки изображений
export class WasmImageProcessor {
  constructor() {
    this.wasmModule = null;
    this.wasmLoaded = false;
    this.canvasProcessor = null;
    this.initCanvasProcessor();
  }

  async initCanvasProcessor() {
    // Создаем Canvas процессор как fallback
    this.canvasProcessor = new CanvasImageProcessor();
    console.log('✅ Canvas image processor initialized as fallback');
  }

  async loadWasm() {
    try {
      // Проверяем, что WASM файл существует в продакшене
      const wasmPath = '/wasm/image-processor.wasm';
      const response = await fetch(wasmPath, { method: 'HEAD' });
      
      if (response.ok) {
        this.wasmModule = await WebAssembly.instantiateStreaming(
          fetch(wasmPath)
        );
        this.wasmLoaded = true;
        console.log('✅ WASM image processor loaded successfully');
      } else {
        console.warn('⚠️ WASM file not found, using Canvas fallback');
      }
    } catch (error) {
      console.warn('⚠️ WASM loading failed, using Canvas fallback:', error);
    }
  }

  async optimize(file, quality = 0.8) {
    if (this.wasmLoaded && this.wasmModule) {
      try {
        return await this.wasmOptimize(file, quality);
      } catch (error) {
        console.warn('⚠️ WASM optimization failed, falling back to Canvas');
      }
    }
    
    // Fallback на Canvas оптимизацию
    return await this.canvasOptimize(file, quality);
  }

  async wasmOptimize(file, quality) {
    // Здесь будет WASM логика оптимизации
    // Пока используем Canvas как fallback
    return await this.canvasOptimize(file, quality);
  }

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
          
          console.log(`📱 Canvas optimization: ${file.size} -> ${optimizedFile.size} bytes`);
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

  // Дополнительные методы оптимизации
  async resizeImage(file, maxWidth, maxHeight) {
    return await this.canvasOptimize(file, 1.0, { maxWidth, maxHeight });
  }

  async compressImage(file, quality) {
    return await this.canvasOptimize(file, quality);
  }

  async convertFormat(file, format) {
    return await this.canvasOptimize(file, 0.9, { format });
  }
}

// Canvas процессор как fallback
class CanvasImageProcessor {
  constructor() {
    this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
  }

  async optimize(file, quality = 0.8, options = {}) {
    const { maxWidth, maxHeight, format } = options;
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        let { width, height } = img;
        
        // Применяем ограничения размера
        if (maxWidth && width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height *= ratio;
        }
        
        if (maxHeight && height > maxHeight) {
          const ratio = maxHeight / height;
          height = maxHeight;
          width *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Рисуем изображение
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Определяем формат
        const outputFormat = format || file.type;
        const mimeType = this.supportedFormats.includes(outputFormat) ? outputFormat : 'image/jpeg';
        
        // Конвертируем в blob
        canvas.toBlob((blob) => {
          const optimizedFile = new File([blob], file.name, {
            type: mimeType,
            lastModified: Date.now()
          });
          
          console.log(`📱 Canvas optimization: ${file.size} -> ${optimizedFile.size} bytes (${Math.round((1 - optimizedFile.size / file.size) * 100)}% reduction)`);
          resolve(optimizedFile);
        }, mimeType, quality);
      };
      
      img.onerror = () => {
        console.warn('⚠️ Image loading failed, returning original file');
        resolve(file);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
} 