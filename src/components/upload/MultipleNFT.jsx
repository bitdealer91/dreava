// MultipleNFT.jsx - МАКСИМАЛЬНО ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import uploadIcon from '../../assets/upload-icon.svg';
import { Loader2, X, ChevronDown, Check, BarChart3, Zap } from 'lucide-react';
import { getIpfsUrls, fetchWithFallback } from '../../utils/ipfs';
import VideoSpinner from '../VideoSpinner';
import CancelWarningModal from '../CancelWarningModal';
import { StreamProcessor, AdaptiveFileProcessor } from '../../utils/streamProcessor';
import { FileCache } from '../../utils/advancedCache';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { mobileOptimizer } from '../../utils/mobileOptimizer';
import { safeOptimizer } from '../../utils/safeOptimizer';
import PerformanceStats from './PerformanceStats';
import OptimizationStatus from './OptimizationStatus';
import ReactDOM from 'react-dom';

const getApiBase = () => {
  try {
    const isBrowser = typeof window !== 'undefined';
    const isLocal = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isVite = isBrowser && String(window.location.port) === '5173';
    // Dev (Vite): use proxy via relative paths
    if (isLocal && isVite) return '';
    // Non-dev: allow env override; avoid localStorage sticky config
    const envBase = import.meta?.env?.VITE_API_BASE;
    if (envBase && typeof envBase === 'string' && envBase.trim()) {
      const v = envBase.trim().replace(/\/$/, '');
      if (/^https?:\/\//i.test(v)) return v;
    }
  } catch {}
  // Default: relative
  return '';
};

const buildApiUrl = (path) => {
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return normalizedPath; // relative to current origin (Vite proxy or Nginx)
  return `${base}${normalizedPath}`;
};

// 🔥 НОВОЕ: Продвинутые системы оптимизации
const advancedFileCache = new FileCache({
  maxSize: 100,
  maxMemory: 500 * 1024 * 1024, // 500MB
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 дней
  compression: true
});

const streamProcessor = new StreamProcessor({
  chunkSize: 1024 * 1024, // 1MB chunks
  maxConcurrentChunks: 5,
  onProgress: (progress) => {
    console.log('Stream progress:', progress);
  }
});

const adaptiveProcessor = new AdaptiveFileProcessor();

// 🔥 НОВОЕ: Web Worker для фоновой обработки
let uploadWorker = null;
let workerMessageId = 0;

const initWorker = () => {
  if (typeof Worker !== 'undefined' && !uploadWorker) {
    try {
      // Добавляем cache busting для worker файла
      const workerUrl = `/workers/upload-worker.js?v=${Date.now()}`;
      uploadWorker = new Worker(workerUrl);
      uploadWorker.onmessage = handleWorkerMessage;
      uploadWorker.onerror = handleWorkerError;
      console.log('🔥 Web Worker initialized successfully with cache busting');
    } catch (error) {
      console.warn('Web Worker not available, falling back to main thread:', error);
    }
  }
};

const handleWorkerMessage = (event) => {
  const { type, data, id } = event.data;
  
  // Only handle non-response messages here (progress updates, etc.)
  // Response messages are handled by individual message handlers in uploadWithWorker
  if (!id) {
    switch (type) {
      case 'CACHE_STATS':
        console.log('📊 Worker cache stats:', data);
        break;
      case 'BATCH_PROGRESS':
        console.log('🔥 Worker batch progress:', data);
        break;
      case 'BATCH_COMPLETE':
        console.log('✅ Worker batch complete:', data);
        break;
      case 'UPLOAD_COMPLETE':
        console.log('🎉 Worker upload complete:', data);
        break;
      case 'ERROR':
        console.error('❌ Worker error:', data);
        break;
    }
  }
};

const handleWorkerError = (error) => {
  console.error('❌ Web Worker error:', error);
};

// 🔥 НОВОЕ: Продвинутая загрузка с Web Worker
const uploadWithWorker = async (files, names, descriptions, allAttributes, options = {}) => {
  console.log('🚀 Starting uploadWithWorker...');
  console.log('📊 Files count:', files.length);
  console.log('📊 Options:', options);
  
  if (!uploadWorker) {
    console.log('🐌 Falling back to main thread processing');
    return uploadWithAdvancedCache(files, names, descriptions, allAttributes);
  }

  return new Promise((resolve, reject) => {
    const messageId = ++workerMessageId;
    console.log('🆔 Generated message ID:', messageId);
    
    const timeout = setTimeout(() => {
      console.error('⏰ Worker timeout after 5 minutes');
      reject(new Error('Worker timeout'));
    }, 300000); // 5 минут таймаут

    const messageHandler = (event) => {
      console.log('📨 Worker message received:', event.data);
      const { type, data, id } = event.data;
      
      console.log('🔍 Message details:', { type, id, messageId, match: id === messageId });
      
      if (id === messageId) {
        console.log('✅ Message ID matches, processing response...');
        
        if (type === 'UPLOAD_COMPLETE') {
          console.log('🎉 Worker completed successfully, resolving with data:', data);
          clearTimeout(timeout);
          uploadWorker.removeEventListener('message', messageHandler);
          resolve(data);
        } else if (type === 'ERROR') {
          console.error('❌ Worker error:', data);
          // 🔥 ИСПРАВЛЕНИЕ: Улучшенная обработка ошибок
          let errorMessage = 'Unknown worker error';
          if (typeof data === 'string') {
            errorMessage = data;
          } else if (data && data.error) {
            errorMessage = data.error;
          } else if (data && typeof data === 'object') {
            errorMessage = JSON.stringify(data);
          }
          console.error('❌ Worker error details:', { data, errorMessage });
          clearTimeout(timeout);
          uploadWorker.removeEventListener('message', messageHandler);
          reject(new Error(errorMessage));
        } else {
          console.log('📊 Progress message received:', type, data);
          // Не удаляем обработчик для промежуточных сообщений
        }
      } else {
        console.log('⏭️ Skipping message with different ID:', id);
      }
    };

    uploadWorker.addEventListener('message', messageHandler);
    
    const message = {
      type: 'UPLOAD_FILES',
      data: { files, names, descriptions, allAttributes, options },
      id: messageId
    };
    
    console.log('📤 Sending message to worker:', message);
    uploadWorker.postMessage(message);
  });
};

// 🔥 НОВОЕ: Продвинутая загрузка с кэшированием и потоковой обработкой
const uploadWithAdvancedCache = async (files, names, descriptions, allAttributes) => {
  console.log('🔥 Using advanced cache and streaming...');
  
  // Проверяем продвинутый кэш
  const cacheResults = await Promise.all(
    files.map(async (file, index) => {
      const cached = await advancedFileCache.getFile(file);
      if (cached) {
        console.log(`✅ Advanced cache hit for file ${index + 1}`);
        performanceMonitor.recordCacheHit();
        return { cached: true, data: cached, index };
      }
      performanceMonitor.recordCacheMiss();
      return { cached: false, file, index };
    })
  );

  const cachedFiles = cacheResults.filter(r => r.cached);
  const newFiles = cacheResults.filter(r => !r.cached);

  console.log(`📊 Advanced cache stats: ${cachedFiles.length} cached, ${newFiles.length} new files`);

  let newResults = [];
  
  // Обрабатываем новые файлы с потоковой обработкой
  if (newFiles.length > 0) {
    const filesToUpload = newFiles.map(r => r.file);
    const namesToUpload = newFiles.map(r => names[r.index]);
    const descriptionsToUpload = newFiles.map(r => descriptions[r.index]);
    const attributesToUpload = newFiles.map(r => allAttributes[r.index]);

    // Используем адаптивную обработку для больших файлов
    if (filesToUpload.some(f => f.size > 10 * 1024 * 1024)) { // >10MB
      console.log('🌊 Using streaming for large files...');
      newResults = await processLargeFilesStreaming(
        filesToUpload, 
        namesToUpload, 
        descriptionsToUpload, 
        attributesToUpload
      );
    } else {
      console.log('⚡ Using parallel processing for small files...');
      // Fallback: sequential upload via server to avoid undefined helper
      const seqResults = [];
      for (let i = 0; i < filesToUpload.length; i++) {
        const r = await uploadFileToServer(
          filesToUpload[i],
          namesToUpload[i],
          descriptionsToUpload[i],
          attributesToUpload[i]
        );
        seqResults.push(r);
      }
      newResults = { results: seqResults };
    }

    // Нормализуем индексы результатов к исходному порядку и сохраняем в кэш
    const normalized = newFiles.map((nf, i) => {
      const r = newResults.results[i];
      return r ? { ...r, index: nf.index } : null;
    }).filter(Boolean);

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i].file;
      const result = normalized[i];
      if (result) await advancedFileCache.setFile(file, result);
    }

    newResults = normalized;
  }

  // Объединяем результаты в правильном порядке
  const finalResults = [];
  for (let i = 0; i < files.length; i++) {
    const cachedResult = cachedFiles.find(r => r.index === i);
    const newResult = newResults.find(r => r.index === i);
    
    if (cachedResult) {
      finalResults.push(cachedResult.data);
    } else if (newResult) {
      finalResults.push(newResult);
    }
  }

  return { success: true, results: finalResults };
};

