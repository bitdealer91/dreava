// sharedBufferWorker.js - Shared Array Buffer Worker для параллельной обработки
export class SharedBufferWorker {
  constructor() {
    this.worker = null;
    this.initialized = false;
    this.bufferSize = 1024 * 1024; // 1MB
    this.init();
  }

  async init() {
    try {
      // Проверяем поддержку SharedArrayBuffer
      if (typeof SharedArrayBuffer !== 'undefined') {
        this.worker = new Worker('/workers/shared-buffer-worker.js');
        this.worker.onmessage = this.handleMessage.bind(this);
        this.worker.onerror = this.handleError.bind(this);
        this.initialized = true;
        console.log('✅ Shared Buffer Worker initialized');
      } else {
        console.warn('⚠️ SharedArrayBuffer not supported');
      }
    } catch (error) {
      console.warn('⚠️ Shared Buffer Worker initialization failed:', error);
    }
  }

  handleMessage(event) {
    const { type, data, id } = event.data;
    
    switch (type) {
      case 'PROCESSING_COMPLETE':
        console.log('✅ Shared buffer processing complete:', data);
        break;
      case 'PROCESSING_PROGRESS':
        console.log('📊 Shared buffer progress:', data);
        break;
      case 'ERROR':
        console.error('❌ Shared buffer error:', data);
        break;
      default:
        console.log('📨 Shared buffer message:', type, data);
    }
  }

  handleError(error) {
    console.error('❌ Shared Buffer Worker error:', error);
  }

  async processFiles(files) {
    if (!this.initialized) {
      console.warn('⚠️ Shared Buffer Worker not available, using fallback');
      return await this.fallbackProcessing(files);
    }

    return new Promise((resolve, reject) => {
      const messageId = Date.now();
      
      const timeout = setTimeout(() => {
        console.error('⏰ Shared buffer processing timeout');
        reject(new Error('Processing timeout'));
      }, 30000); // 30 секунд

      const messageHandler = (event) => {
        const { type, data, id } = event.data;
        
        if (id === messageId) {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', messageHandler);
          
          if (type === 'PROCESSING_COMPLETE') {
            resolve(data);
          } else if (type === 'ERROR') {
            reject(new Error(data));
          }
        }
      };

      this.worker.addEventListener('message', messageHandler);
      
      // Создаем SharedArrayBuffer для каждого файла
      const fileBuffers = files.map(file => {
        const buffer = new SharedArrayBuffer(this.bufferSize);
        return { file, buffer };
      });

      this.worker.postMessage({
        type: 'PROCESS_FILES',
        data: { files: fileBuffers },
        id: messageId
      });
    });
  }

  async fallbackProcessing(files) {
    console.log('🔄 Using fallback processing for files:', files.length);
    
    const results = [];
    for (const file of files) {
      try {
        // Простая обработка файла
        const result = await this.processFileFallback(file);
        results.push(result);
      } catch (error) {
        console.error('❌ Fallback processing failed for file:', file.name, error);
        results.push({ error: error.message });
      }
    }
    
    return results;
  }

  async processFileFallback(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Простая обработка - подсчет байтов
        let sum = 0;
        for (let i = 0; i < uint8Array.length; i++) {
          sum += uint8Array[i];
        }
        
        resolve({
          file: file.name,
          size: file.size,
          checksum: sum,
          processed: true
        });
      };
      
      reader.onerror = () => {
        resolve({
          file: file.name,
          error: 'File reading failed',
          processed: false
        });
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  async compressData(data) {
    if (!this.initialized) {
      return await this.fallbackCompression(data);
    }

    return new Promise((resolve, reject) => {
      const messageId = Date.now();
      
      const timeout = setTimeout(() => {
        console.error('⏰ Compression timeout');
        reject(new Error('Compression timeout'));
      }, 10000);

      const messageHandler = (event) => {
        const { type, data: result, id } = event.data;
        
        if (id === messageId) {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', messageHandler);
          
          if (type === 'COMPRESSION_COMPLETE') {
            resolve(result);
          } else if (type === 'ERROR') {
            reject(new Error(result));
          }
        }
      };

      this.worker.addEventListener('message', messageHandler);
      
      this.worker.postMessage({
        type: 'COMPRESS_DATA',
        data: { data },
        id: messageId
      });
    });
  }

  async fallbackCompression(data) {
    try {
      // Используем CompressionStream API как fallback
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

  async decompressData(compressedData) {
    if (!this.initialized) {
      return await this.fallbackDecompression(compressedData);
    }

    return new Promise((resolve, reject) => {
      const messageId = Date.now();
      
      const timeout = setTimeout(() => {
        console.error('⏰ Decompression timeout');
        reject(new Error('Decompression timeout'));
      }, 10000);

      const messageHandler = (event) => {
        const { type, data: result, id } = event.data;
        
        if (id === messageId) {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', messageHandler);
          
          if (type === 'DECOMPRESSION_COMPLETE') {
            resolve(result);
          } else if (type === 'ERROR') {
            reject(new Error(result));
          }
        }
      };

      this.worker.addEventListener('message', messageHandler);
      
      this.worker.postMessage({
        type: 'DECOMPRESS_DATA',
        data: { data: compressedData },
        id: messageId
      });
    });
  }

  async fallbackDecompression(compressedData) {
    try {
      // Используем DecompressionStream API как fallback
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

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.initialized = false;
  }
} 