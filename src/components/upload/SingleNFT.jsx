import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import uploadIcon from '../../assets/upload-icon.svg';
import { X, ChevronDown, Check } from 'lucide-react';
import VideoSpinner from '../VideoSpinner';
import CancelWarningModal from '../CancelWarningModal';
import { SafeOptimizer } from '../../utils/safeOptimizer';
import { performanceMonitor } from '../../utils/performanceMonitor';

const singleOptimizer = new SafeOptimizer();

// 🔥 НОВОЕ: Умное кэширование файлов (такое же как в MultipleNFT)
class FileCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
  }

  async getFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async get(file, extraKey = '') {
    const hash = await this.getFileHash(file);
    const compositeKey = `${hash}::${extraKey}`;
    return this.cache.get(compositeKey);
  }

  async set(file, result, extraKey = '') {
    const hash = await this.getFileHash(file);
    const compositeKey = `${hash}::${extraKey}`;

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(compositeKey, result);
  }

  clear() {
    this.cache.clear();
  }
}

// 🔥 НОВОЕ: Глобальный кэш для SingleNFT
const singleFileCache = new FileCache();

// 🔥 НОВОЕ: Система умных атрибутов (такая же как в MultipleNFT)
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

const SmartAttributeInput = ({ trait_type, value, description, onChange, onRemove, index }) => {
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
    <div className="flex flex-col gap-2 mt-2 p-3 border border-zinc-600 rounded-lg bg-zinc-800/50">
      {/* 🔥 НОВОЕ: Нумерация атрибута */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-400 font-medium">Attribute #{index + 1}</span>
        <button
          onClick={onRemove}
          className="px-2 py-1 text-red-400 hover:text-red-300 transition-colors text-xs"
        >
          Remove
        </button>
      </div>
      
      <div className="flex gap-3">
        <div className="w-1/2 relative">
          <input
            type="text"
            placeholder="Trait (e.g., Background)"
            value={trait_type}
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
            placeholder="Value"
            value={value}
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
      </div>
      
      <input
        type="text"
        placeholder="Description for this attribute (optional)"
        value={description}
        onChange={(e) => onChange('description', e.target.value)}
        className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-white text-sm"
      />
    </div>
  );
};

const BATCH_SIZE = 25;
const MAX_NFT_LIMIT = 500;

