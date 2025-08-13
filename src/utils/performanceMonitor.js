// performanceMonitor.js - Система мониторинга производительности
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      uploads: {
        total: 0,
        successful: 0,
        failed: 0,
        totalBytes: 0,
        averageSpeed: 0,
        averageTime: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalItems: 0,
        memoryUsage: 0
      },
      network: {
        requests: 0,
        errors: 0,
        averageResponseTime: 0,
        slowestRequest: 0
      },
      memory: {
        used: 0,
        peak: 0,
        available: 0
      },
      timing: {
        startTime: null,
        lastUpdate: null,
        totalDuration: 0
      }
    };
    
    this.history = [];
    this.maxHistorySize = 100;
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  // Начать мониторинг
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.metrics.timing.startTime = Date.now();
    this.metrics.timing.lastUpdate = Date.now();
    
    // Обновляем метрики каждые 2 секунды
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
    }, 2000);
    
    console.log('📊 Performance monitoring started');
  }

  // Остановить мониторинг
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.updateMetrics();
    this.saveToHistory();
    
    console.log('📊 Performance monitoring stopped');
  }

  // Обновить метрики
  updateMetrics() {
    const now = Date.now();
    this.metrics.timing.lastUpdate = now;
    this.metrics.timing.totalDuration = now - this.metrics.timing.startTime;
    
    // Обновляем метрики памяти
    if ('memory' in performance) {
      const memory = performance.memory;
      this.metrics.memory.used = memory.usedJSHeapSize;
      this.metrics.memory.available = memory.jsHeapSizeLimit;
      this.metrics.memory.peak = Math.max(this.metrics.memory.peak, memory.usedJSHeapSize);
    }
    
    // Вычисляем среднюю скорость загрузки
    if (this.metrics.uploads.total > 0) {
      this.metrics.uploads.averageSpeed = this.metrics.uploads.totalBytes / (this.metrics.timing.totalDuration / 1000);
      this.metrics.uploads.averageTime = this.metrics.timing.totalDuration / this.metrics.uploads.total;
    }
    
    // Вычисляем hit rate кэша
    const totalCacheAccess = this.metrics.cache.hits + this.metrics.cache.misses;
    if (totalCacheAccess > 0) {
      this.metrics.cache.hitRate = (this.metrics.cache.hits / totalCacheAccess) * 100;
    }
    
    // Вычисляем среднее время ответа сети
    if (this.metrics.network.requests > 0) {
      this.metrics.network.averageResponseTime = this.metrics.network.averageResponseTime / this.metrics.network.requests;
    }
  }

  // Записать метрики в историю
  saveToHistory() {
    const snapshot = {
      timestamp: Date.now(),
      metrics: JSON.parse(JSON.stringify(this.metrics))
    };
    
    this.history.push(snapshot);
    
    // Ограничиваем размер истории
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  // Записать успешную загрузку
  recordSuccessfulUpload(bytes, duration) {
    this.metrics.uploads.total++;
    this.metrics.uploads.successful++;
    this.metrics.uploads.totalBytes += bytes;
    
    if (duration) {
      this.metrics.network.averageResponseTime += duration;
      this.metrics.network.slowestRequest = Math.max(this.metrics.network.slowestRequest, duration);
    }
    
    this.metrics.network.requests++;
  }

  // Записать неудачную загрузку
  recordFailedUpload(bytes, error) {
    this.metrics.uploads.total++;
    this.metrics.uploads.failed++;
    if (bytes) this.metrics.uploads.totalBytes += bytes;
    
    this.metrics.network.requests++;
    this.metrics.network.errors++;
    
    console.warn('📊 Upload failed:', error);
  }

  // Записать hit кэша
  recordCacheHit() {
    this.metrics.cache.hits++;
  }

  // Записать miss кэша
  recordCacheMiss() {
    this.metrics.cache.misses++;
  }

  // Обновить статистику кэша
  updateCacheStats(stats) {
    this.metrics.cache.totalItems = stats.totalItems || 0;
    this.metrics.cache.memoryUsage = stats.totalMemory || 0;
  }

  // Получить текущие метрики
  getMetrics() {
    this.updateMetrics();
    return this.metrics;
  }

  // Получить историю метрик
  getHistory() {
    return this.history;
  }

  // Получить сводку производительности
  getPerformanceSummary() {
    const metrics = this.getMetrics();
    
    return {
      uploads: {
        total: metrics.uploads.total,
        successRate: metrics.uploads.total > 0 ? (metrics.uploads.successful / metrics.uploads.total * 100).toFixed(1) : 0,
        averageSpeed: this.formatBytes(metrics.uploads.averageSpeed) + '/s',
        totalData: this.formatBytes(metrics.uploads.totalBytes)
      },
      cache: {
        hitRate: metrics.cache.hitRate.toFixed(1) + '%',
        items: metrics.cache.totalItems,
        memory: this.formatBytes(metrics.cache.memoryUsage)
      },
      network: {
        requests: metrics.network.requests,
        errorRate: metrics.network.requests > 0 ? (metrics.network.errors / metrics.network.requests * 100).toFixed(1) : 0,
        averageResponseTime: metrics.network.averageResponseTime.toFixed(0) + 'ms'
      },
      memory: {
        used: this.formatBytes(metrics.memory.used),
        peak: this.formatBytes(metrics.memory.peak),
        available: this.formatBytes(metrics.memory.available)
      },
      duration: this.formatDuration(metrics.timing.totalDuration)
    };
  }

  // Форматирование байтов
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Форматирование времени
  formatDuration(ms) {
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }

  // Экспорт метрик
  exportMetrics() {
    return {
      metrics: this.getMetrics(),
      history: this.getHistory(),
      summary: this.getPerformanceSummary(),
      exportTime: new Date().toISOString()
    };
  }

  // Сброс метрик
  reset() {
    this.metrics = {
      uploads: { total: 0, successful: 0, failed: 0, totalBytes: 0, averageSpeed: 0, averageTime: 0 },
      cache: { hits: 0, misses: 0, hitRate: 0, totalItems: 0, memoryUsage: 0 },
      network: { requests: 0, errors: 0, averageResponseTime: 0, slowestRequest: 0 },
      memory: { used: 0, peak: 0, available: 0 },
      timing: { startTime: null, lastUpdate: null, totalDuration: 0 }
    };
    this.history = [];
    
    console.log('📊 Performance metrics reset');
  }
}

// Глобальный экземпляр монитора
export const performanceMonitor = new PerformanceMonitor(); 