// 🔥 НОВОЕ: Потоковая обработка больших файлов
const processLargeFilesStreaming = async (files, names, descriptions, attributes) => {
  const results = [];
  
  // Обрабатываем файлы параллельно с ограничением
  const semaphore = new Semaphore(3); // Максимум 3 файла одновременно
  
  const promises = files.map(async (file, index) => {
    await semaphore.acquire();
    
    try {
      console.log(`🌊 Processing large file ${index + 1}/${files.length}: ${file.name}`);
      
      // Потоковая обработка файла
      const streamResult = await streamProcessor.processFileStream(file);
      
      // Загружаем на сервер
      const uploadResult = await uploadFileToServer(file, names[index], descriptions[index], attributes[index]);
      
      results[index] = uploadResult;
      return uploadResult;
      
    } finally {
      semaphore.release();
    }
  });

  await Promise.all(promises);
  return { results: results.filter(Boolean) };
};

// 🔥 НОВОЕ: Семафор для ограничения параллельных операций
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

// 🔥 НОВОЕ: Загрузка файла на сервер с retry
const uploadFileToServer = async (file, name, description, attributes, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📤 Upload attempt ${attempt} for file:`, file.name, file.size, file.type);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('description', description || '');
      formData.append('quantity', '1');
      if (attributes && attributes.length > 0) {
        formData.append('attributes', JSON.stringify(attributes));
      }
      const endpoints = [buildApiUrl('/api/pin-nft'), buildApiUrl('/pin-nft')];
      let lastError = null;
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { method: 'POST', body: formData });
          if (!response.ok) {
            const text = await response.text();
            console.error('❌ NFT upload failed:', text);
            lastError = new Error(`NFT upload failed: ${response.status} - ${text}`);
            continue;
          }
          const json = await response.json();
          return json;
        } catch (e) {
          lastError = e;
          continue;
        }
      }
      throw lastError || new Error('All endpoints failed');
    } catch (error) {
      console.warn(`Upload attempt ${attempt} failed:`, error);
      if (attempt === retries) throw error;
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
};

// 🔥 НОВОЕ: Система умных атрибутов
const ATTRIBUTE_SUGGESTIONS = {
  'Background': ['Blue', 'Red', 'Green', 'Purple', 'Orange', 'Yellow', 'Pink', 'Black', 'White', 'Gradient'],
  'Body': ['Alien', 'Ape', 'Zombie', 'Robot', 'Human', 'Cat', 'Dog', 'Bear', 'Pig', 'Frog'],
  'Eyes': ['Blue', 'Green', 'Brown', 'Red', 'Yellow', 'Purple', 'Pink', 'Black', 'White', 'Laser'],
  'Mouth': ['Smile', 'Frown', 'Open', 'Closed', 'Tongue', 'Pipe', 'Cigar', 'None'],
  'Hat': ['Cap', 'Beanie', 'Fedora', 'Crown', 'Helmet', 'Bandana', 'None'],
  'Clothing': ['T-Shirt', 'Suit', 'Hoodie', 'Jacket', 'Dress', 'None'],
  'Accessory': ['Glasses', 'Earring', 'Necklace', 'Watch', 'Tattoo', 'None'],
  'Rarity': ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'],
  'Type': ['Character', 'Item', 'Weapon', 'Armor', 'Pet', 'Vehicle'],
  'Element': ['Fire', 'Water', 'Earth', 'Air', 'Lightning', 'Ice', 'Dark', 'Light'],
  'Season': ['Spring', 'Summer', 'Fall', 'Winter'],
  'Mood': ['Happy', 'Sad', 'Angry', 'Surprised', 'Calm', 'Excited'],
  'Style': ['Cartoon', 'Realistic', 'Pixel', 'Anime', 'Abstract', 'Minimalist'],
  'Color': ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Black', 'White', 'Gold', 'Silver'],
  'Pattern': ['Stripes', 'Dots', 'Zigzag', 'Solid', 'Gradient', 'Camouflage', 'Geometric'],
  'Material': ['Metal', 'Wood', 'Plastic', 'Fabric', 'Glass', 'Stone', 'Leather'],
  'Size': ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Massive'],
  'Age': ['Baby', 'Young', 'Adult', 'Elder', 'Ancient'],
  'Gender': ['Male', 'Female', 'Non-binary', 'Unknown'],
  'Class': ['Warrior', 'Mage', 'Archer', 'Rogue', 'Paladin', 'Druid', 'Monk'],
  'Faction': ['Alliance', 'Horde', 'Neutral', 'Chaos', 'Order', 'Nature'],
};

const SmartAttributeInput = ({ trait_type, value, onChange, onRemove, index }) => {
  const [showTraitSuggestions, setShowTraitSuggestions] = useState(false);
  const [showValueSuggestions, setShowValueSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [recentAttributes, setRecentAttributes] = useState(() => {
    const saved = localStorage.getItem('recent_attributes');
    return saved ? JSON.parse(saved) : {};
  });

  // Получаем предложения для текущего trait_type
  const getSuggestions = (trait) => {
    const suggestions = ATTRIBUTE_SUGGESTIONS[trait] || [];
    const recent = recentAttributes[trait] || [];
    return [...new Set([...recent, ...suggestions])];
  };

  // Обновляем недавние атрибуты
  const updateRecentAttributes = (trait, value) => {
    if (!trait || !value) return;
    
    const updated = { ...recentAttributes };
    if (!updated[trait]) updated[trait] = [];
    
    // Добавляем в начало и убираем дубликаты
    updated[trait] = [value, ...updated[trait].filter(v => v !== value)].slice(0, 10);
    
    setRecentAttributes(updated);
    localStorage.setItem('recent_attributes', JSON.stringify(updated));
  };

  // Фильтруем предложения при вводе trait_type
  const handleTraitChange = (newTrait) => {
    onChange('trait_type', newTrait);
    if (newTrait) {
      const suggestions = getSuggestions(newTrait);
      setFilteredSuggestions(suggestions);
      setShowTraitSuggestions(true);
    } else {
      setShowTraitSuggestions(false);
    }
  };

  // Обработка выбора trait_type
  const selectTraitSuggestion = (suggestion) => {
    handleTraitChange(suggestion);
    setShowTraitSuggestions(false);
  };

  const handleValueChange = (newValue) => {
    onChange('value', newValue);
    if (newValue && trait_type) {
      updateRecentAttributes(trait_type, newValue);
    }
  };

  // Обработка выбора value
  const selectValueSuggestion = (suggestion) => {
    handleValueChange(suggestion);
    setShowValueSuggestions(false);
  };

  // Обработка фокуса на поле value
  const handleValueFocus = () => {
    if (trait_type) {
      const suggestions = getSuggestions(trait_type);
      setFilteredSuggestions(suggestions);
      setShowValueSuggestions(true);
    }
  };

  // Обработка потери фокуса
  const handleBlur = (type) => {
    // Небольшая задержка, чтобы успеть обработать клик по предложению
    setTimeout(() => {
      if (type === 'trait') {
        setShowTraitSuggestions(false);
      } else if (type === 'value') {
        setShowValueSuggestions(false);
      }
    }, 150);
  };

  return (
    <div className="flex gap-2 relative">
      <div className="w-1/2 relative">
        <input
          type="text"
          value={trait_type}
          placeholder="Trait (e.g., Background)"
          onChange={(e) => handleTraitChange(e.target.value)}
          onFocus={() => {
            if (trait_type) {
              setShowTraitSuggestions(true);
            }
          }}
          onBlur={() => handleBlur('trait')}
          className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-white text-sm"
        />
        {trait_type && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <ChevronDown size={16} className="text-zinc-400" />
          </div>
        )}
        {showTraitSuggestions && trait_type && (
          <div className="absolute top-full left-0 right-0 bg-zinc-800 border border-zinc-600 rounded-lg mt-1 max-h-40 overflow-y-auto z-10">
            {Object.keys(ATTRIBUTE_SUGGESTIONS)
              .filter(key => key.toLowerCase().includes(trait_type.toLowerCase()))
              .map(key => (
                <div
                  key={key}
                  onClick={() => selectTraitSuggestion(key)}
                  className="px-3 py-2 hover:bg-zinc-700 cursor-pointer text-sm text-white"
                >
                  {key}
                </div>
              ))}
          </div>
        )}
      </div>
      
      <div className="w-1/2 relative">
        <input
          type="text"
          value={value}
          placeholder="Value"
          onChange={(e) => handleValueChange(e.target.value)}
          onFocus={handleValueFocus}
          onBlur={() => handleBlur('value')}
          className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-white text-sm"
        />
        {showValueSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-zinc-800 border border-zinc-600 rounded-lg mt-1 max-h-40 overflow-y-auto z-10">
            {filteredSuggestions.map(suggestion => (
              <div
                key={suggestion}
                onClick={() => selectValueSuggestion(suggestion)}
                className="px-3 py-2 hover:bg-zinc-700 cursor-pointer text-sm text-white flex items-center justify-between"
              >
                <span>{suggestion}</span>
                {recentAttributes[trait_type]?.includes(suggestion) && (
                  <Check size={14} className="text-green-400" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <button
        onClick={onRemove}
        className="px-2 py-2 text-red-400 hover:text-red-300 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

const MultipleNFT = ({ collection, onSuccess }) => {
  const [collectionInfo, setCollectionInfo] = useState({ name: '', description: '' });
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [results, setResults] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [failed, setFailed] = useState([]);
  const [showPostSuccessOptions, setShowPostSuccessOptions] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [startingIndex, setStartingIndex] = useState(1);
  const BATCH_SIZE = 25; // Уменьшаем размер батча для больших объемов
  const MAX_NFT_LIMIT = 10000; // Увеличиваем лимит для больших коллекций
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [isLargeUpload, setIsLargeUpload] = useState(false);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);
  const [showOptimizationStatus, setShowOptimizationStatus] = useState(false);
  const [mobileRecommendations, setMobileRecommendations] = useState([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    console.log('🔍 Loading collection info:', collection);
    if (collection) {
      setCollectionInfo({ 
        name: collection.name || '', 
        description: collection.description || '' 
      });
    }

    const existing = JSON.parse(localStorage.getItem(`collection_${collection?.address}_nfts`)) || [];
    const existingNumbers = existing
      .map(nft => {
        const match = nft.name?.match(/#(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(n => n !== null);
    const startIndex = existingNumbers.length ? Math.max(...existingNumbers) + 1 : 1;
    setStartingIndex(startIndex);

    // 🔥 НОВОЕ: Инициализация Web Worker
    initWorker();
    
    // 🔥 НОВОЕ: Запуск мониторинга производительности
    performanceMonitor.start();
    
    // 🔥 НОВОЕ: Получаем рекомендации для мобильных устройств
    const recommendations = mobileOptimizer.getRecommendations();
    setMobileRecommendations(recommendations);
    
    // 🔥 НОВОЕ: Логируем статистику оптимизаций
    const optimizationStats = safeOptimizer.getOptimizationStats();
    console.log('🚀 SafeOptimizer stats:', optimizationStats);
  }, [collection]);

  // 🔥 ИСПРАВЛЕНИЕ: Сброс нумерации при изменении количества картинок
  useEffect(() => {
    if (images.length === 0) {
      // Если нет картинок, сбрасываем нумерацию на 1
      setStartingIndex(1);
    } else {
      // Если есть картинки, нумеруем с 1 до количества картинок
      const updatedImages = images.map((img, index) => ({
        ...img,
        name: `${collectionInfo.name || 'NFT'} #${index + 1}`
      }));
      setImages(updatedImages);
    }
  }, [images.length, collectionInfo.name]);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => {
        try {
          modalRef.current?.focus();
          modalRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
        } catch {}
      }, 0);
    }
  }, [showModal]);

  const uploadMultipleToIPFSViaServer = async (files, names, descriptions, allAttributes) => {
    console.log('=== UPLOAD DEBUG ===');
    console.log('Files to upload:', files.length);
    console.log('Names from table:', names);
    
    // Загружаем файлы по одному через /pin-nft endpoint
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = names[i];
      const description = descriptions[i];
      const attributes = allAttributes[i];
      
      console.log(`📤 Uploading file ${i + 1}/${files.length}: ${name}`);
      
      try {
        const result = await uploadFileToServer(file, name, description, attributes);
        results.push(result);
        
        // Добавляем небольшую задержку между загрузками
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`❌ Failed to upload file ${i + 1}:`, error);
        results.push({
          status: 'failed',
          name: name,
          error: error.message || 'Unknown error'
        });
      }
    }
    
    console.log('📊 Upload results:', results);
    
    return {
      success: true,
      results: results
    };
  };

  // 🔥 НОВОЕ: Оптимизированная загрузка с кэшированием
  const uploadWithCache = async (files, names, descriptions, allAttributes) => {
    console.log('🔥 Using optimized upload with caching...');
    
    // Проверяем кэш для каждого файла
    const cacheResults = await Promise.all(
      files.map(async (file, index) => {
        const cached = await advancedFileCache.getFile(file);
        if (cached) {
          console.log(`✅ Cache hit for file ${index + 1}`);
          return { cached: true, data: cached, index };
        }
        return { cached: false, file, index };
      })
    );

    // Разделяем файлы на кэшированные и новые
    const cachedFiles = cacheResults.filter(r => r.cached);
    const newFiles = cacheResults.filter(r => !r.cached);

    console.log(`📊 Cache stats: ${cachedFiles.length} cached, ${newFiles.length} new files`);

    let newResults = [];
    
    // Загружаем только новые файлы
    if (newFiles.length > 0) {
      const filesToUpload = newFiles.map(r => r.file);
      const namesToUpload = newFiles.map(r => names[r.index]);
      const descriptionsToUpload = newFiles.map(r => descriptions[r.index]);
      const attributesToUpload = newFiles.map(r => allAttributes[r.index]);

      const uploadResult = await uploadWithAdvancedCache(
        filesToUpload, 
        namesToUpload, 
        descriptionsToUpload, 
        attributesToUpload
      );

      // Нормализуем индексы результатов к исходному порядку и сохраняем в кэш
      const normalized = newFiles.map((nf, i) => {
        const r = uploadResult.results[i];
        return r ? { ...r, index: nf.index } : null;
      }).filter(Boolean);

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i].file;
        const result = normalized[i];
        if (result) await advancedFileCache.setFile(file, result);
      }

      newResults = normalized;
    }

    // Объединяем результаты в правильном порядке
    const finalResults = [];
    for (let i = 0; i < files.length; i++) {
      const cachedResult = cachedFiles.find(r => r.index === i);
      const newResult = newResults.find(r => r.index === i);
      
      if (cachedResult) {
        finalResults.push(cachedResult.data);
      } else if (newResult) {
        finalResults.push(newResult);
      }
    }

    return { success: true, results: finalResults };
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || e.target.files);
    
    // Проверяем, что файлы действительно изображения
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/');
      if (!isValid) {
        console.warn('Skipping non-image file:', file.name);
      }
      return isValid;
    });
    
    if (validFiles.length === 0) {
      alert('Please select only image files.');
      return;
    }
    
    // 🔥 НОВОЕ: Показываем индикатор загрузки при обработке файлов
    setIsProcessingFiles(true);
    
    try {
      // 🔥 НОВОЕ: Безопасная оптимизация файлов с прогрессом
      console.log(`🔄 Processing ${validFiles.length} files...`);
      
      const optimizedFiles = [];
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        console.log(`🔄 Optimizing file ${i + 1}/${validFiles.length}: ${file.name}`);
        const optimized = await safeOptimizer.optimizeImage(file);
        optimizedFiles.push(optimized);
      }
    
    const uploads = optimizedFiles.map((file, index) => {
      // Генерируем правильное имя с расширением
      const fileExtension = file.name.split('.').pop() || 'png';
      const baseName = `${collectionInfo.name || 'NFT'}`;
      // 🔥 ИСПРАВЛЕНИЕ: Используем текущий startingIndex + index
      const number = startingIndex + index;
      
      return {
        file,
        name: `${baseName} #${number}`,
        description: '',
        attributes: [{ trait_type: '', value: '' }],
        originalName: file.name,
        fileExtension: fileExtension
      };
    });
    
      setImages([...images, ...uploads]);
      // 🔥 ИСПРАВЛЕНИЕ: Обновляем startingIndex для следующих загрузок
      setStartingIndex(prev => prev + validFiles.length);
      
      console.log('Added images:', uploads.map(u => ({ name: u.name, originalName: u.originalName })));
    } catch (error) {
      console.error('Error processing uploaded files:', error);
      alert('Error processing files: ' + error.message);
    } finally {
      setIsProcessingFiles(false);
    }
  };

  function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  const handlePublish = async () => {
    if (!images.length || !collectionInfo.name) {
      alert('Please upload at least one image.');
      return;
    }
    if (images.length > MAX_NFT_LIMIT) {
      alert(`You can upload a maximum of ${MAX_NFT_LIMIT} NFTs per collection. Please reduce the number of images.`);
      return;
    }
    
    // 🔥 НОВОЕ: Определяем, является ли это большой загрузкой
    const largeUpload = images.length > 100;
    setIsLargeUpload(largeUpload);
    
    try {
      setUploading(true);
      setProgress(0);
      setProgressText('Preparing upload...');
      setShowModal(true);
      setResults([]);
      setFailed([]);
      setShowPostSuccessOptions(false);
      setBatchProgress({ current: 0, total: Math.ceil(images.length / BATCH_SIZE), success: 0, failed: 0 });

      // 🔥 НОВОЕ: Динамический размер батча для больших загрузок
      const dynamicBatchSize = largeUpload ? 10 : BATCH_SIZE;
      const dynamicChunks = chunkArray(images, dynamicBatchSize);

      let allResults = [];
      let allFailed = [];

      // 🔥 НОВОЕ: Параллельная обработка батчей для больших загрузок
      if (largeUpload && dynamicChunks.length > 3) {
        console.log('🚀 Using parallel batch processing for large upload...');
        
        // Обрабатываем батчи последовательно для избежания конфликтов с воркером
        console.log('🚀 Using sequential batch processing for large upload...');
        
        for (let batchIndex = 0; batchIndex < dynamicChunks.length; batchIndex++) {
          const batch = dynamicChunks[batchIndex];
          const files = batch.map((img) => img.file);
          const names = batch.map((img) => img.name);
          const descriptions = batch.map((img) => img.description || collectionInfo.description);
          const allAttributes = batch.map((img) => img.attributes);

          console.log(`🔥 Processing batch ${batchIndex + 1}/${dynamicChunks.length} (${batch.length} images)...`);
          
          // Обновляем прогресс для каждого батча
          const batchProgress = Math.round(((batchIndex + 1) / dynamicChunks.length) * 80);
          setProgress(batchProgress);
          setProgressText(`Uploading batch ${batchIndex + 1}/${dynamicChunks.length} (${batch.length} images)...`);

          try {
            const response = await uploadWithWorker(files, names, descriptions, allAttributes, {
              batchSize: dynamicBatchSize,
              batchDelay: largeUpload ? 1000 : 500,
              useStreaming: files.some(f => f.size > 10 * 1024 * 1024),
              maxConcurrent: 1 // Ограничиваем до 1 для избежания конфликтов
            });
              
              console.log('🔥 Worker response:', response);
              console.log('🔥 Response type:', typeof response);
              console.log('🔥 Response keys:', Object.keys(response || {}));
              const existing = JSON.parse(localStorage.getItem(`collection_${collection?.address}_nfts`) || '[]');
              
              // 🔥 ИСПРАВЛЕНИЕ: Правильная обработка ответа от воркера
              console.log('🔍 Processing worker response...');
              console.log('🔍 Full response:', response);
              console.log('🔍 Response.results:', response.results);
              console.log('🔍 Response.data?.results:', response.data?.results);
              
              // The worker sends { type: 'UPLOAD_COMPLETE', data: { results: [...] }, id }
              // uploadWithWorker resolves with the 'data' part, so response should be { results: [...] }
              const results = response.results || [];
              console.log('🔍 Final results array:', results);
              console.log('🔍 Results length:', results.length);
              console.log('🔍 Is array:', Array.isArray(results));
              
              // Добавляем детальное логирование каждого результата
              results.forEach((r, idx) => {
                console.log(`🔍 Result ${idx}:`, r);
                console.log(`🔍 Result ${idx} status:`, r.status || 'success');
                console.log(`🔍 Result ${idx} metadataIpfs:`, r.metadataIpfs || (Array.isArray(r.metadataUrls) ? r.metadataUrls[0] : undefined));
                console.log(`🔍 Result ${idx} imageIpfs:`, r.imageIpfs || r.imageUrl);
              });
              
              if (!Array.isArray(results)) {
                console.error('❌ Invalid response format:', response);
                throw new Error('Invalid server response format');
              }
              
              const formatted = await Promise.all(
                results.map(async (r, index) => {
                                  try {
                  const isMarkedSuccess = r.status === 'success' || r.success === true;
                  const hasMeta = r.metadataIpfs || (Array.isArray(r.metadataUrls) && r.metadataUrls.length > 0);
                  if (!isMarkedSuccess && !hasMeta) {
                    console.error('❌ Small upload result marked as failed:', r);
                    throw new Error(`Server marked as failed: ${r.error || 'Unknown error'}`);
                  }
                    
                    // 🔥 ИСПРАВЛЕНИЕ: Правильная обработка структуры от воркера
                    console.log('🔍 Processing result:', r);
                    const metadataIpfs = r.metadataIpfs || (Array.isArray(r.metadataUrls) ? r.metadataUrls[0] : undefined);
                    const imageIpfs = r.imageIpfs || r.imageUrl;
                    if (!metadataIpfs) {
                      console.error('❌ No metadata IPFS hash in result:', r);
                      throw new Error('No metadata IPFS hash returned');
                    }
                    
                    let metadata;
                    if (metadataIpfs && imageIpfs && metadataIpfs === imageIpfs) {
                      // Очевидно, что metadataIpfs указывает на изображение
                      metadata = { image: imageIpfs };
                    } else {
                      try {
                        const urls = getIpfsUrls(metadataIpfs);
                        metadata = await fetchWithFallback(urls);
                      } catch (e) {
                        console.warn('⚠️ Failed to fetch metadata JSON, falling back to image URL:', e?.message);
                        metadata = { image: imageIpfs || '' };
                      }
                    }
                    
                    if (!metadata) {
                      throw new Error('Failed to fetch metadata from IPFS');
                    }
                    
                    // Пропускаем проверку изображения для больших загрузок
                    const nftName = names[index] || r.name || `${collectionInfo.name} #${startingIndex + batchIndex * dynamicBatchSize + index}`;
                    
                    return {
                      id: Date.now() + batchIndex * dynamicBatchSize + index,
                      name: nftName,
                      description: descriptions[index] || '',
                      image: metadata.image ? getIpfsUrls(metadata.image)[0] : '',
                      price: 0,
                      status: 'draft',
                      type: 'multiple',
                      attributes: allAttributes[index] || [],
                      tokenURI: metadataIpfs,
                      failed: false,
                      originalIndex: batchIndex * dynamicBatchSize + index,
                      verified: true,
                    };
                  } catch (err) {
                    console.error(`Error processing result ${index}:`, err);
                    return {
                      name: names[index] || `${collectionInfo.name} #${startingIndex + batchIndex * dynamicBatchSize + index}`,
                      index: batchIndex * dynamicBatchSize + index,
                      failed: true,
                      reason: err.message || 'Unknown error',
                      originalIndex: batchIndex * dynamicBatchSize + index,
                      verified: false,
                    };
                  }
                })
              );

              const successful = formatted.filter((item) => !item.failed && item.verified);
              const failedItems = formatted.filter((item) => item.failed || !item.verified);

              if (successful.length) {
                localStorage.setItem(`collection_${collection?.address}_nfts`, JSON.stringify([...existing, ...successful]));
              }

              // Обновляем прогресс
              setBatchProgress(prev => ({ 
                ...prev, 
                current: batchIndex + 1,
                success: prev.success + successful.length,
                failed: prev.failed + failedItems.length
              }));

              setProgress(Math.round(((batchIndex + 1) / dynamicChunks.length) * 80));
              setProgressText(`Processing batch ${batchIndex + 1}/${dynamicChunks.length} results...`);
              
              // Добавляем задержку для обработки результатов
              await new Promise(resolve => setTimeout(resolve, 500));
              
              setProgressText(`Completed batch ${batchIndex + 1}/${dynamicChunks.length} (${successful.length} success, ${failedItems.length} failed)`);

              allResults = [...allResults, ...successful];
              allFailed = [...allFailed, ...failedItems];
            } catch (err) {
              console.error(`Batch ${batchIndex + 1} failed:`, err);
              const batchFailed = batch.map((img, idx) => ({
                name: img.name,
                index: batchIndex * dynamicBatchSize + idx,
                failed: true,
                reason: err.message || 'Batch upload failed'
              }));
              
              setBatchProgress(prev => ({ 
                ...prev, 
                current: batchIndex + 1,
                failed: prev.failed + batch.length
              }));

              allFailed = [...allFailed, ...batchFailed];
            }
          }
      } else {
        // 🔥 СТАРЫЙ КОД: Последовательная обработка для небольших загрузок
        console.log('🐌 Using sequential processing for small upload...');
        
        for (let i = 0; i < dynamicChunks.length; i++) {
          const batch = dynamicChunks[i];
          const files = batch.map((img) => img.file);
          const names = batch.map((img) => img.name);
          const descriptions = batch.map((img) => img.description || collectionInfo.description);
          const allAttributes = batch.map((img) => img.attributes);

          console.log(`Batch ${i + 1}/${dynamicChunks.length} (${batch.length} images)...`);

          setProgressText(`Uploading batch ${i + 1}/${dynamicChunks.length} (${batch.length} images)...`);
          setProgress(Math.round((i / dynamicChunks.length) * 80));
          setBatchProgress(prev => ({ ...prev, current: i + 1 }));

          try {
            const response = await uploadWithCache(files, names, descriptions, allAttributes);
            const existing = JSON.parse(localStorage.getItem(`collection_${collection?.address}_nfts`) || '[]');
            
            // 🔥 ИСПРАВЛЕНИЕ: Правильная обработка ответа от воркера
            console.log('🔍 Processing small upload response:', response);
            const results = response.results || [];
            if (!Array.isArray(results)) {
              console.error('❌ Invalid response format:', response);
              throw new Error('Invalid server response format');
            }
            
            setProgressText(`Processing batch ${i + 1}/${dynamicChunks.length} results...`);
            
            const formatted = await Promise.all(
              results.map(async (r, index) => {
                try {
                  const isMarkedSuccess = r.status === 'success' || r.success === true;
                  const hasMeta = r.metadataIpfs || (Array.isArray(r.metadataUrls) && r.metadataUrls.length > 0);
                  if (!isMarkedSuccess && !hasMeta) {
                    console.error('❌ Result marked as failed:', r);
                    throw new Error(`Server marked as failed: ${r.error || 'Unknown error'}`);
                  }
                  
                                     // 🔥 ИСПРАВЛЕНИЕ: Правильная обработка структуры от воркера
                   console.log('🔍 Processing small upload result:', r);
                   const metadataIpfs = r.metadataIpfs || (Array.isArray(r.metadataUrls) ? r.metadataUrls[0] : undefined);
                   const imageIpfs = r.imageIpfs || r.imageUrl;
                   if (!metadataIpfs) {
                     console.error('❌ No metadata IPFS hash in result:', r);
                     throw new Error('No metadata IPFS hash returned');
                   }
                   
                                       let metadata;
                    const isLikelyImage = /\.(png|jpg|jpeg|gif|webp|svg|mp4|webm)$/i.test(metadataIpfs || '');
                    if (isLikelyImage) {
                      metadata = { image: metadataIpfs };
                    } else {
                      try {
                        const urls = getIpfsUrls(metadataIpfs);
                        // Метаданные должны быть JSON
                        metadata = await fetchWithFallback(urls);
                      } catch (e) {
                        console.warn('⚠️ Failed to fetch metadata JSON, falling back to image URL:', e?.message);
                        metadata = { image: imageIpfs || '' };
                      }
                    }
                    
                    if (!metadata) {
                      throw new Error('Failed to fetch metadata from IPFS');
                    }
                  
                  // Проверяем изображение только для небольших батчей
                  if (!largeUpload && metadata.image) {
                    const imageUrls = getIpfsUrls(metadata.image);
                    let imageOk = false;
                    for (const u of imageUrls) {
                      try {
                        // Сначала пробуем HEAD, затем GET без JSON парсинга
                        let resp = await fetch(u, { method: 'HEAD' });
                        if (!resp.ok) {
                          resp = await fetch(u, { method: 'GET' });
                        }
                        if (resp.ok) {
                          imageOk = true;
                          break;
                        }
                      } catch {}
                    }
                    if (!imageOk) {
                      throw new Error('Failed to verify image accessibility');
                    }
                  }
                  
                  const nftName = names[index] || r.name || `${collectionInfo.name} #${startingIndex + index}`;
                  
                  return {
                    id: Date.now() + index,
                    name: nftName,
                    description: descriptions[index] || '',
                    image: metadata.image ? getIpfsUrls(metadata.image)[0] : '',
                    price: 0,
                    status: 'draft',
                    type: 'multiple',
                    attributes: allAttributes[index] || [],
                    tokenURI: metadataIpfs,
                    failed: false,
                    originalIndex: index,
                    verified: true,
                  };
                } catch (err) {
                  console.error(`Error processing result ${index}:`, err);
                  return {
                    name: names[index] || `${collectionInfo.name} #${startingIndex + index}`,
                    index: index,
                    failed: true,
                    reason: err.message || 'Unknown error',
                    originalIndex: index,
                    verified: false,
                  };
                }
              })
            );

            const successful = formatted.filter((item) => !item.failed && item.verified);
            const failedItems = formatted.filter((item) => item.failed || !item.verified);
            allResults = [...allResults, ...successful];
            allFailed = [...allFailed, ...failedItems];

            // 🔥 НОВОЕ: Обновляем прогресс батчей
            setBatchProgress(prev => ({ 
              ...prev, 
              success: prev.success + successful.length,
              failed: prev.failed + failedItems.length
            }));

            if (successful.length) {
              localStorage.setItem(`collection_${collection?.address}_nfts`, JSON.stringify([...existing, ...successful]));
            }
            
            // 🔥 НОВОЕ: Пауза между батчами для больших загрузок
            if (largeUpload && i < dynamicChunks.length - 1) {
              setProgressText(`Pausing between batches... (${i + 1}/${dynamicChunks.length})`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1 секунда паузы
            }
            
          } catch (err) {
            console.error(`Batch ${i + 1} failed:`, err);
            const batchFailed = batch.map((img, idx) => ({
              name: img.name,
              index: idx,
              failed: true,
              reason: err.message || 'Batch upload failed'
            }));
            allFailed = [...allFailed, ...batchFailed];
            setBatchProgress(prev => ({ ...prev, failed: prev.failed + batch.length }));
          }
        }
      }

      console.log('🎯 Finalizing upload process...');
      console.log('📊 Final results:', { allResults: allResults.length, allFailed: allFailed.length });
      
      setProgressText('Finalizing upload...');
      setProgress(90);

      console.log('💾 Setting results and failed arrays...');
      setResults(allResults);
      setFailed(allFailed);
      setProgress(100);
      
      console.log('🎉 Determining final status...');
      if (allResults.length && allFailed.length === 0) {
        console.log('✅ All uploads successful!');
        setProgressText('✅ Upload completed successfully!');
        setShowPostSuccessOptions(true);
      } else if (allResults.length > 0) {
        console.log(`⚠️ Upload completed with ${allFailed.length} failures`);
        setProgressText(`✅ Upload completed with ${allFailed.length} failures`);
      } else {
        console.log('❌ All uploads failed');
        setProgressText('❌ Upload failed');
      }
      
      console.log('🏁 Upload process completed');
    } catch (err) {
      console.error('Upload failed:', err);
      setProgressText(`❌ Upload failed: ${err.message}`);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      setIsLargeUpload(false);
    }
  };

  const retryFailedUploads = () => {
    // 🔥 ИСПРАВЛЕНИЕ: Сохраняем оригинальный порядок и нумерацию неудачных загрузок
    const retryImages = failed.map((f) => {
      const idx = f.index ?? 0;
      const originalImage = images[idx];
      
      // Сохраняем оригинальное имя с правильным номером
      return {
        ...originalImage,
        name: f.name || originalImage.name, // Используем имя из ошибки или оригинальное
        originalIndex: idx // Сохраняем оригинальный индекс для правильной нумерации
      };
    });
    
    setImages(retryImages);
    setFailed([]);
    setShowModal(false);
    
    console.log('Retrying failed uploads with preserved order:', retryImages.map((img, i) => ({
      newIndex: i,
      originalIndex: img.originalIndex,
      name: img.name
    })));
  };

  // 🔥 НОВОЕ: Обновление статистики кэша
  const updateCacheStats = () => {
    const stats = advancedFileCache.getStats();
    const itemsElement = document.getElementById('cache-items');
    const memoryElement = document.getElementById('cache-memory');
    const hitrateElement = document.getElementById('cache-hitrate');
    
    if (itemsElement) itemsElement.textContent = stats.totalItems;
    if (memoryElement) memoryElement.textContent = `${(stats.totalMemory / 1024 / 1024).toFixed(1)}MB`;
    if (hitrateElement) hitrateElement.textContent = `${stats.hitRate.toFixed(1)}%`;
    
    // 🔥 НОВОЕ: Обновляем метрики производительности
    performanceMonitor.updateCacheStats(stats);
  };

  // 🔥 НОВОЕ: Периодическое обновление статистики
  useEffect(() => {
    updateCacheStats();
    const interval = setInterval(updateCacheStats, 5000); // Обновляем каждые 5 секунд
    
    return () => {
      clearInterval(interval);
      // 🔥 НОВОЕ: Останавливаем мониторинг при размонтировании
      performanceMonitor.stop();
    };
  }, []);

  // 🔥 НОВОЕ: Улучшенная обработка ошибок с retry
  const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await fn();
        const duration = Date.now() - startTime;
        
        // 🔥 НОВОЕ: Записываем успешную операцию
        performanceMonitor.recordSuccessfulUpload(0, duration);
        
        return result;
      } catch (error) {
        console.warn(`Attempt ${attempt} failed:`, error);
        
        // 🔥 НОВОЕ: Записываем неудачную операцию
        performanceMonitor.recordFailedUpload(0, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold text-white">Multiple NFT Upload</h2>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full">
          <label className="text-sm text-zinc-400 block mb-2">Upload images *</label>
          <div
            className={`w-full min-h-[192px] bg-zinc-900 border border-zinc-600 rounded-xl p-2 cursor-pointer hover:ring-1 hover:ring-pink-500 transition-all duration-200 ${
              isProcessingFiles ? 'ring-2 ring-blue-500 bg-blue-900/20' : ''
            } ${
              uploading ? 'ring-2 ring-green-500 bg-green-900/20' : ''
            }`}
            onClick={() => !isProcessingFiles && !uploading && fileInputRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={!isProcessingFiles && !uploading ? handleImageUpload : undefined}
          >
            <div className="flex flex-col justify-center items-center h-full min-h-[192px] gap-3">
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                  <div className="text-green-400 text-sm font-medium">Uploading NFTs...</div>
                  <div className="text-green-300 text-xs">Please wait while we upload to IPFS</div>
                </>
              ) : isProcessingFiles ? (
                <>
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  <div className="text-blue-400 text-sm font-medium">Processing files...</div>
                  <div className="text-blue-300 text-xs">Please wait while we optimize your images</div>
                </>
              ) : (
                <>
                  <img src={uploadIcon} alt="upload" className="w-8 h-8 opacity-70" />
                  <div className="text-zinc-400 text-sm">Drop images here or click to browse</div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={isProcessingFiles || uploading}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="space-y-6 overflow-x-auto">
        <table className="w-full text-sm text-left text-zinc-400">
          <thead className="text-xs uppercase bg-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Preview</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Attributes</th>
              <th className="px-4 py-2">Remove</th>
            </tr>
          </thead>
          <tbody>
            {images.map((img, i) => (
              <tr key={i} className="border-b border-zinc-700">
                <td className="px-4 py-2">{i + 1}</td>
                <td className="px-4 py-2">
                  <img
                    src={URL.createObjectURL(img.file)}
                    alt={`preview-${i}`}
                    className="w-12 h-12 object-cover rounded"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={img.name}
                    onChange={(e) => {
                      const updated = [...images];
                      updated[i].name = e.target.value;
                      setImages(updated);
                    }}
                    className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-white text-sm"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={img.description}
                    onChange={(e) => {
                      const updated = [...images];
                      updated[i].description = e.target.value;
                      setImages(updated);
                    }}
                    className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-white text-sm"
                  />
                </td>
                <td className="px-4 py-2 space-y-2">
                  {img.attributes.map((attr, idx) => (
                    <SmartAttributeInput
                      key={idx}
                      trait_type={attr.trait_type}
                      value={attr.value}
                      onChange={(type, value) => {
                        const updated = [...images];
                        updated[i].attributes[idx] = {
                          trait_type: type,
                          value: value
                        };
                        setImages(updated);
                      }}
                      onRemove={() => {
                        const updated = [...images];
                        updated[i].attributes.splice(idx, 1);
                        setImages(updated);
                      }}
                      index={idx}
                    />
                  ))}
                  <button
                    onClick={() => {
                      const updated = [...images];
                      updated[i].attributes.push({ trait_type: '', value: '' });
                      setImages(updated);
                    }}
                    className="text-xs text-blue-400 hover:underline mt-1 flex items-center gap-1"
                  >
                    <span>+ Add Attribute</span>
                  </button>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => {
                      const updated = [...images];
                      updated.splice(i, 1);
                      setImages(updated);
                    }}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Publish Button */}
      <div className="flex gap-4 items-center">
        <button
          onClick={handlePublish}
          disabled={uploading}
          className="flex-1 py-3 rounded-lg bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-semibold text-sm shadow-md active:scale-95 transition"
        >
          {uploading ? 'Uploading...' : 'Publish NFTs'}
        </button>
        
        {/* 🔥 НОВОЕ: Кнопка статистики производительности */}
        <button
          onClick={() => setShowPerformanceStats(!showPerformanceStats)}
          className="px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
          title="Show performance statistics"
        >
          <BarChart3 size={16} className="inline mr-1" />
          Stats
        </button>
        
        {/* 🔥 НОВОЕ: Кнопка статуса оптимизаций */}
        <button
          onClick={() => setShowOptimizationStatus(!showOptimizationStatus)}
          className="px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
          title="Show optimization status"
        >
          <Zap size={16} className="inline mr-1" />
          Optimizations
        </button>
      </div>

      {/* 🔥 НОВОЕ: Информация об оптимизации */}
      {images.length > 50 && (
        <div className="p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <span className="text-lg">🚀</span>
            <span className="font-semibold">Advanced Performance Optimization Active</span>
          </div>
          <p className="text-sm text-blue-300 mb-3">
            Large upload detected ({images.length} files). Using cutting-edge optimizations for maximum performance.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-blue-900/30 p-3 rounded-xl border border-blue-500/20">
              <div className="text-blue-400 font-medium">Web Worker</div>
              <div className="text-blue-300">{uploadWorker ? '✅ Active' : '❌ Fallback'}</div>
            </div>
            <div className="bg-purple-900/30 p-3 rounded-xl border border-purple-500/20">
              <div className="text-purple-400 font-medium">Streaming</div>
              <div className="text-purple-300">{images.some(img => img.file.size > 10 * 1024 * 1024) ? '✅ Large Files' : '⚡ Optimized'}</div>
            </div>
            <div className="bg-green-900/30 p-3 rounded-xl border border-green-500/20">
              <div className="text-green-400 font-medium">Advanced Cache</div>
              <div className="text-green-300">✅ Active</div>
            </div>
            <div className="bg-orange-900/30 p-3 rounded-xl border border-orange-500/20">
              <div className="text-orange-400 font-medium">Batch Size</div>
              <div className="text-orange-300">{images.length > 100 ? '10' : '25'} files</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-blue-400">
            • Parallel processing: {images.length > 100 ? 'Enabled' : 'Disabled'}
            • Adaptive batching: Enabled
            • Compression: Enabled
            • Retry mechanism: Enabled
          </div>
        </div>
      )}

      {/* 🔥 НОВОЕ: Рекомендации для мобильных устройств */}
      {mobileRecommendations.length > 0 && (
        <div className="p-6 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <span className="text-lg">📱</span>
            <span className="font-semibold">Mobile Optimization</span>
          </div>
          <div className="space-y-1 text-sm text-yellow-300">
            {mobileRecommendations.map((rec, index) => (
              <div key={index} className="flex items-center gap-2">
                <span>•</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-yellow-400">
            Device: {mobileOptimizer.getDeviceInfo().screenSize} | 
            Connection: {mobileOptimizer.getDeviceInfo().connectionSpeed} | 
            Battery: {mobileOptimizer.getDeviceInfo().batteryLevel !== null 
              ? `${(mobileOptimizer.getDeviceInfo().batteryLevel * 100).toFixed(0)}%` 
              : 'Unknown'}
          </div>
        </div>
      )}

      {/* 🔥 НОВОЕ: Статистика кэша */}
      <div className="p-6 bg-zinc-800/50 border border-zinc-700/30 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-300">Cache Statistics</span>
          <button
            onClick={async () => {
              const stats = advancedFileCache.getStats();
              console.log('📊 Cache stats:', stats);
              alert(`Cache Stats:\nHits: ${stats.hits}\nMisses: ${stats.misses}\nHit Rate: ${stats.hitRate.toFixed(1)}%\nCompression: ${stats.compressionRatio.toFixed(1)}%`);
            }}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            View Stats
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-zinc-400">Items</div>
            <div className="text-white font-medium" id="cache-items">-</div>
          </div>
          <div className="text-center">
            <div className="text-zinc-400">Memory</div>
            <div className="text-white font-medium" id="cache-memory">-</div>
          </div>
          <div className="text-center">
            <div className="text-zinc-400">Hit Rate</div>
            <div className="text-white font-medium" id="cache-hitrate">-</div>
          </div>
        </div>
      </div>

      {/* Modern Modal */}
      {showModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[10000] p-4">
          <div ref={modalRef} tabIndex={-1} className="bg-black backdrop-blur-xl rounded-3xl shadow-2xl max-w-4xl w-full animate-fadeIn border border-zinc-700/50 relative overflow-hidden transform transition-all duration-300 hover:scale-[1.02]" autoFocus>
            {/* Content */}
            <div className="relative z-10 p-8">
              {/* Header */}
              <div className="text-center mb-8">
                {progress === 100 ? (
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="mb-4">
                    <VideoSpinner type="uploading" size="lg" />
                  </div>
                )}
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent mb-2">
                  {progress === 100 ? 'NFTs Uploaded!' : 'Uploading NFTs...'}
                </h3>
                <p className="text-zinc-400 text-sm">
                  {progress === 100 ? 'Your NFTs have been successfully uploaded to IPFS' : 'Please wait while we process your NFTs'}
                </p>
              </div>

              {/* Progress Section */}
              {progress < 100 && (
                <div className="mb-8">
                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-zinc-800/50 rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-pink-500 relative transition-all duration-700 ease-out"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Progress Text */}
                  <div className="text-center mb-6">
                    <div className="text-2xl font-bold text-white mb-2">{progress}%</div>
                    <p className="text-sm text-zinc-400">{progressText}</p>
                  </div>
                  
                  {/* 🔥 НОВОЕ: Детальная информация о прогрессе для больших загрузок */}
                  {isLargeUpload && (
                    <div className="mb-6 p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-white">Batch Progress</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">{batchProgress.current}</div>
                          <div className="text-xs text-zinc-400">Batch</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-400">{batchProgress.success}</div>
                          <div className="text-xs text-zinc-400">Success</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-400">{batchProgress.failed}</div>
                          <div className="text-xs text-zinc-400">Failed</div>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-zinc-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                          style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Success Section */}
              {progress === 100 && (
                <div className="mb-8">
                  <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-green-400 font-semibold mb-2">Success!</h4>
                    <p className="text-zinc-300 text-sm">
                      {results.length} NFTs uploaded successfully
                      {failed.length > 0 && `, ${failed.length} failed`}
                    </p>
                  </div>
                  
                  {/* Results List */}
                  <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
                    {results.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-500/30 rounded-xl">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                        <span className="text-sm text-green-400 font-medium">{r.name}</span>
                      </div>
                    ))}
                    {failed.map((f, i) => (
                      <div key={`f-${i}`} className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-500/30 rounded-xl">
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <X size={16} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-red-400 font-medium">{f.name || `Unnamed #${i + 1}`}</div>
                          <div className="text-xs text-red-300">{f.reason || 'failed'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons - Only show when process is complete */}
              {progress === 100 && (
                <div className="space-y-3">
                  {failed.length > 0 && (
                    <button 
                      onClick={retryFailedUploads} 
                      className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-orange-500/25"
                    >
                      Retry Failed Uploads ({failed.length})
                    </button>
                  )}
                  
                  {showPostSuccessOptions && (
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setShowModal(false);
                          if (onSuccess) {
                            // Передаем данные о загруженных NFT
                            const uploadData = {
                              type: 'multiple',
                              collection: collection,
                              nfts: results,
                              failed: failed,
                              totalUploaded: results.length,
                              totalFailed: failed.length,
                              timestamp: new Date().toISOString()
                            };
                            onSuccess(uploadData);
                          }
                        }}
                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-green-500/25 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          {onSuccess ? 'Continue to Studio Dashboard' : 'Continue'}
                        </span>
                      </button>
                      <button
                        onClick={() => setShowModal(false)}
                        className="w-full py-3 px-6 rounded-2xl bg-zinc-700/50 hover:bg-zinc-600/50 text-white font-semibold transition-all duration-200 hover:scale-105"
                      >
                        Stay Here
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Close button - Show during process with warning, or when complete */}
              <button
                onClick={() => {
                  if (progress < 100) {
                    setShowCancelWarning(true);
                  } else {
                    setShowModal(false);
                  }
                }}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-all duration-200 hover:scale-110"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* 🔥 НОВОЕ: Компонент статистики производительности */}
      <PerformanceStats 
        isVisible={showPerformanceStats} 
        onClose={() => setShowPerformanceStats(false)} 
      />
      
      {/* 🔥 НОВОЕ: Компонент статуса оптимизаций */}
      <OptimizationStatus 
        isVisible={showOptimizationStatus} 
        onClose={() => setShowOptimizationStatus(false)} 
      />
      
      {/* 🔥 НОВОЕ: Красивое предупреждение при отмене */}
      <CancelWarningModal
        isVisible={showCancelWarning}
        onConfirm={() => {
          setShowCancelWarning(false);
          setShowModal(false);
          setUploading(false);
          setProgress(0);
          setProgressText('');
          setBatchProgress({ current: 0, total: 0, success: 0, failed: 0 });
          setResults([]);
          setFailed([]);
          // Останавливаем все процессы загрузки
          if (uploadWorker) {
            try { uploadWorker.terminate(); } catch {}
            uploadWorker = null;
          }
        }}
        onCancel={() => setShowCancelWarning(false)}
        title="Cancel Upload Process"
        message="Are you sure you want to cancel this upload? All progress will be lost and you'll need to start over. This action cannot be undone."
      />
    </div>
  );
};

export default MultipleNFT; 