// advancedCache.js - Продвинутая система кэширования
export class AdvancedCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100; // Максимум элементов
    this.maxMemory = options.maxMemory || 100 * 1024 * 1024; // 100MB
    this.ttl = options.ttl || 24 * 60 * 60 * 1000; // 24 часа
    this.compression = options.compression !== false; // Сжатие по умолчанию
    
    this.cache = new Map();
    this.indexes = new Map(); // Индексы для быстрого поиска
    this.accessOrder = []; // Порядок доступа для LRU
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      compressions: 0
    };
    
    // Периодическая очистка устаревших элементов
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Каждые 5 минут
  }

  // Генерация ключа для индексации
  generateKey(data) {
    if (typeof data === 'string') {
      return data;
    }
    
    if (data instanceof File) {
      return `file_${data.name}_${data.size}_${data.lastModified}`;
    }
    
    if (data instanceof ArrayBuffer) {
      return `buffer_${data.byteLength}`;
    }
    
    return JSON.stringify(data);
  }

  // Сжатие данных
  async compress(data) {
    if (!this.compression) return data;
    
    try {
      if (typeof data === 'string') {
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(data);
        const compressed = await this.compressUint8Array(uint8Array);
        this.stats.compressions++;
        return compressed;
      }
      
      if (data instanceof ArrayBuffer) {
        const uint8Array = new Uint8Array(data);
        const compressed = await this.compressUint8Array(uint8Array);
        this.stats.compressions++;
        return compressed;
      }
      
      return data;
    } catch (error) {
      console.warn('Compression failed, using original data:', error);
      return data;
    }
  }

  // Сжатие Uint8Array
  async compressUint8Array(uint8Array) {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    const reader = cs.readable.getReader();
    
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
  }

  // Распаковка данных
  async decompress(data) {
    if (!this.compression || !(data instanceof ArrayBuffer)) return data;
    
    try {
      const uint8Array = new Uint8Array(data);
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      
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
      
      return new TextDecoder().decode(decompressed);
    } catch (error) {
      console.warn('Decompression failed, returning original data:', error);
      return data;
    }
  }

  // Добавление элемента в кэш
  async set(key, value, options = {}) {
    const cacheKey = this.generateKey(key);
    const ttl = options.ttl || this.ttl;
    const compressed = await this.compress(value);
    
    const entry = {
      value: compressed,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.calculateSize(compressed),
      originalSize: this.calculateSize(value)
    };
    
    // Проверяем, нужно ли освободить место
    if (this.shouldEvict(entry.size)) {
      this.evict();
    }
    
    this.cache.set(cacheKey, entry);
    this.updateAccessOrder(cacheKey);
    this.updateIndexes(cacheKey, value);
    
    this.stats.sets++;
    
    return cacheKey;
  }

  // Получение элемента из кэша
  async get(key) {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Проверяем срок действия
    if (Date.now() > entry.expiresAt) {
      this.delete(cacheKey);
      this.stats.misses++;
      return null;
    }
    
    // Обновляем статистику доступа
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(cacheKey);
    
    this.stats.hits++;
    
    // Распаковываем данные
    const decompressed = await this.decompress(entry.value);
    return decompressed;
  }

  // Удаление элемента
  delete(key) {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (entry) {
      this.cache.delete(cacheKey);
      this.removeFromAccessOrder(cacheKey);
      this.removeFromIndexes(cacheKey);
      this.stats.deletes++;
    }
  }

  // Проверка наличия элемента
  has(key) {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.delete(cacheKey);
      return false;
    }
    
    return true;
  }

  // Очистка всего кэша
  clear() {
    this.cache.clear();
    this.indexes.clear();
    this.accessOrder = [];
  }

  // Получение статистики
  getStats() {
    const totalItems = this.cache.size;
    const totalMemory = this.getTotalMemory();
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
    
    return {
      ...this.stats,
      totalItems,
      totalMemory,
      hitRate: hitRate * 100,
      compressionRatio: this.getCompressionRatio()
    };
  }

  // Поиск по индексам
  search(query) {
    const results = [];
    
    for (const [indexKey, index] of this.indexes) {
      if (indexKey.includes(query) || query.includes(indexKey)) {
        for (const cacheKey of index) {
          const entry = this.cache.get(cacheKey);
          if (entry && Date.now() <= entry.expiresAt) {
            results.push({ key: cacheKey, entry });
          }
        }
      }
    }
    
    return results;
  }

  // Приватные методы

  calculateSize(data) {
    if (typeof data === 'string') {
      return new TextEncoder().encode(data).length;
    }
    
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    
    if (data instanceof File) {
      return data.size;
    }
    
    return JSON.stringify(data).length;
  }

  shouldEvict(newSize) {
    const currentMemory = this.getTotalMemory();
    return currentMemory + newSize > this.maxMemory || this.cache.size >= this.maxSize;
  }

  getTotalMemory() {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  getCompressionRatio() {
    let totalOriginal = 0;
    let totalCompressed = 0;
    
    for (const entry of this.cache.values()) {
      totalOriginal += entry.originalSize;
      totalCompressed += entry.size;
    }
    
    return totalOriginal > 0 ? (totalCompressed / totalOriginal) * 100 : 100;
  }

  updateAccessOrder(key) {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  updateIndexes(key, value) {
    // Создаем индексы на основе содержимого
    if (typeof value === 'string') {
      const words = value.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 2) {
          if (!this.indexes.has(word)) {
            this.indexes.set(word, new Set());
          }
          this.indexes.get(word).add(key);
        }
      }
    }
    
    // Индекс по размеру
    const size = this.calculateSize(value);
    const sizeRange = this.getSizeRange(size);
    if (!this.indexes.has(sizeRange)) {
      this.indexes.set(sizeRange, new Set());
    }
    this.indexes.get(sizeRange).add(key);
  }

  removeFromIndexes(key) {
    for (const index of this.indexes.values()) {
      index.delete(key);
    }
  }

  getSizeRange(size) {
    if (size < 1024) return 'small';
    if (size < 1024 * 1024) return 'medium';
    if (size < 10 * 1024 * 1024) return 'large';
    return 'huge';
  }

  evict() {
    // LRU эвикшн
    while (this.shouldEvict(0) && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      this.delete(oldestKey);
    }
  }

  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  // Деструктор
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Специализированный кэш для файлов
export class FileCache extends AdvancedCache {
  constructor(options = {}) {
    super({
      maxSize: options.maxSize || 50,
      maxMemory: options.maxMemory || 500 * 1024 * 1024, // 500MB
      ttl: options.ttl || 7 * 24 * 60 * 60 * 1000, // 7 дней
      compression: true,
      ...options
    });
  }

  // Специализированная обработка файлов
  async setFile(file, metadata = {}) {
    const key = await this.generateFileKey(file);
    const value = {
      file: file,
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        ...metadata
      }
    };
    
    return this.set(key, value);
  }

  async getFile(key) {
    const result = await this.get(key);
    return result?.file || null;
  }

  async generateFileKey(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return `file_${hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}`;
  }

  // Поиск файлов по типу
  searchByType(type) {
    const results = [];
    
    for (const [key, entry] of this.cache.entries()) {
      const value = entry.value;
      if (value?.metadata?.type === type) {
        results.push({ key, entry });
      }
    }
    
    return results;
  }

  // Поиск файлов по размеру
  searchBySize(minSize, maxSize) {
    const results = [];
    
    for (const [key, entry] of this.cache.entries()) {
      const value = entry.value;
      const size = value?.metadata?.size;
      if (size >= minSize && size <= maxSize) {
        results.push({ key, entry });
      }
    }
    
    return results;
  }
} 