const SingleNFT = ({ collection, onSuccess }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [attributes, setAttributes] = useState([]);
  const [file, setFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔍 Loading collection info:', collection);
    if (collection && collection.name) {
      console.log('✅ Setting collection name:', collection.name);
      setName(collection.name);
    } else {
      console.log('❌ No collection or collection name provided');
      setName('');
    }
  }, [collection]);

  const handleAttributeChange = (index, field, value) => {
    const updated = [...attributes];
    updated[index][field] = value;
    console.log(`✏️ Updating attribute ${index + 1}:`, { field, value });
    console.log('📊 Updated attributes:', updated);
    setAttributes(updated);
  };

  const addAttribute = () => {
    const newAttribute = { trait_type: '', value: '', description: '' };
    const updatedAttributes = [...attributes, newAttribute];
    console.log('➕ Adding attribute:', newAttribute);
    console.log('📊 Total attributes now:', updatedAttributes.length);
    setAttributes(updatedAttributes);
  };

  const handleImageUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      // Показываем индикатор обработки файла
      setIsProcessingFiles(true);
      
      try {
        console.log('🔄 Processing uploaded file:', uploadedFile.name);
        
        // 🔥 НОВОЕ: Оптимизация изображения перед обработкой
        let optimizedFile = uploadedFile;
        
        // Проверяем, нужно ли оптимизировать изображение
        if (uploadedFile.type.startsWith('image/') && uploadedFile.size > 1024 * 1024) { // > 1MB
          console.log('🖼️ Optimizing image...');
          try {
            optimizedFile = await singleOptimizer.optimizeImage(uploadedFile, 0.8);
            console.log(`✅ Image optimized: ${uploadedFile.size} -> ${optimizedFile.size} bytes`);
          } catch (error) {
            console.warn('⚠️ Image optimization failed, using original:', error);
            optimizedFile = uploadedFile;
          }
        }
        
        // Небольшая задержка для визуального эффекта
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setFile(optimizedFile);
        console.log('✅ File processed successfully');
      } catch (error) {
        console.error('❌ Error processing file:', error);
      } finally {
        setIsProcessingFiles(false);
      }
    }
  };

  const getIpfsUrls = (url) => {
    if (!url) return [];
    if (url.startsWith('ipfs://')) {
      const cid = url.replace('ipfs://', '');
      return [
        `https://gateway.lighthouse.storage/ipfs/${cid}`,
      ];
    }
    return [url];
  };

  const fetchWithFallback = async (urls) => {
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) return await res.json();
      } catch {}
    }
    throw new Error('All IPFS gateways failed');
  };

  // 🔥 НОВОЕ: Функция для получения статистики оптимизаций
  const getOptimizationStats = () => {
    const optimizerStats = singleOptimizer.getOptimizationStats();
    const performanceStats = performanceMonitor.getMetrics();
    
    return {
      optimizer: optimizerStats,
      performance: performanceStats,
      cache: {
        hits: singleFileCache.cache.size,
        maxSize: singleFileCache.maxSize
      }
    };
  };

  const uploadToIPFSViaServer = async (file, name, quantity, attributes) => {
    console.log('📤 Uploading file to backend:', file.name, file.size, file.type);

    const getApiBase = () => {
      try {
        const isBrowser = typeof window !== 'undefined';
        const isLocal = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const isVite = isBrowser && String(window.location.port) === '5173';
        // Dev: use Vite proxy via relative paths
        if (isLocal && isVite) return '';
        // Non-dev: allow env override; avoid localStorage sticky config
        const envBase = import.meta?.env?.VITE_API_BASE;
        if (envBase && typeof envBase === 'string' && envBase.trim()) {
          const v = envBase.trim().replace(/\/$/, '');
          if (/^https?:\/\//i.test(v)) return v;
        }
      } catch {}
      return '';
    };

    const buildApiUrl = (path) => {
      const base = getApiBase();
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      if (!base) return normalizedPath;
      return `${base}${normalizedPath}`;
    };
    
    // Используем новый эндпоинт /api/pin-nft для единообразия
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('description', `A unique NFT from the ${name} collection`);
    formData.append('attributes', JSON.stringify(attributes));
    formData.append('quantity', quantity.toString());

    const response = await fetch(buildApiUrl('/api/pin-nft'), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ NFT upload failed:', errorData);
      throw new Error('Failed to upload NFT to backend server');
    }

    const result = await response.json();
    console.log('✅ NFT uploaded successfully:', result);

    // Возвращаем массив URL метаданных (совместимо с остальным кодом)
    const urls = Array.isArray(result.metadataUrls) ? result.metadataUrls : [];
    if (urls.length === 0) {
      throw new Error('Backend did not return metadataUrls');
    }
    return urls;
  };

  // 🔥 НОВОЕ: Оптимизированная загрузка с кэшированием для SingleNFT
  const uploadSingleWithCache = async (file, name, quantity, attributes) => {
    console.log('🔥 Using optimized upload with caching for SingleNFT...');
    
    // Запускаем мониторинг производительности
    performanceMonitor.start();
    const startTime = Date.now();
    
    try {
      // Ключ кэша должен учитывать не только файл, но и параметры загрузки
      const extraKey = JSON.stringify({ name, quantity, attributes });
      const cached = await singleFileCache.get(file, extraKey);
      if (cached) {
        console.log('✅ Cache hit for SingleNFT file (with params)');
        performanceMonitor.recordCacheHit();
        return cached;
      }
      
      performanceMonitor.recordCacheMiss();
      
      // Загружаем файл
      const result = await uploadToIPFSViaServer(file, name, quantity, attributes);
      
      // Сохраняем в кэш
      await singleFileCache.set(file, result, extraKey);
      
      // Записываем успешную загрузку
      const duration = Date.now() - startTime;
      performanceMonitor.recordSuccessfulUpload(file.size, duration);
      
      return result;
    } catch (error) {
      // Записываем неудачную загрузку
      const duration = Date.now() - startTime;
      performanceMonitor.recordFailedUpload(file.size, error);
      throw error;
    } finally {
      performanceMonitor.stop();
    }
  };

  const handlePublish = async () => {
    const qty = Math.max(1, parseInt(quantity || 1, 10));
    if (!file || !name || qty < 1 || isNaN(qty)) {
      alert('Please upload an image and fill in all required fields.');
      return;
    }
    if (qty > MAX_NFT_LIMIT) {
      alert(`You can upload a maximum of ${MAX_NFT_LIMIT} NFTs at once. Please reduce the quantity.`);
      return;
    }

    try {
      setShowModal(true);
      setUploading(true);
      setProgress(0);
      setProgressText('Preparing upload...');

      // Upload everything in one request - server will handle batching internally
      setProgress(20);
      setProgressText('Uploading image to IPFS...');
      
      const metadataUrls = await uploadSingleWithCache(file, name, qty, attributes);
      
      setProgress(60);
      setProgressText('Processing metadata...');
      
      // Небольшая задержка для визуального эффекта
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProgress(80);
      setProgressText('Saving NFTs locally...');

      const existing = JSON.parse(localStorage.getItem(`collection_${collection.address}_nfts`)) || [];
      console.log('📦 Existing NFTs in localStorage:', existing.length);
      
      // Get all existing numbers and sort them
      const existingNumbers = existing
        .map(nft => {
          const match = nft.name?.match(/#(\d+)$/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter(n => n !== null)
        .sort((a, b) => a - b);
      
      console.log('📊 Existing numbers:', existingNumbers);
      
      // Find the next available number (handle gaps)
      let startIndex = 1;
      if (existingNumbers.length > 0) {
        // Find the first gap or use max + 1
        for (let i = 1; i <= Math.max(...existingNumbers) + 1; i++) {
          if (!existingNumbers.includes(i)) {
            startIndex = i;
            break;
          }
        }
      }
      
      console.log('🎯 Starting NFT numbering from:', startIndex);
      console.log('📝 Processing', metadataUrls.length, 'metadata URLs');

      let firstImageUrl = '';
      let firstMetadataUrl = '';
      
      for (let i = 0; i < metadataUrls.length; i++) {
        const tokenURI = metadataUrls[i];
        let imageUrl = '';
        let metadata;

        // Обновляем прогресс для каждого NFT
        const nftProgress = 80 + Math.round((i / metadataUrls.length) * 15);
        setProgress(nftProgress);
        setProgressText(`Processing NFT ${i + 1}/${metadataUrls.length}...`);

        console.log(`🔄 Processing NFT ${i + 1}/${metadataUrls.length}:`, tokenURI);

        try {
          const urls = getIpfsUrls(tokenURI);
          console.log('🔗 IPFS URLs:', urls);
          
          metadata = await fetchWithFallback(urls);
          console.log('📋 Metadata fetched:', metadata.name);
          
          imageUrl = metadata.image ? getIpfsUrls(metadata.image)[0] : '';
          console.log('🖼️ Image URL:', imageUrl);
          
          // Сохраняем данные первого NFT для uploadData
          if (i === 0) {
            firstImageUrl = imageUrl;
            firstMetadataUrl = tokenURI;
          }
        } catch (err) {
          console.error('❌ Metadata fetch failed for NFT', i + 1, ':', err.message);
          // Continue anyway - we'll use the tokenURI as fallback
          imageUrl = tokenURI;
          
          // Сохраняем данные первого NFT для uploadData
          if (i === 0) {
            firstImageUrl = imageUrl;
            firstMetadataUrl = tokenURI;
          }
        }

        const draft = {
          id: Date.now() + i,
          name: `${name} #${startIndex + i}`,
          description: attributes.map(attr => attr.description).join(' '),
          tokenURI,
          image: imageUrl,
          quantity: 1,
          attributes: [...attributes],
          price: 0,
          status: 'draft',
          type: 'single',
        };
        
        console.log('💾 Saving NFT:', draft.name, 'with ID:', draft.id);
        existing.push(draft);
      }

      console.log('💾 Saving', existing.length, 'NFTs to localStorage');
      
      setProgress(95);
      setProgressText('Saving to local storage...');
      
      localStorage.setItem(`collection_${collection.address}_nfts`, JSON.stringify(existing));
      
      // Verify save
      const saved = JSON.parse(localStorage.getItem(`collection_${collection.address}_nfts`)) || [];
      console.log('✅ Verification: Saved', saved.length, 'NFTs to localStorage');

      setProgress(100);
      setProgressText('✅ Upload complete!');
      
      // 🔥 НОВОЕ: Логируем статистику оптимизаций
      const stats = getOptimizationStats();
      console.log('📊 SingleNFT Optimization Stats:', stats);
      
      if (onSuccess) {
        // Передаем данные о загруженном NFT
        const uploadData = {
          type: 'single',
          collection: collection,
          nft: {
            name: name,
            quantity: qty,
            attributes: attributes,
            imageUrl: firstImageUrl,
            metadataUrl: firstMetadataUrl
          },
          timestamp: new Date().toISOString(),
          optimizationStats: stats // 🔥 НОВОЕ: Добавляем статистику
        };
        onSuccess(uploadData);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload NFT metadata to IPFS.');
      setProgressText('❌ Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold text-white">Single NFT Upload</h2>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-shrink-0">
          <label className="text-sm text-zinc-400 block mb-2">Upload image *</label>
          <div
            className={`w-[160px] h-[144px] bg-zinc-900 border border-zinc-600 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden ${
              isProcessingFiles ? 'ring-2 ring-blue-500 bg-blue-900/20' : ''
            } ${
              uploading ? 'ring-2 ring-green-500 bg-green-900/20' : ''
            }`}
            onClick={() => !isProcessingFiles && !uploading && fileInputRef.current.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-green-400 text-xs">Uploading...</div>
              </div>
            ) : isProcessingFiles ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-blue-400 text-xs">Processing...</div>
              </div>
            ) : file ? (
              <img src={URL.createObjectURL(file)} alt="preview" className="object-cover w-full h-full" />
            ) : (
              <img src={uploadIcon} alt="upload" className="w-8 h-8 opacity-70" />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isProcessingFiles || uploading}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={collection ? "Collection name should appear here..." : "Enter NFT name"}
              className={`w-full p-3 rounded-xl bg-zinc-800 border text-white text-sm ${
                collection && !name ? 'border-yellow-500/50' : 'border-zinc-600'
              }`}
            />
            {collection && !name && (
              <p className="text-xs text-yellow-400 mt-1">
                ⚠️ Collection name not found. Please enter a name manually.
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={addAttribute}
              className="text-sm font-medium rounded-lg border border-purple-600 px-4 py-2 text-purple-400 hover:bg-purple-900 hover:text-white transition"
            >
              Add Attribute ({attributes.length})
            </button>

            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">Quantity</label>
              <input
                type="number"
                min={1}
                value={isNaN(quantity) ? '' : quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-20 p-2 rounded bg-zinc-900 border border-zinc-700 text-white text-sm"
              />
            </div>
          </div>

          {/* 🔥 НОВОЕ: Показываем количество атрибутов */}
          {attributes.length > 0 && (
            <div className="text-sm text-zinc-400 mb-2">
              Attributes: {attributes.length} {attributes.length === 1 ? 'attribute' : 'attributes'} added
            </div>
          )}

          {attributes.map((attr, idx) => (
            <SmartAttributeInput
              key={idx}
              trait_type={attr.trait_type}
              value={attr.value}
              description={attr.description}
              onChange={(field, value) => handleAttributeChange(idx, field, value)}
              onRemove={() => setAttributes(attributes.filter((_, i) => i !== idx))}
              index={idx}
            />
          ))}

          {/* 🔥 НОВОЕ: Показываем подсказку, если нет атрибутов */}
          {attributes.length === 0 && (
            <div className="text-center py-4 text-zinc-500 text-sm border border-dashed border-zinc-700 rounded-lg">
              No attributes added yet. Click "Add Attribute" to start adding traits like Background, Body, Eyes, etc.
            </div>
          )}

          <button
            onClick={handlePublish}
            disabled={uploading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-semibold text-sm shadow-md active:scale-95 transition"
          >
            {uploading ? 'Uploading...' : 'Publish NFT'}
          </button>
        </div>
      </div>

      {/* 🔥 НОВОЕ: Информация об оптимизации */}
      {quantity > 10 && (
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <span className="text-lg">🚀</span>
            <span className="font-semibold">Performance Optimization Active</span>
          </div>
          <p className="text-sm text-blue-300">
            Large quantity detected ({quantity} NFTs). Using smart caching for faster upload.
          </p>
          <div className="mt-2 text-xs text-blue-400">
            • Smart caching: Enabled
            • File processing: Optimized
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[9998] p-4">
                      <div className="bg-black backdrop-blur-xl rounded-3xl shadow-2xl max-w-4xl w-full animate-fadeIn border border-zinc-700/50 relative overflow-hidden transform transition-all duration-300 hover:scale-[1.02]" tabIndex={-1} autoFocus>
            
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
                  {progress === 100 ? 'NFT Uploaded!' : 'Uploading NFT...'}
                </h3>
                <p className="text-zinc-400 text-sm">
                  {progress === 100 ? 'Your NFT has been successfully uploaded to IPFS' : 'Please wait while we process your NFT'}
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
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{progress}%</div>
                    <p className="text-sm text-zinc-400">{progressText}</p>
                  </div>
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
                    <p className="text-zinc-300 text-sm">Your NFT is now live on IPFS</p>
                  </div>
                </div>
              )}

              {/* Action Buttons - Only show when process is complete */}
              {progress === 100 && (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      if (onSuccess) {
                        // Данные уже переданы в handlePublish, просто закрываем модальное окно
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
        </div>
      )}
      
      {/* 🔥 НОВОЕ: Красивое предупреждение при отмене */}
      <CancelWarningModal
        isVisible={showCancelWarning}
        onConfirm={() => {
          setShowCancelWarning(false);
          setShowModal(false);
        }}
        onCancel={() => setShowCancelWarning(false)}
        title="Cancel Upload Process"
        message="Are you sure you want to cancel this upload? All progress will be lost and you'll need to start over. This action cannot be undone."
      />
    </div>
  );
};

export default SingleNFT;