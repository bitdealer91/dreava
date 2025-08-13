import { useParams, useNavigate } from 'react-router-dom';
import { useReownWallet } from '../hooks/useReownWallet';
import { useEffect, useState, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import Countdown from 'react-countdown';
import { ethers } from 'ethers';
import { ExternalLink, CheckCircle, Info, Clock, X, Plus, Minus, Globe } from 'lucide-react';
import nftAbi from '../abi/SomniaNFT.json';
import SomniaFactoryABI from '../abi/SomniaFactory.json';
import somniaLogo from '../assets/somnia-logo.svg';
import { getIpfsUrls, fetchWithFallback } from '../utils/ipfs.js';
import { ensureSomniaNetwork, SOMNIA_CHAIN_ID_DEC } from '../utils/network';

import BackgroundCircles from '../components/BackgroundCircles';
import logo from '../assets/logo.svg';
import LazyImage from '../components/LazyImage';
import ImagePreloader from '../components/ImagePreloader';
import PerformanceMonitor from '../components/PerformanceMonitor';

// 🚀 Lazy loading для тяжелых компонентов
const VirtualList = lazy(() => import('../components/VirtualList'));

// Adaptive STT price formatter
  const formatPrice = (value) => {
    const num = Number(value);
    if (!isFinite(num)) return '0';
    if (num === 0) return '0';
    if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (num >= 0.1) return num.toLocaleString(undefined, { maximumFractionDigits: 3 });
    if (num >= 0.01) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

// Safe string conversion utility
  const safeToString = (value) => {
    if (value === null || value === undefined) return '0';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'bigint') return value.toString();
    try {
      return String(value);
    } catch {
      return '0';
    }
  };



const FACTORY_ADDRESS = '0xb7C9318Ac06AA59fE3cDD8342769361bB0Cc3d09';

// Global request queue to prevent RPC overload
let requestQueue = [];
let isProcessingQueue = false;

// Request queue processor
const processRequestQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const batch = requestQueue.splice(0, 5); // Process 5 requests at a time
    
    try {
      await Promise.allSettled(batch.map(request => request()));
    } catch (error) {
      console.error('Batch request error:', error);
    }
    
    // Rate limiting: 100ms delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  isProcessingQueue = false;
};

// Add request to queue
const queueRequest = (request) => {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    
    processRequestQueue();
  });
};

