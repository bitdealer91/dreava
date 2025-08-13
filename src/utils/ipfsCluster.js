// ipfsCluster.js - Распределенная загрузка на IPFS Cluster
export class IPFSCluster {
  constructor(options = {}) {
    this.nodes = options.nodes || [
      'https://gateway.lighthouse.storage',
      'https://gateway.pinata.cloud',
      'https://ipfs.io',
      'https://dweb.link',
      'https://cloudflare-ipfs.com'
    ];
    this.maxConcurrentNodes = options.maxConcurrentNodes || 3;
    this.timeout = options.timeout || 30000; // 30 секунд
    this.retries = options.retries || 2;
    this.healthCheckInterval = options.healthCheckInterval || 60000; // 1 минута
    
    this.nodeHealth = new Map();
    this.nodeLatency = new Map();
    this.activeUploads = new Map();
    
    // Инициализация мониторинга узлов
    this.initHealthMonitoring();
  }

  // Инициализация мониторинга здоровья узлов
  async initHealthMonitoring() {
    console.log('🔍 Initializing IPFS Cluster health monitoring...');
    
    // Проверяем все узлы при старте
    await this.checkAllNodes();
    
    // Периодическая проверка здоровья
    setInterval(() => {
      this.checkAllNodes();
    }, this.healthCheckInterval);
  }

