// mobileOptimizer.js - Оптимизация для мобильных устройств
export class MobileOptimizer {
  constructor() {
    this.isMobile = this.detectMobile();
    this.isLowEnd = this.detectLowEndDevice();
    this.connectionSpeed = this.detectConnectionSpeed();
    this.batteryLevel = null;
    this.batteryCharging = false;
    
    this.initializeBatteryMonitoring();
    this.initializeConnectionMonitoring();
  }

  // Определение мобильного устройства
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }

  // Определение слабого устройства
  detectLowEndDevice() {
    const memory = navigator.deviceMemory || 4; // GB
    const cores = navigator.hardwareConcurrency || 4;
    const isLowEnd = memory < 4 || cores < 4;
    
    console.log(`📱 Device specs: ${memory}GB RAM, ${cores} cores, Low-end: ${isLowEnd}`);
    return isLowEnd;
  }

  // Определение скорости соединения
  detectConnectionSpeed() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const speed = connection.effectiveType || 'unknown';
      const downlink = connection.downlink || 10; // Mbps
      
      console.log(`🌐 Connection: ${speed}, ${downlink}Mbps`);
      
      if (speed === 'slow-2g' || speed === '2g' || downlink < 1) return 'slow';
      if (speed === '3g' || downlink < 5) return 'medium';
      return 'fast';
    }
    
    return 'unknown';
  }

  // Инициализация мониторинга батареи
  async initializeBatteryMonitoring() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        this.batteryLevel = battery.level;
        this.batteryCharging = battery.charging;
        
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
        });
        
        battery.addEventListener('chargingchange', () => {
          this.batteryCharging = battery.charging;
        });
        
        console.log(`🔋 Battery: ${(this.batteryLevel * 100).toFixed(0)}%, Charging: ${this.batteryCharging}`);
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
  }

  // Инициализация мониторинга соединения
  initializeConnectionMonitoring() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      connection.addEventListener('change', () => {
        this.connectionSpeed = this.detectConnectionSpeed();
        console.log(`🌐 Connection changed: ${this.connectionSpeed}`);
      });
    }
  }

  // Получить оптимальные настройки для устройства
  getOptimalSettings() {
    const settings = {
      batchSize: 25,
      maxConcurrentUploads: 3,
      compressionLevel: 'medium',
      imageQuality: 0.8,
      useWebWorker: true,
      useStreaming: false,
      cacheSize: 50,
      retryAttempts: 3,
      retryDelay: 1000
    };

    if (this.isMobile) {
      settings.batchSize = 10;
      settings.maxConcurrentUploads = 2;
      settings.cacheSize = 25;
      
      if (this.isLowEnd) {
        settings.batchSize = 5;
        settings.maxConcurrentUploads = 1;
        settings.useWebWorker = false;
        settings.cacheSize = 10;
        settings.retryAttempts = 2;
      }
      
      if (this.connectionSpeed === 'slow') {
        settings.batchSize = 3;
        settings.maxConcurrentUploads = 1;
        settings.compressionLevel = 'high';
        settings.imageQuality = 0.6;
        settings.retryDelay = 2000;
      }
      
      // Учитываем уровень батареи
      if (this.batteryLevel !== null && this.batteryLevel < 0.2 && !this.batteryCharging) {
        settings.batchSize = Math.max(2, settings.batchSize / 2);
        settings.maxConcurrentUploads = 1;
        settings.useWebWorker = false;
        console.log('🔋 Low battery detected, reducing performance');
      }
    }

    console.log('📱 Optimal settings:', settings);
    return settings;
  }

  // Оптимизировать изображение для мобильного устройства
  async optimizeImage(file, quality = 0.8) {
    if (!this.isMobile) return file;
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Определяем оптимальный размер для мобильного устройства
        const maxWidth = this.isLowEnd ? 800 : 1200;
        const maxHeight = this.isLowEnd ? 600 : 900;
        
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Рисуем изображение с новым размером
        ctx.drawImage(img, 0, 0, width, height);
        
        // Конвертируем в blob с оптимизированным качеством
        canvas.toBlob((blob) => {
          const optimizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          
          console.log(`📱 Image optimized: ${file.size} -> ${optimizedFile.size} bytes`);
          resolve(optimizedFile);
        }, file.type, quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  // Оптимизировать массив файлов
  async optimizeFiles(files) {
    if (!this.isMobile) return files;
    
    const settings = this.getOptimalSettings();
    const optimizedFiles = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.type.startsWith('image/')) {
        const optimizedFile = await this.optimizeImage(file, settings.imageQuality);
        optimizedFiles.push(optimizedFile);
      } else {
        optimizedFiles.push(file);
      }
    }
    
    return optimizedFiles;
  }

  // Получить рекомендации для пользователя
  getRecommendations() {
    const recommendations = [];
    
    if (this.isMobile) {
      recommendations.push('📱 Mobile device detected - using optimized settings');
      
      if (this.isLowEnd) {
        recommendations.push('⚠️ Low-end device detected - reduced batch size and performance');
      }
      
      if (this.connectionSpeed === 'slow') {
        recommendations.push('🌐 Slow connection detected - increased compression and reduced batch size');
      }
      
      if (this.batteryLevel !== null && this.batteryLevel < 0.2 && !this.batteryCharging) {
        recommendations.push('🔋 Low battery - consider charging or reducing upload size');
      }
    }
    
    return recommendations;
  }

  // Проверить, можно ли загружать
  canUpload() {
    if (this.batteryLevel !== null && this.batteryLevel < 0.1 && !this.batteryCharging) {
      return { canUpload: false, reason: 'Battery too low (less than 10%)' };
    }
    
    if (this.connectionSpeed === 'slow' && this.isLowEnd) {
      return { canUpload: true, reason: 'Slow connection and low-end device - uploads may be slow' };
    }
    
    return { canUpload: true, reason: 'Ready to upload' };
  }

  // Получить информацию об устройстве
  getDeviceInfo() {
    return {
      isMobile: this.isMobile,
      isLowEnd: this.isLowEnd,
      connectionSpeed: this.connectionSpeed,
      batteryLevel: this.batteryLevel,
      batteryCharging: this.batteryCharging,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      memory: navigator.deviceMemory || 'unknown',
      cores: navigator.hardwareConcurrency || 'unknown'
    };
  }
}

// Глобальный экземпляр оптимизатора
export const mobileOptimizer = new MobileOptimizer(); 