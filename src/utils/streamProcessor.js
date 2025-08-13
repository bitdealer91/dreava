// streamProcessor.js - Потоковая обработка больших файлов
export class StreamProcessor {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 1024 * 1024; // 1MB chunks
    this.maxConcurrentChunks = options.maxConcurrentChunks || 3;
    this.onProgress = options.onProgress || (() => {});
    this.onChunk = options.onChunk || (() => {});
  }

  // Потоковая обработка файла
  async processFileStream(file) {
    const stream = file.stream();
    const reader = stream.getReader();
    const chunks = [];
    let totalBytes = 0;
    let processedBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        totalBytes += value.length;
        processedBytes += value.length;
        
        // Вызываем callback прогресса
        this.onProgress({
          processed: processedBytes,
          total: file.size,
          percentage: (processedBytes / file.size) * 100
        });
      }

      // Объединяем чанки
      const arrayBuffer = new ArrayBuffer(totalBytes);
      const uint8Array = new Uint8Array(arrayBuffer);
      let offset = 0;
      
      for (const chunk of chunks) {
        uint8Array.set(chunk, offset);
        offset += chunk.length;
      }

      return arrayBuffer;
    } finally {
      reader.releaseLock();
    }
  }

  // Параллельная обработка нескольких файлов
  async processFilesParallel(files) {
    const semaphore = new Semaphore(this.maxConcurrentChunks);
    const results = [];

    const promises = files.map(async (file, index) => {
      await semaphore.acquire();
      
      try {
        const result = await this.processFileStream(file);
        results[index] = { file, result, index };
        return result;
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(promises);
    return results.filter(Boolean);
  }

  // Потоковая загрузка на сервер
  async uploadStream(file, endpoint, options = {}) {
    const { onProgress, chunkSize = this.chunkSize } = options;
    
    // Создаем поток для чтения файла
    const stream = file.stream();
    const reader = stream.getReader();
    
    const chunks = [];
    let totalSize = 0;
    
    try {
      // Читаем файл по частям
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        totalSize += value.length;
        
        // Отправляем чанк на сервер
        if (chunks.length >= chunkSize) {
          await this.uploadChunk(chunks, endpoint);
          chunks.length = 0; // Очищаем массив
          
          if (onProgress) {
            onProgress({ uploaded: totalSize, total: file.size });
          }
        }
      }
      
      // Отправляем оставшиеся чанки
      if (chunks.length > 0) {
        await this.uploadChunk(chunks, endpoint);
      }
      
    } finally {
      reader.releaseLock();
    }
  }

  // Загрузка чанка на сервер
  async uploadChunk(chunks, endpoint) {
    const blob = new Blob(chunks);
    const formData = new FormData();
    formData.append('chunk', blob);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return response.json();
  }
}

// Семафор для ограничения параллельных операций
class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.max) {
      this.current++;
      return Promise.resolve();
    }
    
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release() {
    this.current--;
    
    if (this.queue.length > 0) {
      this.current++;
      const resolve = this.queue.shift();
      resolve();
    }
  }
}

// Утилиты для работы с потоками
export const StreamUtils = {
  // Создание потока из ArrayBuffer
  createStreamFromBuffer(buffer) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(buffer));
        controller.close();
      }
    });
  },

  // Создание потока из Blob
  createStreamFromBlob(blob) {
    return blob.stream();
  },

  // Обработка потока с трансформацией
  async transformStream(stream, transformer) {
    const reader = stream.getReader();
    const writer = new WritableStream({
      write(chunk) {
        return transformer(chunk);
      }
    });
    
    return reader.pipeTo(writer);
  },

  // Сжатие потока
  async compressStream(stream, options = {}) {
    const cs = new CompressionStream('gzip');
    return stream.pipeThrough(cs);
  },

  // Распаковка потока
  async decompressStream(stream) {
    const ds = new DecompressionStream('gzip');
    return stream.pipeThrough(ds);
  }
};

// Адаптивная обработка файлов
export class AdaptiveFileProcessor {
  constructor() {
    this.performanceHistory = [];
    this.currentBatchSize = 10;
    this.maxBatchSize = 50;
    this.minBatchSize = 5;
  }

  // Адаптивный размер батча на основе производительности
  updateBatchSize(processingTime, batchSize) {
    const throughput = batchSize / (processingTime / 1000); // файлов в секунду
    
    this.performanceHistory.push(throughput);
    if (this.performanceHistory.length > 10) {
      this.performanceHistory.shift();
    }
    
    const avgThroughput = this.performanceHistory.reduce((a, b) => a + b) / this.performanceHistory.length;
    
    // Адаптируем размер батча
    if (avgThroughput > 50 && this.currentBatchSize < this.maxBatchSize) {
      this.currentBatchSize = Math.min(this.currentBatchSize + 5, this.maxBatchSize);
    } else if (avgThroughput < 20 && this.currentBatchSize > this.minBatchSize) {
      this.currentBatchSize = Math.max(this.currentBatchSize - 2, this.minBatchSize);
    }
    
    return this.currentBatchSize;
  }

  // Обработка файлов с адаптивным размером батча
  async processFilesAdaptive(files, processor) {
    const results = [];
    
    for (let i = 0; i < files.length; i += this.currentBatchSize) {
      const batch = files.slice(i, i + this.currentBatchSize);
      const startTime = Date.now();
      
      try {
        const batchResults = await processor(batch);
        results.push(...batchResults);
        
        const processingTime = Date.now() - startTime;
        this.updateBatchSize(processingTime, batch.length);
        
      } catch (error) {
        // Уменьшаем размер батча при ошибке
        this.currentBatchSize = Math.max(this.currentBatchSize - 2, this.minBatchSize);
        throw error;
      }
    }
    
    return results;
  }
} 