  // Проверка здоровья всех узлов
  async checkAllNodes() {
    const healthChecks = this.nodes.map(async (node) => {
      try {
        const startTime = Date.now();
        const response = await fetch(`${node}/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        const latency = Date.now() - startTime;
        
        this.nodeHealth.set(node, response.ok);
        this.nodeLatency.set(node, latency);
        
        console.log(`✅ Node ${node}: ${response.ok ? 'Healthy' : 'Unhealthy'} (${latency}ms)`);
        
        return { node, healthy: response.ok, latency };
      } catch (error) {
        console.warn(`❌ Node ${node} health check failed:`, error.message);
        this.nodeHealth.set(node, false);
        this.nodeLatency.set(node, Infinity);
        return { node, healthy: false, latency: Infinity };
      }
    });

    const results = await Promise.allSettled(healthChecks);
    const healthyNodes = results
      .filter(r => r.status === 'fulfilled' && r.value.healthy)
      .map(r => r.value.node);

    console.log(`📊 IPFS Cluster status: ${healthyNodes.length}/${this.nodes.length} nodes healthy`);
    return healthyNodes;
  }

  // Получение лучших узлов для загрузки
  getBestNodes(count = this.maxConcurrentNodes) {
    const healthyNodes = Array.from(this.nodeHealth.entries())
      .filter(([_, healthy]) => healthy)
      .map(([node, _]) => node)
      .sort((a, b) => {
        const latencyA = this.nodeLatency.get(a) || Infinity;
        const latencyB = this.nodeLatency.get(b) || Infinity;
        return latencyA - latencyB;
      });

    return healthyNodes.slice(0, count);
  }

  // Распределенная загрузка файла
  async uploadFile(file, metadata = {}) {
    const bestNodes = this.getBestNodes();
    
    if (bestNodes.length === 0) {
      throw new Error('No healthy IPFS nodes available');
    }

    console.log(`🚀 Uploading to ${bestNodes.length} IPFS nodes:`, bestNodes);

    // Создаем уникальный ID для этой загрузки
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeUploads.set(uploadId, { file, metadata, nodes: bestNodes });

    try {
      // Загружаем на все узлы параллельно
      const uploadPromises = bestNodes.map(async (node, index) => {
        return this.uploadToNode(node, file, metadata, uploadId, index);
      });

      const results = await Promise.allSettled(uploadPromises);
      
      // Анализируем результаты
      const successful = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      const failed = results
        .filter(r => r.status === 'rejected')
        .map((r, index) => ({ node: bestNodes[index], error: r.reason }));

      console.log(`📊 Upload results: ${successful.length} success, ${failed.length} failed`);

      if (successful.length === 0) {
        throw new Error('All upload attempts failed');
      }

      // Возвращаем лучший результат (самый быстрый)
      const bestResult = successful.reduce((best, current) => {
        return current.latency < best.latency ? current : best;
      });

      return {
        success: true,
        cid: bestResult.cid,
        url: bestResult.url,
        node: bestResult.node,
        latency: bestResult.latency,
        allResults: successful,
        failedNodes: failed
      };

    } finally {
      this.activeUploads.delete(uploadId);
    }
  }

  // Загрузка на конкретный узел
  async uploadToNode(node, file, metadata, uploadId, nodeIndex) {
    const startTime = Date.now();
    
    try {
      // Подготавливаем данные для загрузки
      const formData = new FormData();
      formData.append('file', file);
      
      if (metadata.name) formData.append('name', metadata.name);
      if (metadata.description) formData.append('description', metadata.description);
      if (metadata.attributes) formData.append('attributes', JSON.stringify(metadata.attributes));

      // Определяем endpoint в зависимости от узла
      const endpoint = this.getNodeEndpoint(node);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const latency = Date.now() - startTime;

      console.log(`✅ Node ${node} upload successful (${latency}ms):`, result);

      return {
        node,
        cid: result.cid || result.hash,
        url: result.url || `${node}/ipfs/${result.cid || result.hash}`,
        latency,
        result
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`❌ Node ${node} upload failed (${latency}ms):`, error);
      throw error;
    }
  }

  // Определение endpoint для узла
  getNodeEndpoint(node) {
    if (node.includes('lighthouse.storage')) {
      return '/pin-file'; // Наш собственный endpoint
    } else if (node.includes('pinata.cloud')) {
      return 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    } else {
      return '/pin-file'; // Fallback на наш endpoint
    }
  }

  // Пакетная загрузка нескольких файлов
  async uploadBatch(files, metadataArray = []) {
    console.log(`🚀 Starting batch upload of ${files.length} files to IPFS Cluster`);

    const results = [];
    const semaphore = new Semaphore(this.maxConcurrentNodes);

    const uploadPromises = files.map(async (file, index) => {
      await semaphore.acquire();
      
      try {
        const metadata = metadataArray[index] || {};
        const result = await this.uploadFile(file, metadata);
        results[index] = { ...result, index };
        return result;
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(uploadPromises);
    
    console.log(`✅ Batch upload completed: ${results.filter(r => r.success).length}/${files.length} successful`);
    
    return results.filter(Boolean);
  }

  // Проверка доступности файла на всех узлах
  async checkFileAvailability(cid) {
    const checks = this.nodes.map(async (node) => {
      try {
        const startTime = Date.now();
        const response = await fetch(`${node}/ipfs/${cid}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        const latency = Date.now() - startTime;
        
        return {
          node,
          available: response.ok,
          latency,
          status: response.status
        };
      } catch (error) {
        return {
          node,
          available: false,
          latency: Infinity,
          error: error.message
        };
      }
    });

    const results = await Promise.allSettled(checks);
    const availability = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    return {
      cid,
      totalNodes: this.nodes.length,
      availableNodes: availability.filter(a => a.available).length,
      availability: availability
    };
  }

  // Получение статистики кластера
  getClusterStats() {
    const healthyNodes = Array.from(this.nodeHealth.values()).filter(Boolean).length;
    const avgLatency = Array.from(this.nodeLatency.values())
      .filter(latency => latency !== Infinity)
      .reduce((sum, latency) => sum + latency, 0) / 
      Array.from(this.nodeLatency.values()).filter(latency => latency !== Infinity).length;

    return {
      totalNodes: this.nodes.length,
      healthyNodes,
      healthRate: (healthyNodes / this.nodes.length) * 100,
      averageLatency: avgLatency || 0,
      activeUploads: this.activeUploads.size
    };
  }
}

// Семафор для ограничения параллельных загрузок
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

// Специализированный кластер для NFT
export class NFTIPFSCluster extends IPFSCluster {
  constructor(options = {}) {
    super({
      nodes: options.nodes || [
        'https://gateway.lighthouse.storage',
        'https://gateway.pinata.cloud',
        'https://ipfs.io',
        'https://dweb.link'
      ],
      maxConcurrentNodes: options.maxConcurrentNodes || 3,
      ...options
    });
  }

  // Загрузка NFT с метаданными
  async uploadNFT(file, nftMetadata) {
    const metadata = {
      name: nftMetadata.name,
      description: nftMetadata.description,
      attributes: nftMetadata.attributes,
      image: nftMetadata.image,
      external_url: nftMetadata.external_url
    };

    return this.uploadFile(file, metadata);
  }

  // Пакетная загрузка NFT коллекции
  async uploadNFTCollection(files, nftMetadataArray) {
    console.log(`🎨 Starting NFT collection upload: ${files.length} NFTs`);

    const results = await this.uploadBatch(files, nftMetadataArray);
    
    // Создаем коллекцию метаданных
    const collectionMetadata = {
      name: nftMetadataArray[0]?.collectionName || 'NFT Collection',
      description: nftMetadataArray[0]?.collectionDescription || '',
      items: results.map((result, index) => ({
        id: index + 1,
        name: nftMetadataArray[index]?.name || `NFT #${index + 1}`,
        cid: result.cid,
        url: result.url,
        attributes: nftMetadataArray[index]?.attributes || []
      }))
    };

    return {
      collection: collectionMetadata,
      items: results,
      totalUploaded: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
    };
  }
} 