// Global cache for factory collections
const factoryCollectionsCache = new Map();
const FACTORY_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Optimized factory collection check
const checkIfFactoryCollectionOptimized = async (contractAddress) => {
  try {
    if (!contractAddress || !window.ethereum) return false;
    
    // Check cache first
    const cacheKey = `factory_collections_${Date.now()}`;
    const cached = factoryCollectionsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < FACTORY_CACHE_DURATION) {
      return cached.collections.includes(contractAddress.toLowerCase());
    }
    
    // Queue the RPC request
    const result = await queueRequest(async () => {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const factoryContract = new ethers.Contract(FACTORY_ADDRESS, SomniaFactoryABI, provider);
      const allCollections = await factoryContract.getAllCollections();
      
      // Cache the result
      factoryCollectionsCache.set(cacheKey, {
        collections: allCollections.map(addr => addr.toLowerCase()),
        timestamp: Date.now()
      });
      
      return allCollections.map(addr => addr.toLowerCase()).includes(contractAddress.toLowerCase());
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error checking factory collection:', error);
    return false;
  }
};

// Global image cache to reduce IPFS requests
const imageCache = new Map();
const IMAGE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Optimized image loading with server-side caching
const getNFTImageUrlOptimized = async (nft, contractAddress) => {
  try {
    const cacheKey = `${contractAddress}_${nft.id}_image`;
    const cached = imageCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < IMAGE_CACHE_DURATION) {
      return cached.url;
    }
    
    // Check if this is a factory collection
    const isFactoryNFT = await checkIfFactoryCollectionOptimized(contractAddress);
    
    // For factory NFTs, try to get metadata from contract
    if (isFactoryNFT && contractAddress && nft.id) {
      try {
        const result = await queueRequest(async () => {
          const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
          const contract = new ethers.Contract(contractAddress, [
            "function tokenURI(uint256 tokenId) view returns (string)",
            "function ownerOf(uint256 tokenId) view returns (address)"
          ], provider);
          
          const tokenId = typeof nft.id === 'string' ? parseInt(nft.id, 10) : nft.id;
          
          // Check if token exists first
          try {
            const owner = await contract.ownerOf(tokenId);
            if (owner === ethers.ZeroAddress) {
              console.log(`Token ${tokenId} doesn't exist yet`);
              return null;
            }
          } catch (error) {
            console.log(`Token ${tokenId} doesn't exist yet:`, error.message);
            return null;
          }
          
          const tokenURI = await contract.tokenURI(tokenId);
          
          if (tokenURI) {
            // Convert IPFS URL
            let metadataUrl = tokenURI;
            if (tokenURI.startsWith('ipfs://')) {
              metadataUrl = tokenURI.replace('ipfs://', 'https://gateway.lighthouse.storage/ipfs/');
            }
            
            // Get token metadata with timeout
            const response = await Promise.race([
              fetch(metadataUrl),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Metadata fetch timeout')), 2000)
              )
            ]);
            
            if (response.ok) {
              const tokenMetadata = await response.json();
              
              if (tokenMetadata.image) {
                let imageUrl = tokenMetadata.image;
                
                // Convert IPFS URL for image
                if (imageUrl.startsWith('ipfs://')) {
                  imageUrl = imageUrl.replace('ipfs://', 'https://gateway.lighthouse.storage/ipfs/');
                }
                
                // Cache the result
                imageCache.set(cacheKey, {
                  url: imageUrl,
                  timestamp: Date.now()
                });
                
                return imageUrl;
              }
            }
          }
          
          return null;
        });
        
        if (result) return result;
      } catch (error) {
        console.error('Error fetching factory NFT image:', error);
      }
    }
    
    // Fallback to direct image or metadata
    let imageUrl = nft.image || nft.image_url || nft.media_url || '';
    
    if (!imageUrl && nft.metadata?.image) {
      imageUrl = nft.metadata.image;
    }
    
    if (imageUrl) {
      // Convert IPFS URL
      if (imageUrl.startsWith('ipfs://')) {
        if (isFactoryNFT) {
          imageUrl = imageUrl.replace('ipfs://', 'https://gateway.lighthouse.storage/ipfs/');
        } else {
          imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
      }
      
      // Cache the result
      imageCache.set(cacheKey, {
        url: imageUrl,
        timestamp: Date.now()
      });
      
      return imageUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting NFT image URL:', error);
    return null;
  }
};

const MintPage = () => {
  const { address } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', txHash: '' });
  const { address: userAddress, isConnected } = useReownWallet();
  
  // Функция для записи контракта через ethers.js
  const writeContractAsync = async (contractConfig) => {
    if (!window.ethereum) {
      throw new Error('Wallet not connected');
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const contract = new ethers.Contract(
      contractConfig.address,
      contractConfig.abi,
      signer
    );
    
    // Подготавливаем параметры транзакции
    const txParams = {
      ...(contractConfig.value > 0 ? { value: contractConfig.value } : {}),
      ...(contractConfig.gasSettings || {})
    };
    
    // Вызываем функцию контракта
    const tx = await contract[contractConfig.functionName](...contractConfig.args, txParams);
    return tx.hash;
  };
  
  const [activePhase, setActivePhase] = useState(null);
  const [minted, setMinted] = useState(0);
  const [wlProof, setWlProof] = useState([]);
  const [wlStatus, setWlStatus] = useState({ isWhitelisted: false });
  const [wlLoading, setWlLoading] = useState(false);
  const [contractPhase, setContractPhase] = useState(null);
  const [contractPrice, setContractPrice] = useState(null);
  const [userMintedCount, setUserMintedCount] = useState(0);
  const [isSoldOut, setIsSoldOut] = useState(false);
  
  // 🚀 Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  
  // 📱 Responsive breakpoints для оптимизации
  const isMobile = useMemo(() => window.innerWidth < 768, []);
  const isTablet = useMemo(() => window.innerWidth >= 768 && window.innerWidth < 1024, []);
  
  // Modal state
  const [showMintModal, setShowMintModal] = useState(false);
  const [mintQuantity, setMintQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState('0');
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  
  // Collection preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [collectionNFTs, setCollectionNFTs] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Social links state
  const [socialLinks, setSocialLinks] = useState({
    website: '',
    twitter: '',
    discord: ''
  });
  
  // Cache for collection previews
  const [previewCache, setPreviewCache] = useState(new Map());
  
  // 🖼️ Оптимизация: предзагрузка критических изображений
  const criticalImages = useMemo(() => {
    if (!collection) return [];
    
    const images = [];
    if (collection.cover) images.push(collection.cover);
    if (collection.bannerImage) images.push(collection.bannerImage);
    if (collection.banner) images.push(collection.banner);
    
    return [...new Set(images)]; // Убираем дубликаты
  }, [collection]);
  
  // 🖼️ Дополнительные изображения для NFT preview (отдельный хук)
  const nftPreviewImages = useMemo(() => {
    if (!collectionNFTs || collectionNFTs.length === 0) return [];
    
    return collectionNFTs.slice(0, 6)
      .map(nft => nft.image)
      .filter(Boolean);
  }, [collectionNFTs]);
  
  // 🚀 Мемоизированные вычисления для производительности
  const progress = useMemo(() => 
    collection && collection.totalSupply ? Math.min(100, Math.round((minted / collection.totalSupply) * 100)) : 0, 
    [collection, minted]
  );
  
  const phaseEntries = useMemo(() => 
    collection && collection.phases ? Object.entries(collection.phases) : [], 
    [collection, collection?.phases]
  );

  // 🔥 ИСПРАВЛЕНИЕ: Определяем отображаемую цену
    const displayPrice = useMemo(() => 
    safeToString(contractPrice || (activePhase && activePhase[1] ? activePhase[1].price : '0')),
    [contractPrice, activePhase]
  );
  
  const formattedDisplayPrice = useMemo(() => 
    formatPrice(displayPrice), 
    [displayPrice]
  );

  // Load social links for the collection
  const loadSocialLinks = async () => {
    if (!collection?.address) return;
    
    try {
      // Сначала пытаемся загрузить из метаданных контракта
      let socialLinksFromMetadata = {};
      
      if (collection.external_link) {
        socialLinksFromMetadata.website = collection.external_link;
      }
      
      // Если в метаданных есть социальные ссылки, используем их
      if (collection.metadata) {
        if (collection.metadata.website) {
          socialLinksFromMetadata.website = collection.metadata.website;
        }
        if (collection.metadata.twitter) {
          socialLinksFromMetadata.twitter = collection.metadata.twitter;
        }
        if (collection.metadata.discord) {
          socialLinksFromMetadata.discord = collection.metadata.discord;
        }
        // Также проверяем старые поля для совместимости
        if (collection.metadata.external_link && !socialLinksFromMetadata.website) {
          socialLinksFromMetadata.website = collection.metadata.external_link;
        }
      }
      
      // Затем загружаем из localStorage как fallback
      const savedSocial = JSON.parse(localStorage.getItem(`collection_${collection.address}_social`) || '{}');
      
      // Объединяем: метаданные имеют приоритет, но localStorage может дополнить
      const combinedSocial = {
        ...savedSocial,
        ...socialLinksFromMetadata
      };
      
      console.log('🔍 Loading social links:', {
        fromMetadata: socialLinksFromMetadata,
        fromLocalStorage: savedSocial,
        combined: combinedSocial
      });
      
      setSocialLinks(combinedSocial);
    } catch (error) {
      console.error('Error loading social links:', error);
    }
  };

  // Ensure social links load after collection is fetched
  useEffect(() => {
    if (collection?.address) {
      loadSocialLinks();
    }
  }, [collection?.address]);

  // Load collection NFTs for preview with caching
  const loadCollectionNFTs = async () => {
    if (!collection) return;
    
    // Check cache first
    const cacheKey = `${collection.address}_preview`;
    const cached = previewCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes cache
      console.log('📦 Using cached preview data');
      setCollectionNFTs(cached.data);
      return;
    }
    
    try {
      setPreviewLoading(true);
      console.log('🔄 Loading collection preview...');

      // 🚀 СТРАТЕГИЯ 1: Мгновенное отображение placeholder'ов
      const createPlaceholderNFTs = (count = 20) => {
        const placeholders = [];
        for (let i = 0; i < count; i++) {
          placeholders.push({
            id: i,
            tokenId: i,
            name: `${collection.name} #${i + 1}`,
            description: `NFT #${i + 1} from ${collection.name}`,
            image: collection.cover, // Используем cover как placeholder
            isPlaceholder: true
          });
        }
        return placeholders;
      };

      // Показываем placeholder'ы мгновенно
      const placeholderNFTs = createPlaceholderNFTs(20);
      setCollectionNFTs(placeholderNFTs);
      console.log('🚀 Showing placeholder NFTs instantly');

      // 🚀 СТРАТЕГИЯ 2: Попытка загрузить реальные изображения в фоне
      try {
        if (collection.metadata && collection.metadata.nfts) {
          console.log('📦 Found NFTs in metadata, loading images in background...');
          
          const loadImageWithTimeout = async (nft, index) => {
            try {
              // Проверяем кэш
              const imageCacheKey = `nft_image_${nft.tokenId || nft.id || index}`;
              const cached = previewCache.get(imageCacheKey);
              if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
                console.log('📦 Using cached NFT image:', imageCacheKey);
                return {
                  ...nft,
                  id: nft.tokenId || nft.id || index,
                  image: cached.data,
                  name: nft.name || `${collection.name} #${nft.tokenId || nft.id || index + 1}`,
                  description: nft.description || `NFT #${nft.tokenId || nft.id || index + 1} from ${collection.name}`,
                  isPlaceholder: false
                };
              }
              
              // Быстрая загрузка с коротким timeout
              const imageUrl = await Promise.race([
                getNFTImageUrlOptimized(nft, collection.address),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Image load timeout')), 1500) // Уменьшили до 1.5 секунд
                )
              ]);
              
              // Кэшируем успешно загруженное изображение
              if (imageUrl) {
                setPreviewCache(prev => new Map(prev.set(imageCacheKey, {
                  data: imageUrl,
                  timestamp: Date.now()
                })));
              }
              
              return {
                ...nft,
                id: nft.tokenId || nft.id || index,
                image: imageUrl || collection.cover,
                name: nft.name || `${collection.name} #${nft.tokenId || nft.id || index + 1}`,
                description: nft.description || `NFT #${nft.tokenId || nft.id || index + 1} from ${collection.name}`,
                isPlaceholder: false
              };
            } catch (error) {
              console.warn(`Failed to load image for NFT ${index}:`, error);
              return {
                ...nft,
                id: nft.tokenId || nft.id || index,
                image: collection.cover,
                name: nft.name || `${collection.name} #${nft.tokenId || nft.id || index + 1}`,
                description: nft.description || `NFT #${nft.tokenId || nft.id || index + 1} from ${collection.name}`,
                isPlaceholder: false
              };
            }
          };
          
          // Загружаем все изображения параллельно, но с ограничением
          const totalNFTs = collection.metadata.nfts.slice(0, 20);
          const imageLoadPromises = totalNFTs.map((nft, index) => 
            loadImageWithTimeout(nft, index).catch(error => {
              console.warn(`Failed to load NFT ${index}:`, error);
              return {
                ...nft,
                id: nft.tokenId || nft.id || index,
                image: collection.cover,
                name: nft.name || `${collection.name} #${nft.tokenId || nft.id || index + 1}`,
                description: nft.description || `NFT #${nft.tokenId || nft.id || index + 1} from ${collection.name}`,
                isPlaceholder: false
              };
            })
          );
          
          // Ждем загрузки всех изображений
          const loadedNFTs = await Promise.allSettled(imageLoadPromises);
          const successfulNFTs = loadedNFTs
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
          
          // Обновляем список с реальными изображениями
          setCollectionNFTs(successfulNFTs);
          console.log('✅ All NFT images loaded');
          
          // Кэшируем результат
          setPreviewCache(prev => new Map(prev.set(cacheKey, {
            data: successfulNFTs,
            timestamp: Date.now()
          })));
          
          // Убираем индикатор загрузки
          setPreviewLoading(false);
          return;
        }
      } catch (error) {
        console.warn('⚠️ Failed to load real images, keeping placeholders:', error);
      }

      // 🚀 СТРАТЕГИЯ 3: Fallback - используем placeholder'ы если все остальное не сработало
      console.log('ℹ️ Using placeholder NFTs as fallback');
      setCollectionNFTs(placeholderNFTs);
      setPreviewCache(prev => new Map(prev.set(cacheKey, {
        data: placeholderNFTs,
        timestamp: Date.now()
      })));
      
      // Убираем индикатор загрузки
      setPreviewLoading(false);
      return; // Добавляем return чтобы избежать дальнейшего выполнения

      // 3) Try to fetch from contract via tokenURI for minted tokens (slowest)
      try {
        console.log('📦 Fetching NFTs from contract (tokenURI)...');
        const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
        const contract = new ethers.Contract(collection.address, nftAbi, provider);
        
        const totalSupply = await Promise.race([
          contract.totalSupply(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Contract timeout')), 5000)
          )
        ]);
        
        const maxToFetch = Math.min(Number(totalSupply), 20);
        
        if (maxToFetch > 0) {
          const contractNFTs = [];
          const batchSize = 5;
          for (let batch = 0; batch < Math.ceil(maxToFetch / batchSize); batch++) {
            const batchStart = batch * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, maxToFetch);
            
            const batchPromises = [];
            for (let i = batchStart; i < batchEnd; i++) {
              batchPromises.push(
                (async () => {
                  try {
                    const tokenURI = await Promise.race([
                      contract.tokenURI(i),
                      new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('TokenURI timeout')), 3000)
                      )
                    ]);
                    
                    if (tokenURI) {
                      const metadataCandidates = getIpfsUrls(tokenURI);
                      const metadata = await fetchWithFallback(metadataCandidates);
                      
                      let imageUrl = metadata?.image;
                      if (typeof imageUrl === 'string' && imageUrl.startsWith('ipfs://')) {
                        imageUrl = getIpfsUrls(imageUrl)[0] || imageUrl;
                      }
                      
                      return {
                        id: i,
                        tokenId: i,
                        name: metadata?.name || `${collection.name} #${i}`,
                        description: metadata?.description || `NFT #${i} from ${collection.name}`,
                        image: imageUrl || collection.cover,
                        metadata
                      };
                    }
                  } catch (error) {
                    console.warn(`Error fetching token ${i}:`, error);
                  }
                  
                  return {
                    id: i,
                    tokenId: i,
                    name: `${collection.name} #${i}`,
                    description: `NFT #${i} from ${collection.name}`,
                    image: collection.cover
                  };
                })()
              );
            }
            
            const batchResults = await Promise.allSettled(batchPromises);
            const successfulBatchNFTs = batchResults
              .filter(result => result.status === 'fulfilled')
              .map(result => result.value);
            
            contractNFTs.push(...successfulBatchNFTs);
            setCollectionNFTs([...contractNFTs]);
            
            if (batch < Math.ceil(maxToFetch / batchSize) - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          setPreviewCache(prev => new Map(prev.set(cacheKey, {
            data: contractNFTs,
            timestamp: Date.now()
          })));
          return;
        }
      } catch (contractError) {
        console.error('Error fetching NFTs from contract:', contractError);
      }
      
      // 4) Fallback: создаем новые placeholder'ы если старые недоступны
      console.log('📦 Creating new placeholder NFTs as final fallback');
      const finalPlaceholderNFTs = createPlaceholderNFTs(20);
      setCollectionNFTs(finalPlaceholderNFTs);
      setPreviewCache(prev => new Map(prev.set(cacheKey, {
        data: finalPlaceholderNFTs,
        timestamp: Date.now()
      })));
      
    } catch (error) {
      console.error('Error loading collection NFTs:', error);
      setCollectionNFTs([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Clear preview cache
  const clearPreviewCache = () => {
    setPreviewCache(new Map());
    setCollectionNFTs([]);
    loadCollectionNFTs();
  };

  // Clear all caches (for high traffic scenarios)
  const clearAllCaches = () => {
    setPreviewCache(new Map());
    imageCache.clear();
    factoryCollectionsCache.clear();
    requestQueue = [];
    setCollectionNFTs([]);
    console.log('🧹 All caches cleared');
  };

  // Performance monitoring
  const logPerformanceMetrics = () => {
    console.log('📊 Performance Metrics:', {
      previewCacheSize: previewCache.size,
      imageCacheSize: imageCache.size,
      factoryCacheSize: factoryCollectionsCache.size,
      requestQueueLength: requestQueue.length,
      isProcessingQueue
    });
  };

  // Auto-clear caches when memory usage is high
  useEffect(() => {
    const checkMemoryUsage = () => {
      if (imageCache.size > 1000 || factoryCollectionsCache.size > 100) {
        console.warn('⚠️ High cache usage detected, clearing old entries...');
        clearAllCaches();
      }
    };
    
    const interval = setInterval(checkMemoryUsage, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Load NFTs when collection is loaded
  useEffect(() => {
    if (collection) {
      loadCollectionNFTs();
    }
  }, [collection]);

  // Auto-close wallet connect modal when wallet is connected
  useEffect(() => {
    if (isConnected && showWalletConnect) {
      setShowWalletConnect(false);
    }
  }, [isConnected, showWalletConnect]);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const showToast = (message, txHash = '') => {
    setToast({ visible: true, message, txHash });
  };

  // Calculate total price when quantity changes
  useEffect(() => {
    if (activePhase && activePhase[1]) {
      const price = contractPrice || activePhase[1].price || '0';
      const total = (parseFloat(price) * mintQuantity).toFixed(4);
      setTotalPrice(total);
    }
  }, [mintQuantity, activePhase, contractPrice]);

  // Open mint modal
  const openMintModal = () => {
    if (!isConnected) {
      setShowWalletConnect(true);
      return;
    }
    
    // Check if user can mint
    if (!activePhase) {
      showToast('❌ No active phase at the moment.');
      return;
    }
    
    if (!activePhase[1] || (!activePhase[1].isPublic && !wlStatus?.isWhitelisted)) {
      showToast('❌ You are not whitelisted for this phase.');
      return;
    }
    
    if (isSoldOut) {
      showToast('❌ Collection is sold out!');
      return;
    }
    
    if (walletLimit > 0 && userMintedCount >= walletLimit) {
      showToast('❌ You have reached the wallet limit for this phase.');
      return;
    }
    
    setMintQuantity(1);
    setShowMintModal(true);
  };

  // Close mint modal
  const closeMintModal = () => {
    setShowMintModal(false);
    setMintQuantity(1);
    setShowWalletConnect(false);
  };

  // Handle quantity change
  const handleQuantityChange = (newQuantity) => {
    if (!activePhase || !activePhase[1]) return;
    
    const maxPerWallet = activePhase[1].maxPerWallet || 0;
    const available = maxPerWallet > 0 ? maxPerWallet - userMintedCount : 999;
    const maxQuantity = Math.min(available, 10); // Max 10 per transaction
    
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setMintQuantity(newQuantity);
    }
  };

  // Get max quantity for current phase
  const getMaxQuantity = () => {
    if (!activePhase || !activePhase[1]) return 1;
    
    const maxPerWallet = activePhase[1].maxPerWallet || 0;
    const available = maxPerWallet > 0 ? maxPerWallet - userMintedCount : 999;
    return Math.min(available, 10); // Max 10 per transaction
  };

  // Handle mint from modal
  const handleMintFromModal = async () => {
    if (!activePhase || !isConnected) {
      return;
    }
    
    try {
      // Ensure correct network before mint (wagmi-first)
      const sw = await (async () => {
        try { return await switchNetwork?.(50312); } catch { return { success: false }; }
      })();
      if (!sw?.success) await ensureSomniaNetwork();
    } catch (e) {
      showToast('❌ Please switch to Somnia Testnet to mint.');
      return;
    }

    try {
      setIsMinting(true);
      
      const result = await handleMintWithQuantity(mintQuantity);
      
      if (result.success) {
        showToast('✅ Mint successful!', result.txHash);
        closeMintModal();
      } else {
        showToast(`❌ Mint failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Mint failed with exception:', error);
      showToast('❌ Mint failed. Please try again.');
    } finally {
      setIsMinting(false);
    }
  };

  // Enhanced mint function with quantity support
  const handleMintWithQuantity = async (quantity = 1) => {
    if (!isConnected) {
      return { success: false, error: 'Please connect your wallet first!' };
    }
    try {
      const sw = await (async () => {
        try { return await switchNetwork?.(50312); } catch { return { success: false }; }
      })();
      if (!sw?.success) await ensureSomniaNetwork();
    } catch (e) {
      return { success: false, error: 'Please switch to Somnia Testnet to mint.' };
    }
    
    if (!collection) return { success: false, error: 'No collection loaded.' };
    if (!activePhase || !activePhase[1]) return { success: false, error: 'No active phase.' };
    
    // Check whitelist only for private phases
    const [idx, phase] = activePhase;
    if (!phase || (!phase.isPublic && !wlStatus?.isWhitelisted)) {
      return { success: false, error: 'You are not whitelisted for this phase.' };
    }
    
    // Check if sold out
    if (isSoldOut) {
      return { success: false, error: 'Collection is sold out!' };
    }
    
    // Check wallet limit
    if (userMintedCount + quantity > phase.maxPerWallet && phase.maxPerWallet > 0) {
      return { success: false, error: 'You would exceed the wallet limit for this phase!' };
    }
    
    // Get price
    let value = undefined;
    let priceSource = '';
    
    // Priority 1: Price from contract (if available)
    if (contractPrice && !isNaN(contractPrice)) {
      value = ethers.parseEther((parseFloat(contractPrice) * quantity).toString());
      priceSource = 'contract';
      console.log('💰 Using price from contract:', contractPrice, 'STT');
    }
    // Priority 2: Price from UI
    else if (phase.price && !isNaN(phase.price)) {
      value = ethers.parseEther((parseFloat(phase.price) * quantity).toString());
      priceSource = 'ui';
      console.log('💰 Using price from UI:', phase.price, 'STT');
    }
    // Priority 3: Free mint
    else {
      value = ethers.parseEther('0');
      priceSource = 'free';
      console.log('💰 Free mint detected');
    }
    
    if (value === undefined) {
      return { success: false, error: 'Could not determine mint price. Please refresh the page.' };
    }
    
    // Determine proof
    let finalProof = wlProof || [];
    
    // For public phase use empty proof
    if (phase.isPublic) {
      finalProof = [];
    }
    


    try {
      const txHash = await writeContractAsync({
        chainId: 50312,
        address: collection.address,
        abi: nftAbi,
        functionName: 'mint',
        args: [quantity, finalProof],
        ...(value > 0 ? { value } : {}),
      });
      
      console.log('✅ Mint transaction sent:', txHash);
      
      // Wait for transaction confirmation
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      
      // Add retry logic for transaction confirmation
      let receipt = null;
      let retries = 3;
      
      while (retries > 0 && !receipt) {
        try {
          receipt = await provider.waitForTransaction(txHash, 1, 30000); // 1 confirmation, 30s timeout
          break;
        } catch (confirmError) {
          console.warn(`Transaction confirmation attempt ${4 - retries} failed:`, confirmError);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            // If all retries failed, try to get receipt without waiting
            try {
              receipt = await provider.getTransactionReceipt(txHash);
            } catch (finalError) {
              throw confirmError; // Throw original error
            }
          }
        }
      }
      
      if (receipt.status === 1) {
        showToast('✅ Mint successful!', txHash);
        setMinted((prev) => prev + quantity);
        setUserMintedCount((prev) => prev + quantity);
        // 🎯 Record quest action for NFT mint (from collection page)
        try {
          if (userAddress && collection?.address) {
            await fetch('/api/quest/record-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                walletAddress: userAddress,
                actionType: 'nft_minted',
                data: {
                  collectionAddress: collection.address,
                  collectionName: collection.name,
                  quantity
                }
              })
            });
          }
        } catch (questErr) {
          console.warn('⚠️ Failed to record quest mint action:', questErr);
        }
        
        // Recheck sold out status and wallet limits immediately
        setTimeout(async () => {
          await Promise.all([
            checkSoldOut(),
            checkWalletLimit()
          ]);
        }, 2000); // Wait 2 seconds for blockchain to update
        
        return { success: true, txHash };
      } else {
        return { success: false, error: 'Mint transaction failed on-chain' };
      }
    } catch (err) {
      console.error('❌ Mint Error:', err);
      console.error('❌ Error details:', {
        message: err.message,
        code: err.code,
        data: err.data,
        stack: err.stack
      });
      
      // Analyze error
      if (err.message && err.message.includes('Not whitelisted')) {
        return { success: false, error: 'Not whitelisted for this phase' };
      } else if (err.message && err.message.includes('Wrong price')) {
        return { success: false, error: 'Wrong price. Please refresh the page.' };
      } else if (err.message && err.message.includes('Phase not active')) {
        return { success: false, error: 'Phase is not active' };
      } else if (err.message && err.message.includes('insufficient funds')) {
        return { success: false, error: 'Insufficient funds for minting' };
      } else if (err.message && err.message.includes('user rejected')) {
        return { success: false, error: 'Transaction was rejected by user' };
      } else {
        return { success: false, error: `Mint failed: ${err.message}` };
      }
    }
  };

  // Check if user has reached wallet limit
  const checkWalletLimit = async () => {
    if (!userAddress || !collection || !activePhase || !activePhase[1]) return;
    
    try {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const contract = new ethers.Contract(collection.address, nftAbi, provider);
      
      // Get user's minted count for current phase
      const [idx, phase] = activePhase;
      
      console.log('🔍 Checking wallet limit for:', {
        user: userAddress,
        collection: collection.address,
        phase: idx,
        phaseName: phase.name
      });
      
      // Strategy 1: Try to get phase data from contract
      let contractPhaseData = null;
      let walletLimit = 0;
      
      try {
        // Check if phases function exists
        if (typeof contract.phases === 'function') {
          contractPhaseData = await contract.phases(idx);
          walletLimit = Number(contractPhaseData.maxPerWallet);
          console.log('✅ Got phase data from contract:', {
            start: Number(contractPhaseData.start),
            end: Number(contractPhaseData.end),
            price: ethers.formatEther(contractPhaseData.price),
            maxPerWallet: walletLimit,
            merkleRoot: contractPhaseData.merkleRoot
          });
        } else {
          console.log('ℹ️ phases function not available in contract');
        }
      } catch (error) {
        console.warn('⚠️ Could not get phase data from contract:', error.message);
      }
      
      // Strategy 2: Fallback to localStorage if contract data unavailable
      if (!contractPhaseData || walletLimit === 0) {
        console.log('🔄 Falling back to localStorage data');
        const phases = JSON.parse(localStorage.getItem(`phases_${collection.address}`) || '{}');
        const phaseEntries = Object.entries(phases);
        const currentPhaseData = phaseEntries[idx];
        if (currentPhaseData) {
          walletLimit = Number(currentPhaseData[1].limit) || 0;
          console.log('📦 Using localStorage limit:', walletLimit);
        }
      }
      
      console.log('📊 Final wallet limit:', walletLimit);
      
      // Check if limit is 0 (unlimited)
      if (walletLimit === 0) {
        console.log('ℹ️ Wallet limit is 0, treating as unlimited');
        setUserMintedCount(0);
        return;
      }
      
      // Strategy 3: Try mintedPerWallet function (correct name from contract)
      try {
        if (typeof contract.mintedPerWallet === 'function') {
          const userMinted = await contract.mintedPerWallet(userAddress, idx);
          console.log('✅ mintedPerWallet function exists, result:', Number(userMinted));
          setUserMintedCount(Number(userMinted));
          return;
        } else {
          console.log('ℹ️ mintedPerWallet function not available in contract');
        }
      } catch (mintedPerWalletError) {
        console.warn('⚠️ mintedPerWallet function failed:', mintedPerWalletError);
      }
      
      // Strategy 4: Use balanceOf as fallback (since we can't track per phase)
      try {
        const balance = await contract.balanceOf(userAddress);
        console.log('🔄 Using balanceOf as fallback:', Number(balance));
        
        // Note: balanceOf returns total NFTs owned, not per-phase count
        // This is less accurate than mintedPerWallet but works as fallback
        if (Number(balance) > walletLimit && walletLimit > 0) {
          console.warn('🚨 WARNING: User balance exceeds wallet limit! This suggests:');
          console.warn('   - User minted in multiple phases');
          console.warn('   - Or limit was changed after mint');
          console.warn('   - Or we are checking wrong phase');
        }
        
        setUserMintedCount(Number(balance));
        return;
      } catch (balanceError) {
        console.warn('⚠️ balanceOf function also failed:', balanceError);
      }
      
      // Strategy 5: If all else fails, assume no limit
      console.log('ℹ️ Could not determine wallet limit, assuming unlimited');
      setUserMintedCount(0);
      
    } catch (error) {
      console.error('❌ Could not check wallet limit:', error);
      setUserMintedCount(0);
    }
  };

  // Check if collection is sold out
  const checkSoldOut = async () => {
    if (!collection) return;
    
    try {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const contract = new ethers.Contract(collection.address, nftAbi, provider);
      
      const totalSupply = await contract.totalSupply();
      const maxSupply = await contract.maxSupply();
      
      const soldOut = Number(totalSupply) >= Number(maxSupply);
      setIsSoldOut(soldOut);
      
      console.log('🔍 Sold out check:', {
        totalSupply: Number(totalSupply),
        maxSupply: Number(maxSupply),
        soldOut
      });
    } catch (error) {
      console.warn('⚠️ Could not check sold out status:', error);
      setIsSoldOut(false);
    }
  };

  // Analyze contract functions
  const analyzeContract = async () => {
    if (!collection) return;
    
    try {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const contract = new ethers.Contract(collection.address, nftAbi, provider);
      
      console.log('🔍 Analyzing contract functions for:', collection.address);
      
      // Check available functions
      const functions = [
        'mintedPerWallet',
        'balanceOf', 
        'totalSupply',
        'maxSupply',
        'currentPhase',
        'phases'
      ];
      
      for (const funcName of functions) {
        try {
                  if (funcName === 'mintedPerWallet' && activePhase && activePhase[1]) {
          const [idx] = activePhase;
          await contract.mintedPerWallet(userAddress, idx);
          console.log(`✅ ${funcName} function exists`);
        } else if (funcName === 'balanceOf' && userAddress) {
          await contract.balanceOf(userAddress);
          console.log(`✅ ${funcName} function exists`);
        } else if (funcName === 'totalSupply') {
          await contract.totalSupply();
          console.log(`✅ ${funcName} function exists`);
        } else if (funcName === 'maxSupply') {
          await contract.maxSupply();
          console.log(`✅ ${funcName} function exists`);
        } else if (funcName === 'currentPhase') {
          await contract.currentPhase();
          console.log(`✅ ${funcName} function exists`);
        } else if (funcName === 'phases' && activePhase && activePhase[1]) {
          const [idx] = activePhase;
          await contract.phases(idx);
          console.log(`✅ ${funcName} function exists`);
        }
        } catch (error) {
          console.log(`❌ ${funcName} function not available:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Failed to analyze contract:', error);
    }
  };

  // Analyze contract on load
  useEffect(() => {
    if (collection && userAddress) {
      analyzeContract();
    }
  }, [collection, userAddress]);

  // Check phase history and limits
  const checkPhaseHistory = async () => {
    if (!collection) return;
    
    try {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const contract = new ethers.Contract(collection.address, nftAbi, provider);
      
      console.log('🔍 Checking phase history for:', collection.address);
      
      // Get current phase from contract
      const currentPhase = await contract.currentPhase();
      console.log('📊 Current phase from contract:', Number(currentPhase));
      
      // Check all phases
      const allPhases = collection.phases ? Object.entries(collection.phases) : [];
      console.log('📊 All phases from metadata:', allPhases.length);
      
      for (let i = 0; i < allPhases.length; i++) {
        try {
          const [phaseName, phaseData] = allPhases[i];
          console.log(`📊 Phase ${i}: ${phaseName}`, {
            start: new Date(Number(phaseData.start) * 1000).toLocaleString(),
            end: new Date(Number(phaseData.end) * 1000).toLocaleString(),
            maxPerWallet: phaseData.maxPerWallet,
            limit: phaseData.limit, // Check if limit field exists
            price: phaseData.price,
            isPublic: phaseData.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000'
          });
          
          // Check if user minted in this phase
          try {
            const userMintedInPhase = await contract.mintedPerWallet(userAddress, i);
            console.log(`   User minted in phase ${i}:`, Number(userMintedInPhase));
          } catch (error) {
            console.log(`   Could not check user minted in phase ${i}:`, error.message);
          }
          
          // Check phase data from contract
          try {
            const contractPhaseData = await contract.phases(i);
            console.log(`   Contract phase ${i} data:`, {
              start: Number(contractPhaseData.start),
              end: Number(contractPhaseData.end),
              price: ethers.formatEther(contractPhaseData.price),
              maxPerWallet: Number(contractPhaseData.maxPerWallet),
              merkleRoot: contractPhaseData.merkleRoot,
              isPublic: contractPhaseData.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000'
            });
          } catch (error) {
            console.log(`   Could not get contract phase ${i} data:`, error.message);
          }
        } catch (error) {
          console.log(`   Could not get phase ${i} data:`, error.message);
        }
      }
      
      // Check if user has NFTs from any phase
      try {
        const userBalance = await contract.balanceOf(userAddress);
        console.log('📊 Total user balance:', Number(userBalance));
        
        // Try to get token IDs owned by user
        try {
          const tokenCount = await contract.balanceOf(userAddress);
          console.log('📊 User owns', Number(tokenCount), 'tokens');
          
          // Try to get first few token IDs
          for (let i = 0; i < Math.min(Number(tokenCount), 5); i++) {
            try {
              const tokenId = await contract.tokenOfOwnerByIndex(userAddress, i);
              console.log(`   Token ${i}: ID ${Number(tokenId)}`);
            } catch (error) {
              console.log(`   Could not get token ${i}:`, error.message);
            }
          }
        } catch (error) {
          console.log('Could not get token details:', error.message);
        }
      } catch (error) {
        console.log('Could not get user balance:', error.message);
      }
      
    } catch (error) {
      console.error('❌ Failed to check phase history:', error);
    }
  };

  // Check phase history on load
  useEffect(() => {
    if (collection && userAddress) {
      checkPhaseHistory();
    }
  }, [collection, userAddress]);

  // Загрузка коллекции
  useEffect(() => {
    const loadCollection = async () => {
      try {
        console.log('🔍 Loading collection for address:', address);
        
        if (!address) {
          console.error('❌ No address provided');
          setLoading(false);
          return;
        }
        
        // const provider = new ethers.BrowserProvider(window.ethereum);
        const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
        
        // 🔥 ПРОВЕРКА: Существует ли контракт по адресу
        try {
          const code = await provider.getCode(address);
          if (code === '0x') {
            throw new Error('No contract deployed at this address');
          }
          console.log('✅ Contract exists at address');
        } catch (codeErr) {
          console.error('❌ Contract check failed:', codeErr);
          throw new Error('Invalid contract address');
        }
        
        const contract = new ethers.Contract(address, nftAbi, provider);
        
        console.log('🔍 Contract initialized, fetching data...');
        
        // 🔥 ПРОВЕРКА: Есть ли функция name()
        let name = 'Unknown Collection';
        try {
          name = await contract.name();
          console.log('🔍 Collection name:', name);
        } catch (nameErr) {
          console.warn('⚠️ Failed to get name from contract:', nameErr);
          // Продолжаем с дефолтным именем
        }
        
        // 🔥 ПРОВЕРКА: Есть ли функция contractURI()
        let metadataUri = '';
        try {
          metadataUri = await contract.contractURI();
          console.log('🔍 Metadata URI:', metadataUri);
        } catch (uriErr) {
          console.warn('⚠️ Failed to get contractURI:', uriErr);
          // Продолжаем без метаданных
        }
        
        let metadata = {};
        if (metadataUri && metadataUri !== '') {
          try {
            const urls = getIpfsUrls(metadataUri);
            console.log('🔍 IPFS URLs:', urls);
            metadata = await fetchWithFallback(urls);
            console.log('🔍 Fetched metadata:', metadata);
          } catch (metadataErr) {
            console.error('❌ Failed to fetch metadata:', metadataErr);
            metadata = {};
          }
        } else {
          console.log('⚠️ No metadata URI found');
        }
        
        // 🔥 ПРОВЕРКА: Есть ли функция maxSupply()
        let maxSupply = 0;
        try {
          maxSupply = await contract.maxSupply();
          console.log('🔍 Max supply:', maxSupply);
        } catch (supplyErr) {
          console.warn('⚠️ Failed to get maxSupply:', supplyErr);
          // Продолжаем с дефолтным значением
        }
        
        // Баннер берём строго из on-chain metadata
        const bannerPosition = 'center center';
        const bannerFit = 'cover';
        
        const collectionData = {
          address,
          name,
          cover: metadata.image ? getIpfsUrls(metadata.image)[0] : logo,
          description: metadata.description || 'No description provided.',
          phases: metadata.phases || {},
          totalSupply: Number(maxSupply),
          minted: metadata.minted || 0,
          banner: metadata.banner ? getIpfsUrls(metadata.banner)[0] : null,
          bannerPosition,
          bannerFit,
          external_link: metadata.external_link || '',
          metadata: metadata, // Сохраняем полные метаданные
        };
        
        // Если пользователь загружал кастомный баннер в студии, переопределяем баннер из метаданных
        try {
          const savedBanner = localStorage.getItem(`collection_${address}_banner`);
          if (savedBanner) {
            collectionData.banner = savedBanner;
          }
        } catch {}
        
        // Debug banner logs removed
        setCollection(collectionData);
      } catch (err) {
        console.error('❌ Failed to load collection:', err);
        console.error('❌ Error details:', {
          message: err.message,
          code: err.code,
          data: err.data
        });
        
        // 🔥 FALLBACK: Попробуем загрузить из localStorage
        try {
          // Debug banner logs removed
          const stored = JSON.parse(localStorage.getItem('dreava_collections')) || [];
          const storedCollection = stored.find((c) => c.address === address);
          
          if (storedCollection) {
            // Debug banner logs removed
            // Загружаем баннер из правильного места в localStorage
            const bannerUrl = localStorage.getItem(`collection_${address}_banner`);
            const bannerPosition = localStorage.getItem(`collection_${address}_banner_position`) || 'center center';
            const bannerFit = localStorage.getItem(`collection_${address}_banner_fit`) || 'cover';
            // Debug banner logs removed
            
                          const collectionData = {
                address,
                name: storedCollection.name || 'Unknown Collection',
                cover: storedCollection.cover || logo,
                description: storedCollection.description || 'No description provided.',
                phases: storedCollection.phases || {},
                totalSupply: storedCollection.totalSupply || 0,
                minted: storedCollection.minted || 0,
                // Баннер берём только из явной настройки пользователя, не из cover
                banner: bannerUrl || null,
                bannerPosition,
                bannerFit,
                external_link: storedCollection.external_link || '',
              };
            
            // Debug banner logs removed
            setCollection(collectionData);
          } else {
            console.error('❌ Collection not found in localStorage either');
          }
        } catch (localStorageErr) {
          console.error('❌ Failed to load from localStorage:', localStorageErr);
        }
      } finally {
        setLoading(false);
      }
    };
    loadCollection();
    loadSocialLinks();
  }, [address]);

  // Получение данных из контракта
  useEffect(() => {
    if (!collection) return;
    
    const getContractData = async () => {
      try {
        // const provider = new ethers.BrowserProvider(window.ethereum);
        const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
        const contract = new ethers.Contract(address, nftAbi, provider);
        
        // 🔥 ПРОВЕРКА: Есть ли функция currentPhase()
        let currentPhase = 0;
        try {
          currentPhase = await contract.currentPhase();
          setContractPhase(Number(currentPhase));
          console.log('🔍 Current phase from contract:', currentPhase);
        } catch (phaseErr) {
          console.warn('⚠️ Failed to get currentPhase:', phaseErr);
          setContractPhase(0);
        }
        
        // 🔥 ПРОВЕРКА: Есть ли функция phases() и currentPhase > 0
        if (currentPhase > 0) {
          try {
            const phaseInfo = await contract.phases(currentPhase - 1);
            const price = ethers.formatEther(phaseInfo.price);
            setContractPrice(price);
            console.log('🔍 Price from contract:', price);
          } catch (priceErr) {
            console.warn('⚠️ Failed to get phase price:', priceErr);
            setContractPrice(null);
          }
        } else {
          setContractPrice(null);
        }
        
        // 🔥 ПРОВЕРКА: Есть ли функция totalSupply()
        try {
          const totalMinted = await contract.totalSupply();
          setMinted(Number(totalMinted));
          console.log('🔍 Total minted from contract:', totalMinted);
        } catch (supplyErr) {
          console.warn('⚠️ Failed to get totalSupply:', supplyErr);
          // Оставляем текущее значение minted
        }
      } catch (err) {
        console.error('❌ Failed to get contract data:', err);
      }
    };
    
    getContractData();
    const interval = setInterval(getContractData, 30000);
    return () => clearInterval(interval);
  }, [collection, address]);

  // Check wallet limit and sold out status
  useEffect(() => {
    if (!collection || !userAddress) return;
    
    const checkStatus = async () => {
      await Promise.all([
        checkWalletLimit(),
        checkSoldOut()
      ]);
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [collection, userAddress, activePhase]);

  // Определение активной фазы
  useEffect(() => {
    if (!collection) return;
    
    const updateActivePhase = () => {
      const now = Math.floor(Date.now() / 1000);
      const entries = collection.phases ? Object.entries(collection.phases) : [];
      let found = null;
      let foundIdx = null;
      
      entries.forEach(([key, phase], idx) => {
        const startTime = Number(phase.start);
        const endTime = Number(phase.end);
        if (startTime <= now && now <= endTime) {
          found = phase;
          foundIdx = idx;
        }
      });
      
      if (found) {
        const isPublic = found.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000' || found.isPublic;
        const phaseData = {
          name: found.name || `Phase ${foundIdx}`,
          start: Number(found.start),
          end: Number(found.end),
          price: found.price,
          maxPerWallet: (contractPhaseLimits && contractPhaseLimits[foundIdx]) || found.maxPerWallet || 1,
          merkleRoot: found.merkleRoot,
          isPublic: isPublic
        };
        

        
        setActivePhase([foundIdx, phaseData]);
      } else {
        setActivePhase(null);
      }
    };
    
    updateActivePhase();
    const interval = setInterval(updateActivePhase, 30000);
    return () => clearInterval(interval);
  }, [collection]);

  // Проверка whitelist
  useEffect(() => {
    if (!activePhase || !userAddress || !collection) {
      setWlStatus({ isWhitelisted: false });
      setWlProof([]);
      return;
    }
    
    const [idx, phase] = activePhase;
    
    // Для публичной фазы всегда разрешаем
    if (phase.isPublic) {
      setWlStatus({ isWhitelisted: true });
      setWlProof([]);
      return;
    }
    
    // Для whitelist фазы проверяем на сервере
    const fetchProof = async () => {
      try {
        setWlLoading(true);
        
        let phaseEntries = collection.phases ? Object.entries(collection.phases) : [];
        const phaseKey = phaseEntries[idx] ? phaseEntries[idx][0] : 'Whitelist';
        
        console.log('🔍 Checking whitelist for:', {
          address: userAddress,
          collection: collection.address,
          phase: phaseKey
        });
        
        // First check if whitelist exists
        const checkResponse = await fetch(`/api/whitelist/check?collection=${collection.address}&phase=${phaseKey}`);
        
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          console.log('🔍 Whitelist check result:', checkData);
          
          if (checkData.exists) {
            // Whitelist exists, now check if user is whitelisted
            const response = await fetch('/api/whitelist/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                address: userAddress,
                collection: collection.address,
                phase: phaseKey
              })
            });
            
            console.log('🔍 Whitelist verify response status:', response.status);
            
            if (response.ok) {
              const data = await response.json();
              console.log('🔍 Whitelist verify response data:', data);
              
              if (data.isWhitelisted && data.proof && Array.isArray(data.proof)) {
                console.log('✅ User is whitelisted, proof:', data.proof);
                setWlProof(data.proof);
                setWlStatus({ isWhitelisted: true });
              } else {
                console.log('❌ User is not whitelisted or no proof');
                setWlProof([]);
                setWlStatus({ isWhitelisted: false });
              }
            } else {
              console.log('❌ Whitelist verify request failed');
              setWlProof([]);
              setWlStatus({ isWhitelisted: false });
            }
          } else {
            console.log('❌ Whitelist does not exist for this phase');
            setWlProof([]);
            setWlStatus({ isWhitelisted: false });
          }
        } else {
          console.log('❌ Whitelist check request failed');
          setWlProof([]);
          setWlStatus({ isWhitelisted: false });
        }
      } catch (error) {
        console.error('Error fetching whitelist proof:', error);
        setWlProof([]);
        setWlStatus({ isWhitelisted: false });
      } finally {
        setWlLoading(false);
      }
    };
    
    fetchProof();
  }, [activePhase?.[0], activePhase?.[1]?.name, userAddress, collection?.address]);

  // Helper function to get wallet limit from contract or localStorage
  const getWalletLimit = async () => {
    if (!collection || !activePhase || !activePhase[1]) return 0;
    
    try {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const contract = new ethers.Contract(collection.address, nftAbi, provider);
      const [idx] = activePhase;
      
      // Try contract first
      try {
        if (typeof contract.phases === 'function') {
          const contractPhaseData = await contract.phases(idx);
          const walletLimit = Number(contractPhaseData.maxPerWallet);
          if (walletLimit > 0) {
            return walletLimit;
          }
        }
      } catch (error) {
        console.warn('Could not get phase data from contract:', error.message);
      }
      
      // Fallback to localStorage
      const phases = JSON.parse(localStorage.getItem(`phases_${collection.address}`) || '{}');
      const phaseEntries = Object.entries(phases);
      const currentPhaseData = phaseEntries[idx];
      if (currentPhaseData) {
        return Number(currentPhaseData[1].limit) || 0;
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting wallet limit:', error);
      return 0;
    }
  };

  // State for wallet limit
  const [walletLimit, setWalletLimit] = useState(0);
  const [contractPhaseLimits, setContractPhaseLimits] = useState({});

  // Update wallet limit when active phase changes
  useEffect(() => {
    if (collection && activePhase && activePhase[1]) {
      getWalletLimit().then(setWalletLimit);
    }
  }, [collection, activePhase]);

  // Fetch wallet limits from contract for all phases
  const fetchContractPhaseLimits = async () => {
    if (!collection) return;
    
    try {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const contract = new ethers.Contract(collection.address, nftAbi, provider);
      
      const limits = {};
      const phaseEntries = collection.phases ? Object.entries(collection.phases) : [];
      
      for (let i = 0; i < phaseEntries.length; i++) {
        try {
          if (typeof contract.phases === 'function') {
            const phaseData = await contract.phases(i);
            const maxPerWallet = Number(phaseData.maxPerWallet);
            limits[i] = maxPerWallet;
            console.log(`Phase ${i} wallet limit from contract:`, maxPerWallet);
          }
        } catch (error) {
          console.warn(`Could not get phase ${i} limit from contract:`, error.message);
          // Fallback to localStorage
          const phases = JSON.parse(localStorage.getItem(`phases_${collection.address}`) || '{}');
          const phaseEntries = Object.entries(phases);
          if (phaseEntries[i]) {
            limits[i] = Number(phaseEntries[i][1].limit) || 0;
          }
        }
      }
      
      setContractPhaseLimits(limits);
    } catch (error) {
      console.error('Error fetching contract phase limits:', error);
    }
  };

  // Fetch contract limits on load
  useEffect(() => {
    if (collection) {
      fetchContractPhaseLimits();
    }
  }, [collection]);

  // Update active phase when contract limits are loaded
  useEffect(() => {
    if (collection && contractPhaseLimits && Object.keys(contractPhaseLimits).length > 0) {
      const updateActivePhase = () => {
        const now = Math.floor(Date.now() / 1000);
        const entries = collection.phases ? Object.entries(collection.phases) : [];
        let found = null;
        let foundIdx = null;
        
        entries.forEach(([key, phase], idx) => {
          const startTime = Number(phase.start);
          const endTime = Number(phase.end);
          if (startTime <= now && now <= endTime) {
            found = phase;
            foundIdx = idx;
          }
        });
        
        if (found) {
          const isPublic = found.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000' || found.isPublic;
          const phaseData = {
            name: found.name || `Phase ${foundIdx}`,
            start: Number(found.start),
            end: Number(found.end),
            price: found.price,
            maxPerWallet: contractPhaseLimits[foundIdx] || found.maxPerWallet || 1,
            merkleRoot: found.merkleRoot,
            isPublic: isPublic
          };
          

          
          setActivePhase([foundIdx, phaseData]);
        }
      };
      
      updateActivePhase();
    }
  }, [collection, contractPhaseLimits]);

  // Sort phases in fixed order: WL → FCFS → Public
  const getSortedPhases = () => {
    if (!collection || !collection.phases) return [];
    
    const phaseEntries = Object.entries(collection.phases);
    const now = Math.floor(Date.now() / 1000);
    
    // Define phase order and their keys
    const phaseOrder = [
      { key: 'Whitelist', priority: 1 },
      { key: 'FCFS', priority: 2 },
      { key: 'Public', priority: 3 }
    ];
    
    // Create a map of phase data with their original indices
    const phaseMap = new Map();
    phaseEntries.forEach(([phaseName, phaseData], idx) => {
      phaseMap.set(phaseName, { ...phaseData, originalIndex: idx, name: phaseName });
    });
    
    // Sort phases by priority and filter only existing ones
    const sortedPhases = phaseOrder
      .filter(phase => phaseMap.has(phase.key))
      .map(phase => {
        const phaseData = phaseMap.get(phase.key);
        const startTime = Number(phaseData.start);
        const endTime = Number(phaseData.end);
        const isActive = startTime <= now && now <= endTime;
        const isPublic = phaseData.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000' || phaseData.isPublic;
        
        return {
          ...phaseData,
          name: phase.key,
          originalIndex: phaseData.originalIndex,
          isActive,
          isPublic,
          priority: phase.priority
        };
      })
      .sort((a, b) => a.priority - b.priority);
    
    return sortedPhases;
  };

  // Функция mint
  const handleMint = async () => {
    if (!isConnected) {
      showToast('❌ Please connect your wallet first!');
      return;
    }
    try {
      const sw = await (async () => {
        try { return await switchNetwork?.(50312); } catch { return { success: false }; }
      })();
      if (!sw?.success) await ensureSomniaNetwork();
    } catch (e) {
      showToast('❌ Please switch to Somnia Testnet to mint.');
      return;
    }
    
    if (!collection) return alert('No collection loaded.');
    if (!activePhase || !activePhase[1]) return alert('No active phase.');
    
    // Check whitelist only for private phases
    const [idx, phase] = activePhase;
    if (!phase || (!phase.isPublic && !wlStatus?.isWhitelisted)) {
      return alert('You are not whitelisted for this phase.');
    }
    
    // Check if sold out
    if (isSoldOut) {
      showToast('❌ Collection is sold out!');
      return;
    }
    
    // Check wallet limit
    if (userMintedCount >= phase.maxPerWallet) {
      showToast('❌ You have reached the wallet limit for this phase!');
      return;
    }
    
    const amount = 1;
    
    // 🔥 ИСПРАВЛЕНИЕ: Получаем цену с приоритетом контракта
    let value = undefined;
    let priceSource = '';
    
    // Приоритет 1: Цена из контракта (если доступна)
    if (contractPrice && !isNaN(contractPrice)) {
      value = ethers.parseEther(String(contractPrice));
      priceSource = 'contract';
      console.log('💰 Using price from contract:', contractPrice, 'STT');
    }
    // Приоритет 2: Цена из UI
    else if (phase.price && !isNaN(phase.price)) {
      value = ethers.parseEther(String(phase.price));
      priceSource = 'ui';
      console.log('💰 Using price from UI:', phase.price, 'STT');
    }
    // Приоритет 3: Бесплатный mint
    else {
      value = ethers.parseEther('0');
      priceSource = 'free';
      console.log('💰 Free mint detected');
    }
    
    if (value === undefined) {
      showToast('❌ Could not determine mint price. Please refresh the page.');
      return;
    }
    
    // Определяем proof
    let finalProof = wlProof || [];
    
    // Для публичной фазы используем пустой proof
    if (phase.isPublic) {
      finalProof = [];
    }
    
    console.log('🚀 Mint Attempt:', {
      phase: phase.name,
      isPublic: phase.isPublic,
      price: priceSource === 'contract' ? contractPrice : phase.price,
      value: value.toString(),
      proof: finalProof,
      priceSource
    });

    try {
      const txHash = await writeContractAsync({
        chainId: 50312,
        address: collection.address,
        abi: nftAbi,
        functionName: 'mint',
        args: [amount, finalProof],
        ...(value > 0 ? { value } : {}),
      });
      
      console.log('✅ Mint transaction sent:', txHash);
      
      // Ждем подтверждения транзакции
      // const provider = new ethers.BrowserProvider(window.ethereum);
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      
      // Add retry logic for transaction confirmation
      let receipt = null;
      let retries = 3;
      
      while (retries > 0 && !receipt) {
        try {
          receipt = await provider.waitForTransaction(txHash, 1, 30000); // 1 confirmation, 30s timeout
          break;
        } catch (confirmError) {
          console.warn(`Transaction confirmation attempt ${4 - retries} failed:`, confirmError);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            // If all retries failed, try to get receipt without waiting
            try {
              receipt = await provider.getTransactionReceipt(txHash);
            } catch (finalError) {
              throw confirmError; // Throw original error
            }
          }
        }
      }
      
      if (receipt.status === 1) {
        showToast('✅ Mint successful!', txHash);
        setMinted((prev) => prev + 1);
        setUserMintedCount((prev) => prev + 1);
        // 🎯 Record quest action for NFT mint (single)
        try {
          if (userAddress && collection?.address) {
            await fetch('/api/quest/record-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                walletAddress: userAddress,
                actionType: 'nft_minted',
                data: {
                  collectionAddress: collection.address,
                  collectionName: collection.name,
                  quantity: 1
                }
              })
            });
          }
        } catch (questErr) {
          console.warn('⚠️ Failed to record quest mint action:', questErr);
        }
        
        // Recheck sold out status and wallet limits immediately
        setTimeout(async () => {
          await Promise.all([
            checkSoldOut(),
            checkWalletLimit()
          ]);
        }, 2000); // Wait 2 seconds for blockchain to update
      } else {
        showToast('❌ Mint transaction failed on-chain');
      }
    } catch (err) {
      console.error('❌ Mint Error:', err);
      
      // Анализируем ошибку
      if (err.message && err.message.includes('Not whitelisted')) {
        showToast('❌ Not whitelisted for this phase');
      } else if (err.message && err.message.includes('Wrong price')) {
        showToast('❌ Wrong price. Please refresh the page.');
      } else if (err.message && err.message.includes('Phase not active')) {
        showToast('❌ Phase is not active');
      } else {
        showToast('❌ Mint failed. Please try again.');
      }
    }
  };

  // Check localStorage phase data
  const checkLocalStoragePhases = () => {
    if (!collection) return;
    
    try {
      console.log('🔍 Checking localStorage phase data for:', collection.address);
      
      // Get phases from localStorage
      const phases = JSON.parse(localStorage.getItem(`phases_${collection.address}`) || '{}');
      console.log('📊 Phases from localStorage:', phases);
      
      // Check each phase
      Object.entries(phases).forEach(([phaseName, phaseData]) => {
        console.log(`📊 Phase "${phaseName}" from localStorage:`, {
          start: phaseData.start,
          end: phaseData.end,
          price: phaseData.price,
          limit: phaseData.limit,
          maxPerWallet: phaseData.maxPerWallet,
          allocated: phaseData.allocated,
          active: phaseData.active
        });
        
        // Check if limit is missing or 0
        if (!phaseData.limit || phaseData.limit === 0) {
          console.warn(`⚠️ WARNING: Phase "${phaseName}" has no limit or limit is 0!`);
          console.warn(`   This means unlimited minting per wallet.`);
        }
      });
      
      // Check collection metadata
      const collectionData = JSON.parse(localStorage.getItem(`collection_${collection.address}`) || '{}');
      console.log('📊 Collection data from localStorage:', collectionData);
      
    } catch (error) {
      console.error('❌ Failed to check localStorage phases:', error);
    }
  };

  // Check localStorage on load
  useEffect(() => {
    if (collection) {
      checkLocalStoragePhases();
    }
  }, [collection]);

  // Update meta tags for social media previews
  useEffect(() => {
    if (collection && collection.name) {
      // Update document title
      document.title = `${collection.name} - Dreava Launchpad`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', collection.description || `Check out ${collection.name} NFT collection on Dreava Launchpad`);
      }
      
      // Update Open Graph tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', `${collection.name} - Dreava Launchpad`);
      }
      
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', collection.description || `Check out ${collection.name} NFT collection on Dreava Launchpad`);
      }
      
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && collection.banner) {
        ogImage.setAttribute('content', collection.banner);
        console.log('🔍 Set OG image to:', collection.banner);
      }
      
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) {
        ogUrl.setAttribute('content', window.location.href);
      }
      
      // Update Twitter tags
      const twitterTitle = document.querySelector('meta[property="twitter:title"]');
      if (twitterTitle) {
        twitterTitle.setAttribute('content', `${collection.name} - Dreava Launchpad`);
      }
      
      const twitterDescription = document.querySelector('meta[property="twitter:description"]');
      if (twitterDescription) {
        twitterDescription.setAttribute('content', collection.description || `Check out ${collection.name} NFT collection on Dreava Launchpad`);
      }
      
      const twitterImage = document.querySelector('meta[property="twitter:image"]');
      if (twitterImage && collection.banner) {
        twitterImage.setAttribute('content', collection.banner);
        console.log('🔍 Set Twitter image to:', collection.banner);
      }
      
      const twitterUrl = document.querySelector('meta[property="twitter:url"]');
      if (twitterUrl) {
        twitterUrl.setAttribute('content', window.location.href);
      }
    }
    
    // Cleanup function to reset meta tags when component unmounts
    return () => {
      document.title = 'Dreava Launchpad';
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 'Dreava Launchpad - NFT Launchpad Platform');
      }
    };
  }, [collection]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner 
          message="Loading collection" 
          showLogo={true}
          size="large"
          showProgress={false}
          showDots={false}
        />
      </div>
    );
  }

  if (!collection) {
    return <div className="text-center text-zinc-400 mt-20">Collection not found.</div>;
  }

  return (
          <div className="min-h-screen bg-black text-white">
      <BackgroundCircles />
      {/* БАННЕР НА ВСЮ ШИРИНУ ЭКРАНА */}
      <div className="relative h-[400px] w-full overflow-hidden shadow-2xl border-b border-zinc-700/30 bg-zinc-900/80 backdrop-blur-sm z-10">
        {/* 🚀 Оптимизированный баннер с fallback */}
        {(() => {
          // Resolve banner like on Home.jsx
          const bannerLocal = localStorage.getItem(`collection_${collection.address}_banner`);
          const bannerMeta = collection.metadata?.banner ? getIpfsUrls(collection.metadata.banner)[0] : null;
          const bannerApi = collection.banner
            ? (collection.banner.startsWith('ipfs://') ? getIpfsUrls(collection.banner)[0] : collection.banner)
            : null;
          const resolvedBanner = bannerLocal || bannerMeta || bannerApi || null;
          const bannerPosition = localStorage.getItem(`collection_${collection.address}_banner_position`) || 'center center';
          const bannerFit = localStorage.getItem(`collection_${collection.address}_banner_fit`) || 'cover';

          // Debug banner resolution
          console.log('🔍 CollectionMintPage Banner debug:', {
            bannerLocal,
            bannerMeta,
            bannerApi,
            resolvedBanner,
            collectionCover: collection.cover,
            collectionBannerImage: collection.bannerImage
          });

          return resolvedBanner ? (
            <img 
              src={resolvedBanner} 
              alt="banner" 
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                objectPosition: bannerPosition,
                objectFit: bannerFit
              }}
              onError={(e) => {
                console.warn('⚠️ Banner image failed to load:', resolvedBanner);
                e.target.style.display = 'none';
                // Показываем fallback
                const fallback = e.target.nextElementSibling;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null;
        })()}
        
        {/* Fallback когда нет баннера или изображение не загрузилось */}
        <div 
          className={`flex items-center justify-center h-full w-full ${collection.banner ? 'hidden' : ''}`}
          style={{ display: collection.banner ? 'none' : 'flex' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black"></div>
          <div className="relative z-10 text-center text-white">
            <div className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent">
              {collection.name}
            </div>
            <div className="text-xl text-zinc-300 mb-2">
              {collection.description ? collection.description.slice(0, 100) + '...' : 'Amazing NFT Collection'}
            </div>
            <div className="text-zinc-400">
              Discover and mint unique NFTs
            </div>
          </div>
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 via-zinc-900/20 to-transparent"></div>
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-black/60 hover:border-white/30 transition-all duration-300 hover:scale-105 z-20"
        >
          ← Back
        </button>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="max-w-7xl mx-auto px-6 py-6 pb-24 relative z-10">
        {/* 🚀 Performance Monitor */}
        <PerformanceMonitor 
          onMetrics={setPerformanceMetrics}
          showUI={false}
        />
        
        {/* 🖼️ Image Preloader для критических изображений */}
        {criticalImages.length > 0 && (
          <ImagePreloader
            images={criticalImages}
            priority={true}
            onComplete={() => setImagesPreloaded(true)}
            onProgress={(loaded, total) => {
              if (loaded === total) setImagesPreloaded(true);
            }}
          />
        )}
        
        {/* 🖼️ Image Preloader для NFT preview изображений */}
        {nftPreviewImages.length > 0 && (
          <ImagePreloader
            images={nftPreviewImages}
            priority={false}
            onComplete={() => console.log('NFT preview images preloaded')}
            onProgress={(loaded, total) => {
              console.log(`NFT preview: ${loaded}/${total} images loaded`);
            }}
          />
        )}

        {/* MAIN CONTENT - 2 COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN: Collection Info + Mint + Phases */}
          <div className="lg:col-span-2 space-y-6">
            {/* COLLECTION INFO BLOCK */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-6">
              <div className="flex items-start gap-6">
                {/* Cover image */}
                <div className="w-24 h-24 rounded-2xl border-2 border-zinc-700/50 shadow-xl overflow-hidden bg-zinc-900/80 backdrop-blur-sm flex-shrink-0">
                  <LazyImage 
                    src={collection.cover || collection.firstNFTImage || '/default-cover.png'} 
                    alt="cover" 
                    className="w-full h-full object-cover"
                    priority={true}
                    sizes="96px"
                    onError={(e) => {
                      console.warn('⚠️ Cover image failed to load:', collection.cover);
                      // Если нет обложки, пробуем показать изображение NFT
                      if (collection.firstNFTImage && collection.firstNFTImage !== e.target.src) {
                        e.target.src = collection.firstNFTImage;
                      } else {
                        // Если нет изображения NFT, показываем placeholder
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjMzM0MTU1Ii8+CjxjaXJjbGUgY3g9IjQ4IiBjeT0iNDgiIHI9IjI0IiBmaWxsPSIjNjY3MzgwIi8+Cjwvc3ZnPgo=';
                      }
                    }}
                  />
                </div>
                
                {/* Collection details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-white truncate">{collection.name}</h1>
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                  </div>
                  <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
                    {collection.description}
                  </p>
                  
                  {/* Social Links */}
                  <div className="flex items-center gap-3">
                    {socialLinks.website && (
                      <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" 
                         className="w-8 h-8 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-all duration-200 hover:scale-110 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-zinc-400" />
                      </a>
                    )}
                    {socialLinks.twitter && (
                      <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" 
                         className="w-8 h-8 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-all duration-200 hover:scale-110 flex items-center justify-center">
                        <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                      </a>
                    )}
                    {socialLinks.discord && (
                      <a href={socialLinks.discord} target="_blank" rel="noopener noreferrer" 
                         className="w-8 h-8 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-all duration-200 hover:scale-110 flex items-center justify-center">
                        <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.019 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                        </svg>
                      </a>
                    )}
                    <a href={`https://shannon-explorer.somnia.network/address/${collection.address}`} target="_blank" rel="noopener noreferrer" 
                       className="w-8 h-8 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-all duration-200 hover:scale-110 flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-zinc-400" />
                    </a>
                    {/* Share Button */}
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="w-8 h-8 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-all duration-200 hover:scale-110 flex items-center justify-center"
                      title="Share collection"
                    >
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                    </button>

                  </div>
                </div>
              </div>
            </div>

            {/* MINT SECTION */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-6">
              {/* Status and Progress */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{minted}</div>
                    <div className="text-sm text-zinc-400">Minted</div>
                  </div>
                  <div className="text-zinc-400 text-xl">/</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{collection.totalSupply}</div>
                    <div className="text-sm text-zinc-400">Total</div>
                  </div>
                </div>
                
                {activePhase && (
                  <div className="text-right">
                    <div className="text-sm text-zinc-400 mb-1">Price</div>
                    <div className="flex items-center gap-2 text-xl font-bold text-white whitespace-nowrap">
                      <img src={somniaLogo} alt="STT" className="w-5 h-5" /> {formattedDisplayPrice} STT
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-zinc-800/50 rounded-full mb-6 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-pink-500 relative" style={{ width: `${progress}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
              </div>

              {/* Status Message */}
              {isSoldOut ? (
                <div className="text-center mb-6">
                  <div className="text-2xl font-bold bg-gradient-to-r from-red-500 via-pink-500 to-red-600 bg-clip-text text-transparent mb-2">
                    SOLD OUT!
                  </div>
                  <div className="text-zinc-400 text-sm">All NFTs have been minted</div>
                </div>
              ) : activePhase && activePhase[1] ? (
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-pink-400 animate-pulse" />
                    <span className="text-base font-semibold text-white">
                      <Countdown 
                        date={Number(activePhase[1].end) * 1000}
                        renderer={({ days, hours, minutes, seconds }) => (
                          <span>
                            {days > 0 ? `${days}d ` : ''}{hours}h {minutes}m {seconds}s
                          </span>
                        )}
                      />
                    </span>
                  </div>
                  <div className="text-zinc-400 text-sm">Time remaining</div>
                </div>
              ) : (
                <div className="text-center mb-6">
                  <div className="text-base font-semibold text-zinc-400">No active phase at the moment</div>
                </div>
              )}

              {/* Mint Button */}
              <div className="text-center">
                <button
                  onClick={openMintModal}
                  disabled={
                    !activePhase || 
                    wlLoading || 
                    isSoldOut ||
                    (walletLimit > 0 && userMintedCount >= walletLimit) ||
                    (!activePhase?.[1]?.isPublic && !wlStatus?.isWhitelisted)
                  }
                  className={`w-full px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-2xl transition-all duration-300 active:scale-95 relative overflow-hidden group ${
                    isSoldOut || (walletLimit > 0 && userMintedCount >= walletLimit)
                      ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-50'
                      : !activePhase || wlLoading || (!activePhase?.[1]?.isPublic && !wlStatus?.isWhitelisted)
                        ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] hover:from-[#0095E6] hover:to-[#E61CC7] hover:shadow-pink-500/25 hover:scale-105'
                  }`}
                >
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <span className="relative z-10">
                    {wlLoading 
                      ? 'Checking whitelist...' 
                      : isSoldOut
                        ? 'Sold Out'
                        : (walletLimit > 0 && userMintedCount >= walletLimit)
                          ? 'Wallet Limit Reached'
                                                  : activePhase && activePhase[1]
                          ? `Mint for ${formattedDisplayPrice} STT` 
                          : 'Mint Now'
                    }
                  </span>
                </button>
                
                {/* Status messages */}
                {!wlStatus?.isWhitelisted && !wlLoading && !activePhase?.[1]?.isPublic && (
                  <div className="mt-3 text-red-400 text-sm">
                    You are not whitelisted for this phase
                  </div>
                )}
                {wlStatus?.isWhitelisted && !wlLoading && !activePhase?.[1]?.isPublic && (
                  <div className="mt-3 text-green-400 text-sm">
                    ✅ You are whitelisted for this phase!
                  </div>
                )}
                {wlLoading && (
                  <div className="mt-3">
                    <LoadingSpinner 
                      message="Verifying whitelist" 
                      showLogo={false}
                      size="small"
                      showProgress={false}
                      showDots={false}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* PHASES SECTION */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Phases</h3>
              {(() => {
                const sortedPhases = getSortedPhases();
                if (sortedPhases.length === 0) {
                  return <div className="text-center text-zinc-400 text-sm">No phases defined</div>;
                }
                
                return (
                  <div className="space-y-3">
                    {sortedPhases.map((phase, idx) => {
                      const isActive = activePhase && activePhase[1] && activePhase[0] === phase.originalIndex;
                      const isLive = phase.isActive;
                      const walletLimit = contractPhaseLimits[phase.originalIndex] ?? 0;
                      
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border transition-all duration-300 ${
                            isActive 
                              ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/50' 
                              : 'bg-zinc-800/30 border-zinc-700/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                isActive
                                  ? 'bg-green-500 animate-pulse'
                                  : 'bg-zinc-500'
                              }`} />
                              <div className="font-semibold text-white text-sm">{phase.name}</div>
                            </div>
                            
                            {isActive && (
                              <span className="text-xs bg-green-600 px-2 py-1 rounded-full text-white">
                                LIVE
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-white whitespace-nowrap">
                              <img src={somniaLogo} alt="STT" className="w-4 h-4" /> {formatPrice(phase.price)} STT
                            </div>
                            <div className="text-zinc-400">
                              {walletLimit === 0 ? '∞' : walletLimit} per wallet
                            </div>
                          </div>
                          
                          <div className="text-xs text-zinc-400 mt-1">
                            {new Date(Number(phase.start) * 1000).toLocaleDateString()} - {new Date(Number(phase.end) * 1000).toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* RIGHT COLUMN: Collection Preview */}
          <div className="lg:col-span-1">
            {collectionNFTs.length > 0 && (
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-6 lg:sticky lg:top-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Collection Preview</h3>
                  <button
                    onClick={clearPreviewCache}
                    className="text-zinc-400 hover:text-white transition-colors"
                    title="Refresh preview"
                  >
                    ↻
                  </button>
                </div>
                
                {previewLoading && (
                  <LoadingSpinner 
                    message="Loading preview" 
                    showLogo={false}
                    size="small"
                    showProgress={false}
                    showDots={false}
                  />
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  {collectionNFTs.slice(0, 5).map((nft, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedPreviewImage(nft);
                        setShowPreviewModal(true);
                      }}
                      className="group"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden border border-zinc-700/50 hover:border-pink-500/50 transition-all duration-300 hover:scale-105 bg-zinc-900/50 backdrop-blur-sm relative">
                        <LazyImage 
                          src={nft.image} 
                          alt={nft.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          priority={index < 3} // Приоритет для первых 3 изображений
                          sizes={isMobile ? "50vw" : "25vw"}
                          onError={(e) => {
                            console.warn('⚠️ NFT preview image failed to load:', nft.image);
                            e.target.src = collection.cover;
                          }}
                        />
                        
                        {/* Индикатор загрузки для placeholder'ов */}
                        {nft.isPlaceholder && (
                          <div className="absolute inset-0 bg-zinc-800/80 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-6 h-6 border-2 border-zinc-600 border-t-pink-500 rounded-full animate-spin mx-auto mb-2"></div>
                              <div className="text-xs text-zinc-400">Loading...</div>
                            </div>
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <div className="mt-1 text-center">
                        <div className="text-xs text-white font-medium truncate"></div>
                      </div>
                    </button>
                  ))}
                  
                  {collectionNFTs.length > 5 && (
                    <button
                      onClick={() => setShowMoreModal(true)}
                      className="aspect-square rounded-lg border-2 border-dashed border-zinc-600/50 hover:border-pink-500/50 transition-all duration-300 flex items-center justify-center text-zinc-400 hover:text-zinc-300 bg-zinc-900/50 backdrop-blur-sm hover:scale-105 group"
                    >
                      <div className="text-center group-hover:scale-110 transition-transform duration-300">
                        <div className="text-sm font-semibold">More</div>
                        <div className="text-xs">+{collectionNFTs.length - 5}</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mint Modal */}
      {showMintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100000] p-0 sm:p-4">
          <div className="bg-zinc-900/95 backdrop-blur-md rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg sm:w-full animate-fadeIn border border-zinc-700/30 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-zinc-700/30 bg-zinc-900/95 backdrop-blur-md">
              <h3 className="text-xl font-bold text-white">Mint NFT</h3>
              <button
                onClick={closeMintModal}
                className="text-zinc-400 hover:text-white transition-all duration-200 hover:scale-110"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 pb-28 sm:pb-6">
              {/* Collection Info */}
              <div className="flex flex-col md:flex-row items-start gap-4 mb-6 p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
                {/* Collection Cover - фиксированная высота */}
                <div className="relative w-full md:w-56 mb-3 md:mb-0 flex-shrink-0 h-40 md:h-56">
                  <img 
                    src={collection.cover || collection.firstNFTImage || '/default-cover.png'} 
                    alt={collection.name}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      console.warn('⚠️ Collection cover failed to load:', e.target.src);
                      // Если нет обложки, пробуем показать изображение NFT
                      if (collection.firstNFTImage && collection.firstNFTImage !== e.target.src) {
                        e.target.src = collection.firstNFTImage;
                      } else {
                        // Если нет изображения NFT, показываем placeholder
                        e.target.src = '/default-cover.png';
                      }
                    }}
                  />
                </div>
                <div className="w-full md:flex-1 text-center md:text-left">
                  <h4 className="text-lg font-semibold text-white mt-1">{collection.name}</h4>
                  <p className="text-sm text-zinc-400 mt-1">
                    {minted} / {collection.totalSupply} minted
                  </p>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Quantity
                </label>
                <div className="flex items-center justify-between bg-zinc-800/30 rounded-2xl p-3 sm:p-4 border border-zinc-700/30">
                  <button
                    onClick={() => handleQuantityChange(mintQuantity - 1)}
                    disabled={mintQuantity <= 1}
                    className="w-12 h-12 rounded-xl bg-zinc-700/50 hover:bg-zinc-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 hover:scale-105"
                  >
                    <Minus size={20} />
                  </button>
                   <span className="text-xl sm:text-2xl font-bold text-white px-4 sm:px-6">{mintQuantity}</span>
                  <button
                    onClick={() => handleQuantityChange(mintQuantity + 1)}
                    disabled={mintQuantity >= getMaxQuantity()}
                    className="w-12 h-12 rounded-xl bg-zinc-700/50 hover:bg-zinc-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 hover:scale-105"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Max: {getMaxQuantity()} per transaction
                </p>
              </div>

              {/* Price Info */}
              <div className="bg-zinc-800/30 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 border border-zinc-700/30">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-zinc-400">Price per NFT:</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-white whitespace-nowrap flex items-center gap-1">
                      <img src={somniaLogo} alt="STT" className="w-5 h-5 flex-shrink-0" /> {formattedDisplayPrice} STT
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-zinc-400">Quantity:</span>
                  <span className="text-white">{mintQuantity}</span>
                </div>
                <div className="border-t border-zinc-700/30 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">Total:</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl font-bold text-white whitespace-nowrap flex items-center gap-1"><img src={somniaLogo} alt="STT" className="w-6 h-6 flex-shrink-0" /> {totalPrice} STT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mint Button (sticky on mobile) */}
              <div className="sticky bottom-0 left-0 right-0 -mx-4 sm:mx-0 pt-4 pb-4 sm:pb-0 pb-[calc(env(safe-area-inset-bottom)+1rem)] bg-zinc-900/95 backdrop-blur-md border-t border-zinc-700/30">
                <button
                  onClick={handleMintFromModal}
                  disabled={isMinting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-semibold hover:from-[#0095E6] hover:to-[#E61CC7] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 sm:hover:scale-105 shadow-2xl hover:shadow-pink-500/25 relative overflow-hidden group"
                >
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <span className="relative z-10">
                    {isMinting ? '⏳ Processing...' : `Mint ${mintQuantity} NFT${mintQuantity > 1 ? 's' : ''}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Connect Modal */}
      {showWalletConnect && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-900/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-md w-full animate-fadeIn border border-zinc-700/30">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Connect Wallet</h3>
              <p className="text-zinc-400 mb-8 text-lg">
                Please connect your wallet to mint NFTs from this collection
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowWalletConnect(false)}
                  className="flex-1 py-3 px-6 rounded-2xl bg-zinc-700/50 text-white hover:bg-zinc-600/50 transition-all duration-200 hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowWalletConnect(false);
                    // Trigger wallet connection from header
                    const walletButton = document.querySelector('[data-wallet-connect]');
                    if (walletButton) {
                      walletButton.click();
                    }
                  }}
                  className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-500 to-pink-500 text-white font-semibold hover:from-[#0095E6] hover:to-[#E61CC7] transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-pink-500/25 relative overflow-hidden group"
                >
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <span className="relative z-10">Connect Wallet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedPreviewImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-900/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-3xl w-full animate-fadeIn border border-zinc-700/30">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">{selectedPreviewImage.name}</h3>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedPreviewImage(null);
                  }}
                  className="text-zinc-400 hover:text-white transition-all duration-200 hover:scale-110"
                >
                  <X size={28} />
                </button>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                  <div className="rounded-2xl overflow-hidden border border-zinc-700/30 shadow-2xl">
                    <img 
                      src={selectedPreviewImage.image} 
                      alt={selectedPreviewImage.name}
                      className="w-full rounded-2xl object-cover hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = collection.cover;
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-white mb-3">{selectedPreviewImage.name}</h4>
                  <p className="text-zinc-300 text-base mb-6">
                    {selectedPreviewImage.description || `NFT from ${collection.name} collection`}
                  </p>
                  
                  {selectedPreviewImage.attributes && selectedPreviewImage.attributes.length > 0 && (
                    <div>
                      <h5 className="text-lg font-semibold text-zinc-300 mb-4">Attributes</h5>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedPreviewImage.attributes.map((attr, index) => (
                          <div key={index} className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/30 hover:border-pink-500/50 transition-all duration-200 hover:scale-105">
                            <div className="text-sm text-zinc-400 mb-1">{attr.trait_type}</div>
                            <div className="text-base text-white font-semibold">{attr.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* More NFTs Modal */}
      {showMoreModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-900/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-5xl w-full max-h-[85vh] animate-fadeIn border border-zinc-700/30">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Collection Gallery</h3>
                <button
                  onClick={() => setShowMoreModal(false)}
                  className="text-zinc-400 hover:text-white transition-all duration-200 hover:scale-110"
                >
                  <X size={28} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-[65vh] overflow-y-auto">
                {collectionNFTs.map((nft, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedPreviewImage(nft);
                      setShowMoreModal(false);
                      setShowPreviewModal(true);
                    }}
                    className="group"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden border border-zinc-700/30 group-hover:border-pink-500/50 transition-all duration-300 hover:scale-105 bg-zinc-900/50 backdrop-blur-sm shadow-lg relative">
                      <LazyImage 
                        src={nft.image} 
                        alt={nft.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        priority={index < 12} // Приоритет для первых 12 изображений
                        sizes={isMobile ? "50vw" : isTablet ? "25vw" : "16vw"}
                        onError={(e) => {
                          console.warn('⚠️ More NFTs modal image failed to load:', nft.image);
                          e.target.src = collection.cover;
                        }}
                      />
                      
                      {/* Индикатор загрузки для placeholder'ов */}
                      {nft.isPlaceholder && (
                        <div className="absolute inset-0 bg-zinc-800/80 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-8 h-8 border-2 border-zinc-600 border-t-pink-500 rounded-full animate-spin mx-auto mb-2"></div>
                            <div className="text-sm text-zinc-400">Loading...</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <div className="mt-3 text-center">
                      <div className="text-sm text-white font-medium truncate">{nft.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.visible && (
        <div className="fixed bottom-20 right-4 bg-zinc-900/95 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl max-w-xs animate-fadeIn cursor-pointer hover:opacity-100 opacity-90 border border-zinc-700/50 hover:border-pink-500/50 transition-all duration-300 hover:scale-105 z-50">
          <p className="text-sm mb-1">{toast.message}</p>
          {toast.txHash && (
            <a
              href={`https://shannon-explorer.somnia.network/tx/${toast.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1 text-sm hover:text-pink-400 transition-colors duration-200"
            >
              <ExternalLink size={16} />
              View Transaction
            </a>
          )}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-900/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-md w-full animate-fadeIn border border-zinc-700/30">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-700/30">
              <h3 className="text-xl font-bold text-white">Share Collection</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-zinc-400 hover:text-white transition-all duration-200 hover:scale-110"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Collection Info */}
              <div className="flex items-center gap-4 p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
                {/* Collection Cover - фиксированная высота */}
                <div className="relative mb-6 flex-shrink-0 h-56">
                  <img 
                    src={collection.cover || collection.firstNFTImage || '/default-cover.png'} 
                    alt={collection.name}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      console.warn('⚠️ Collection cover failed to load:', e.target.src);
                      // Если нет обложки, пробуем показать изображение NFT
                      if (collection.firstNFTImage && collection.firstNFTImage !== e.target.src) {
                        e.target.src = collection.firstNFTImage;
                      } else {
                        // Если нет изображения NFT, показываем placeholder
                        e.target.src = '/default-cover.png';
                      }
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">{collection.name}</h4>
                  <p className="text-sm text-zinc-400">
                    {minted} / {collection.totalSupply} minted
                  </p>
                </div>
              </div>

              {/* Copy Link Section */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Collection Link
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={window.location.href}
                    readOnly
                    className="flex-1 p-3 bg-zinc-800/30 border border-zinc-700/30 rounded-xl text-white text-sm focus:outline-none focus:border-pink-500/50 transition-colors truncate"
                    style={{ 
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex-shrink-0 ${
                      copySuccess
                        ? 'bg-green-600 text-white'
                        : 'bg-zinc-700/50 hover:bg-zinc-600/50 text-white'
                    }`}
                  >
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {/* Show full URL on hover or click */}
                <div className="mt-2">
                  <details className="group">
                    <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors">
                      Show full URL
                    </summary>
                    <div className="mt-2 p-2 bg-zinc-800/20 rounded-lg border border-zinc-700/30">
                      <p className="text-xs text-zinc-300 break-all">
                        {window.location.href}
                      </p>
                    </div>
                  </details>
                </div>
              </div>

              {/* Tweet Section */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Share on Twitter
                </label>
                <div className="bg-zinc-800/30 rounded-2xl p-4 border border-zinc-700/30 mb-4">
                  <p className="text-sm text-zinc-300 mb-3">
                    "I just created my NFT collection "{collection.name}" on Dreava Art! 🚀
                    <br /><br />
                    Check it out: <span className="break-all text-blue-400">{window.location.href}</span>
                    <br /><br />
                    Try it yourself, it's really simple! ✨"
                  </p>
                </div>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just created my NFT collection "${collection.name}" on Dreava Art! 🚀\n\nCheck it out: ${window.location.href}\n\nTry it yourself, it's really simple! ✨`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  Tweet
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MintPage;