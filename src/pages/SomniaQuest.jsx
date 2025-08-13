// src/pages/SomniaQuest.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { ensureSomniaNetwork, SOMNIA_CHAIN_ID_DEC } from '../utils/network';
import { useReownWallet } from '../hooks/useReownWallet';
import { Clock, Users, Star, ArrowRight, Trophy, Calendar, CheckCircle, ExternalLink, Info, X, Plus, Minus } from 'lucide-react';
import somniaLogo from '../assets/somnia-logo.svg';
import somniaQuestImage from '../assets/somniaquest.png';
import leftArrow from '../assets/arrow-left.svg';
import rightArrow from '../assets/arrow-right.svg';
import { getIpfsUrls, fetchWithFallback } from '../utils/ipfs';
import { useActiveCollections } from '../hooks/useActiveCollections';
import nftAbi from '../abi/SomniaNFT.json';

// Компонент для ограничения текста с выпадающей подсказкой
const TruncatedText = ({ text, maxLines = 3, className = "" }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [shouldTruncate, setShouldTruncate] = useState(false);
  const [truncatedText, setTruncatedText] = useState(text);
  const textRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(window.getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * maxLines;
      setShouldTruncate(textRef.current.scrollHeight > maxHeight);
    }
  }, [text, maxLines]);

  // Закрытие подсказки при клике вне её
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTooltip && !buttonRef.current?.contains(event.target)) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTooltip]);

  // Функция для обрезания текста с учётом места для кнопки
  const truncateTextForButton = (text, maxLines) => {
    const words = text.split(' ');
    const testElement = document.createElement('p');
    testElement.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 16px;
      line-height: 1.5;
      width: calc(100% - 32px);
      max-width: calc(100% - 32px);
    `;
    document.body.appendChild(testElement);
    
    const lineHeight = parseInt(window.getComputedStyle(testElement).lineHeight);
    const maxHeight = lineHeight * maxLines;
    
    let truncated = text;
    for (let i = words.length; i > 0; i--) {
      const testText = words.slice(0, i).join(' ');
      testElement.textContent = testText;
      
      if (testElement.scrollHeight <= maxHeight) {
        truncated = testText;
        break;
      }
    }
    
    document.body.removeChild(testElement);
    return truncated;
  };

  useEffect(() => {
    if (shouldTruncate) {
      setTruncatedText(truncateTextForButton(text, maxLines));
    } else {
      setTruncatedText(text);
    }
  }, [text, shouldTruncate, maxLines]);

  if (!shouldTruncate) {
    return <p ref={textRef} className={className}>{text}</p>;
  }

  return (
    <div className="relative h-[72px]">
      <div className="overflow-hidden h-full">
        <p className={className} style={{ width: 'calc(100% - 32px)' }}>
          {truncatedText}
        </p>
      </div>
      <button
        ref={buttonRef}
        onClick={() => setShowTooltip(!showTooltip)}
        className="absolute bottom-0 right-0 bg-zinc-800 hover:bg-zinc-700 rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors z-10"
        title="Show full text"
      >
        ⋯
      </button>
      
      {/* Выпадающая подсказка */}
      {showTooltip && (
        <div className="fixed bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg max-w-xs z-50" 
             style={{
               top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 5 : 0,
               left: buttonRef.current ? buttonRef.current.getBoundingClientRect().left - 200 : 0
             }}>
          <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
        </div>
      )}
    </div>
  );
};

// Компонент для ограничения названия с выпадающей подсказкой
const TruncatedTitle = ({ text, maxLines = 3, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [shouldTruncate, setShouldTruncate] = useState(false);
  const [truncatedText, setTruncatedText] = useState(text);
  const textRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(window.getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * maxLines;
      setShouldTruncate(textRef.current.scrollHeight > maxHeight);
    }
  }, [text, maxLines]);

  // Закрытие подсказки при клике вне её
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTooltip && !buttonRef.current?.contains(event.target)) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTooltip]);

  // Функция для обрезания текста с учётом места для кнопки
  const truncateTextForButton = (text, maxLines) => {
    const words = text.split(' ');
    const testElement = document.createElement('h3');
    testElement.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 24px;
      line-height: 1.5;
      font-weight: bold;
      width: calc(100% - 32px);
    `;
    document.body.appendChild(testElement);
    
    const lineHeight = parseInt(window.getComputedStyle(testElement).lineHeight);
    const maxHeight = lineHeight * maxLines;
    
    let truncated = text;
    for (let i = words.length; i > 0; i--) {
      const testText = words.slice(0, i).join(' ');
      testElement.textContent = testText;
      
      if (testElement.scrollHeight <= maxHeight) {
        truncated = testText;
        break;
      }
    }
    
    document.body.removeChild(testElement);
    return truncated;
  };

  useEffect(() => {
    if (shouldTruncate) {
      setTruncatedText(truncateTextForButton(text, maxLines));
    } else {
      setTruncatedText(text);
    }
  }, [text, shouldTruncate, maxLines]);

  return (
    <div className="relative h-[72px]">
      <div className="overflow-hidden h-full">
        <h3 
          ref={textRef}
          onClick={onClick}
          className="text-2xl font-bold text-white cursor-pointer hover:text-blue-400 transition-colors"
          style={shouldTruncate ? { width: 'calc(100% - 32px)' } : {}}
        >
          {shouldTruncate ? truncatedText : text}
        </h3>
      </div>
      {shouldTruncate && (
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowTooltip(!showTooltip);
          }}
          className="absolute bottom-0 right-0 bg-zinc-800 hover:bg-zinc-700 rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors z-10"
          title="Show full title"
        >
          ⋯
        </button>
      )}
      
      {/* Выпадающая подсказка */}
      {showTooltip && (
        <div className="fixed bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg max-w-xs z-50" 
             style={{
               top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 5 : 0,
               left: buttonRef.current ? buttonRef.current.getBoundingClientRect().left - 200 : 0
             }}>
          <h3 className="text-white text-lg font-bold">{text}</h3>
        </div>
      )}
    </div>
  );
};

const SomniaQuest = () => {
  const [collectionsData, setCollectionsData] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState(null);
  const [mintQueue, setMintQueue] = useState([]);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [lastMintTime, setLastMintTime] = useState(0);
  const [mintMetrics, setMintMetrics] = useState({
    totalRequests: 0,
    successfulMints: 0,
    failedMints: 0,
    queueLength: 0,
    averageProcessingTime: 0
  });
  const [contractPhaseLimits, setContractPhaseLimits] = useState({});
  const [userMintedCounts, setUserMintedCounts] = useState({});
  const [isWalletLimitReached, setIsWalletLimitReached] = useState(false);
  
  // Modal state
  const [showMintModal, setShowMintModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [mintQuantity, setMintQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState('0');
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', txHash: '' });
  
  // Slide navigation state
  const [currentIndex, setCurrentIndex] = useState(0);

  const navigate = useNavigate();
  const { address: wagmiAddress, isConnected: wagmiIsConnected, switchNetwork } = useReownWallet();
  const { collections, loading, error, refetch } = useActiveCollections();

  // Функция для записи контракта через ethers.js (с гарантией сети Somnia)
  const writeContractAsync = async (contractConfig) => {
    if (!window.ethereum) {
      throw new Error('Wallet not connected');
    }
    // Ensure correct network before any write
    try {
      const sw = await (async () => { try { return await switchNetwork?.(SOMNIA_CHAIN_ID_DEC); } catch { return { success: false }; } })();
      if (!sw?.success) await ensureSomniaNetwork();
    } catch (e) {
      throw new Error('Please switch to Somnia Testnet');
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

  // Rate limiting for mint operations
  const MINT_COOLDOWN = 1000; // 1 second between mints for hot sales

  // Gas settings for competitive minting
  const GAS_SETTINGS = {
    BASE_GAS_LIMIT: 300000,
    MAX_GAS_LIMIT: 500000,
    GAS_LIMIT: 3000000, // 3M gas limit for 100% success
    MAX_GAS_PRICE_GWEI: 50, // Maximum gas price
    WARNING_GAS_PRICE_GWEI: 20, // Warning threshold
    PRICE_MULTIPLIER: 1.2,
    RETRY_ATTEMPTS: 5, // Number of retry attempts
    RETRY_DELAY: 1000 // Base delay between retries
  };

  // Мемоизированная обработка данных коллекций
  const processedCollections = useMemo(() => {
    if (!collections || collections.length === 0) return [];
    
    return collections.map((collection) => {
      // Получаем фазы из collection.phases или collection.metadata.phases
      const getPhases = (col) => col.phases || col.metadata?.phases || {};
      const phases = getPhases(collection);
      const now = Math.floor(Date.now() / 1000);
      
      // Sort phases in fixed order: WL → FCFS → Public
      const phaseOrder = [
        { key: 'Whitelist', priority: 1 },
        { key: 'FCFS', priority: 2 },
        { key: 'Public', priority: 3 }
      ];
      
      // Create a map of phase data
      const phaseMap = new Map();
      Object.entries(phases).forEach(([phaseName, phaseData]) => {
        phaseMap.set(phaseName, { ...phaseData, name: phaseName });
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
            isActive,
            isPublic,
            priority: phase.priority
          };
        })
        .sort((a, b) => a.priority - b.priority);
      
      // Находим активную фазу из отсортированных фаз
      const activePhase = sortedPhases.find(phase => phase.isActive);
      
      return {
        ...collection,
        maxSupply: collection.totalSupply || collection.maxSupply || 0,
        minted: collection.minted || 0,
        activePhase: activePhase ? {
          name: activePhase.name,
          start: Number(activePhase.start),
          end: Number(activePhase.end),
          price: activePhase.price,
          maxPerWallet: Number(activePhase.maxPerWallet) || 1,
          merkleRoot: activePhase.merkleRoot,
          isPublic: activePhase.isPublic
        } : null,
        sortedPhases // Add sorted phases for display
      };
    });
  }, [collections]);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const showToast = (message, txHash = '') => {
    setToast({ visible: true, message, txHash });
  };

  // Функция для обновления данных конкретной коллекции
  const refreshCollectionData = async (collectionAddress) => {
    try {
      // Сначала обновляем локально для мгновенного отклика
      setCollectionsData(prevData => 
        prevData.map(collection => {
          if (collection.address === collectionAddress) {
            // Увеличиваем количество сминченных токенов
            return {
              ...collection,
              minted: collection.minted + 1
            };
          }
          return collection;
        })
      );
      
      // Обновляем счетчик пользователя
      setUserMintedCounts(prev => ({
        ...prev,
        [collectionAddress]: (prev[collectionAddress] || 0) + 1
      }));
      
      console.log('✅ Collection data updated locally for:', collectionAddress);
      
      // Затем обновляем данные с сервера в фоне
      setTimeout(() => {
        refetch();
        checkWalletLimits(); // Recheck wallet limits
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to update collection data:', error);
    }
  };

  // Update collectionsData when processedCollections changes
  useEffect(() => {
    setCollectionsData(processedCollections);
  }, [processedCollections]);

  // Check wallet limits when user connects or collections change
  useEffect(() => {
    if (isConnected && address && processedCollections.length > 0) {
      checkWalletLimits();
    }
  }, [isConnected, address, processedCollections]);

  // Cleanup mint queue on unmount
  useEffect(() => {
    return () => {
      setMintQueue([]);
      setProcessingQueue(false);
      setIsMinting(false);
    };
  }, []);

  // Update wagmi state
  useEffect(() => {
    setIsConnected(wagmiIsConnected);
    setAddress(wagmiAddress);
  }, [wagmiIsConnected, wagmiAddress]);

  // Calculate total price when quantity changes
  useEffect(() => {
    if (selectedCollection && selectedCollection.activePhase) {
      const price = selectedCollection.activePhase.price || '0';
      const total = (parseFloat(price) * mintQuantity).toFixed(4);
      setTotalPrice(total);
    }
  }, [mintQuantity, selectedCollection]);

  // Check wallet limits for all collections
  const checkWalletLimits = async () => {
    if (!address || !isConnected) return;
    
    try {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const newUserMintedCounts = {};
      
      console.log('🔍 Checking wallet limits for user:', address);
      
      for (const collection of processedCollections) {
        if (collection.activePhase) {
          try {
            const contract = new ethers.Contract(collection.address, nftAbi, provider);
            
            // Find phase index
            const phases = collection.phases || collection.metadata?.phases || {};
            const phaseEntries = Object.entries(phases);
            const activePhaseIndex = phaseEntries.findIndex(([, phase]) => {
              const startTime = Number(phase.start);
              const endTime = Number(phase.end);
              const now = Math.floor(Date.now() / 1000);
              return startTime <= now && now <= endTime;
            });
            
            console.log(`🔍 Collection ${collection.name} (${collection.address}):`, {
              activePhaseIndex,
              maxPerWallet: collection.activePhase.maxPerWallet
            });
            
            if (activePhaseIndex >= 0) {
              // Try mintedPerPhase first
              try {
                const userMinted = await contract.mintedPerPhase(activePhaseIndex, address);
                console.log(`✅ mintedPerPhase exists for ${collection.name}:`, Number(userMinted));
                newUserMintedCounts[collection.address] = Number(userMinted);
              } catch (mintedPerPhaseError) {
                console.warn(`⚠️ mintedPerPhase failed for ${collection.name}:`, mintedPerPhaseError);
                
                // Fallback: try balanceOf
                try {
                  const balance = await contract.balanceOf(address);
                  console.log(`🔄 Fallback balanceOf for ${collection.name}:`, Number(balance));
                  newUserMintedCounts[collection.address] = Number(balance);
                } catch (balanceError) {
                  console.warn(`⚠️ balanceOf also failed for ${collection.name}:`, balanceError);
                  newUserMintedCounts[collection.address] = 0;
                }
              }
            } else {
              console.log(`⚠️ No active phase found for ${collection.name}`);
              newUserMintedCounts[collection.address] = 0;
            }
          } catch (error) {
            console.warn(`⚠️ Could not check wallet limit for ${collection.address}:`, error);
            newUserMintedCounts[collection.address] = 0;
          }
        }
      }
      
      console.log('📊 Final user minted counts:', newUserMintedCounts);
      setUserMintedCounts(newUserMintedCounts);
      
      // Check if any collection has reached wallet limit
      const hasReachedLimit = Object.entries(newUserMintedCounts).some(([address, minted]) => {
        const collection = processedCollections.find(c => c.address === address);
        if (!collection || !collection.activePhase) return false;
        
        const maxPerWallet = collection.activePhase.maxPerWallet || 0;
        return maxPerWallet > 0 && minted >= maxPerWallet;
      });
      
      setIsWalletLimitReached(hasReachedLimit);
    } catch (error) {
      console.error('❌ Failed to check wallet limits:', error);
    }
  };

  // Open mint modal
  const openMintModal = (collection) => {
    if (!isConnected) {
      setShowWalletConnect(true);
      return;
    }
    
    setSelectedCollection(collection);
    setMintQuantity(1);
    setShowMintModal(true);
  };

  // Close mint modal
  const closeMintModal = () => {
    setShowMintModal(false);
    setSelectedCollection(null);
    setMintQuantity(1);
    setShowWalletConnect(false);
  };

  // Handle quantity change
  const handleQuantityChange = (newQuantity) => {
    if (!selectedCollection) return;
    
    const maxPerWallet = selectedCollection.activePhase?.maxPerWallet || 0;
    const userMinted = userMintedCounts[selectedCollection.address] || 0;
    const available = maxPerWallet > 0 ? maxPerWallet - userMinted : 999;
    const maxQuantity = Math.min(available, 10); // Max 10 per transaction
    
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setMintQuantity(newQuantity);
    }
  };

  // Get max quantity for collection
  const getMaxQuantity = (collection) => {
    if (!collection || !collection.activePhase) return 1;
    
    const maxPerWallet = collection.activePhase.maxPerWallet || 0;
    const userMinted = userMintedCounts[collection.address] || 0;
    const available = maxPerWallet > 0 ? maxPerWallet - userMinted : 999;
    return Math.min(available, 10); // Max 10 per transaction
  };

  // Handle mint from modal
  const handleMintFromModal = async () => {
    if (!selectedCollection || !isConnected) return;
    
    try {
      setIsMinting(true);
      
      const result = await mintWithEscalation(selectedCollection, mintQuantity);
      
      if (result.success) {
        showToast('✅ Mint successful!', result.txHash);
        await refreshCollectionData(selectedCollection.address);
        closeMintModal();
      } else {
        showToast('❌ Mint failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Mint failed:', error);
      showToast('❌ Mint failed. Please try again.');
    } finally {
      setIsMinting(false);
    }
  };

  // Priority queue processor for hot sales (legacy - not used with modal)
  const processMintQueueWithPriority = async () => {
    if (mintQueue.length === 0) {
      setProcessingQueue(false);
      return;
    }
    
    setProcessingQueue(true);
    
    // Sort queue by priority and timestamp
    const sortedQueue = [...mintQueue].sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      if (priorityWeight[a.priority] === priorityWeight[b.priority]) {
        return a.timestamp - b.timestamp; // FIFO for same priority
      }
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
    
    for (const request of sortedQueue) {
      try {
        const startTime = Date.now();
        const result = await mintWithEscalation(request.collection);
        const processingTime = Date.now() - startTime;
        
        if (result.success) {
          showToast('✅ Mint successful!', result.txHash);
          await refreshCollectionData(request.collection.address);
          setMintMetrics(prev => ({
            ...prev,
            successfulMints: prev.successfulMints + 1,
            averageProcessingTime: (prev.averageProcessingTime + processingTime) / 2
          }));
        } else {
          setMintMetrics(prev => ({ ...prev, failedMints: prev.failedMints + 1 }));
        }
      } catch (error) {
        console.error('❌ Mint failed after all attempts:', error);
        setMintMetrics(prev => ({ ...prev, failedMints: prev.failedMints + 1 }));
        showToast('❌ Mint failed after multiple attempts. Please try again.');
      }
      
      // Remove processed request from queue
      setMintQueue(prev => prev.filter(r => r.id !== request.id));
      setMintMetrics(prev => ({ ...prev, queueLength: prev.queueLength - 1 }));
      
      // Adaptive delay based on queue length - shorter delays for smaller queues
      const delay = mintQueue.length > 100 ? 200 : mintQueue.length > 50 ? 500 : mintQueue.length > 10 ? 1000 : 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    setProcessingQueue(false);
    
    // Adapt gas settings based on success rate
    adaptGasSettings();
  };

  // Enhanced mint with escalation and quantity support
  const mintWithEscalation = async (collection, quantity = 1) => {
    if (!collection || !collection.activePhase) {
      return { success: false, error: 'No active phase' };
    }

    if (!isConnected || !address) {
      return { success: false, error: 'Wallet not connected' };
    }

    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🚀 Mint attempt ${attempt}/${maxAttempts} for ${collection.name}`);
        console.log('📊 Collection details:', {
          address: collection.address,
          activePhase: collection.activePhase,
          price: collection.activePhase.price,
          isPublic: collection.activePhase.isPublic
        });
        
        // Get competitive gas settings
        const gasSettings = await getCompetitiveGasSettings(attempt);
        console.log('⛽ Gas settings:', gasSettings);
        
        // Calculate price
        const price = collection.activePhase.price || '0';
        const value = ethers.parseEther((parseFloat(price) * quantity).toString());
        console.log('💰 Price calculation:', {
          price,
          quantity,
          value: value.toString()
        });
        
        // Get proof for whitelist phases
        let proof = [];
        if (!collection.activePhase.isPublic) {
          // For whitelist phases, get proof from localStorage
          const phaseKey = Object.keys(collection.phases || {}).find(key => {
            const phase = collection.phases[key];
            return phase && Number(phase.start) <= Math.floor(Date.now() / 1000) && 
                   Math.floor(Date.now() / 1000) <= Number(phase.end);
          });
          
          if (phaseKey) {
            const proofsKey = `${collection.address}_${phaseKey}_whitelist_proofs`;
            const proofs = JSON.parse(localStorage.getItem(proofsKey) || '{}');
            proof = proofs[address] || [];
            console.log('🔐 Whitelist proof:', proof);
          }
        }

        console.log('📝 Transaction parameters:', {
          address: collection.address,
          functionName: 'mint',
          args: [quantity, proof],
          value: value.toString(),
          gasSettings
        });

        const txHash = await writeContractAsync({
          chainId: 50312,
          address: collection.address,
          abi: nftAbi,
          functionName: 'mint',
          args: [quantity, proof],
          ...(value > 0 ? { value } : {}),
          ...gasSettings
        });

        console.log('✅ Mint transaction sent:', txHash);
        
        // Wait for confirmation using ethers provider
        const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
        
        // Add retry logic for transaction confirmation
        let receipt = null;
        let retries = 3;
        
        while (retries > 0 && !receipt) {
          try {
            // Use a more robust confirmation approach
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
          console.log('✅ Mint successful!');
          
          // 🎯 Record quest action for NFT mint
          try {
            await fetch('/api/quest/record-action', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                walletAddress: address,
                actionType: 'nft_minted',
                data: {
                  collectionAddress: collection.address,
                  collectionName: collection.name,
                  quantity: quantity,
                  txHash: txHash,
                  price: collection.activePhase?.price || '0'
                }
              })
            });
          } catch (questError) {
            console.warn('⚠️ Failed to record quest action:', questError);
          }
          
          return { success: true, txHash };
        } else {
          throw new Error('Transaction failed on-chain');
        }
      } catch (error) {
        console.error(`❌ Mint attempt ${attempt} failed:`, error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          data: error.data,
          transaction: error.transaction
        });
        lastError = error;
        
        if (attempt < maxAttempts) {
          // Adaptive delay between attempts
          const delay = attempt * 1000;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('❌ All mint attempts failed');
    return { success: false, error: lastError?.message || 'Mint failed' };
  };

  // Get competitive gas settings for hot sales
  const getCompetitiveGasSettings = async (attempt = 1) => {
    try {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const feeData = await provider.getFeeData();
    
    // Adaptive gas price based on queue length and attempt number
    const queueLength = mintQueue.length;
    let gasPriceMultiplier = GAS_SETTINGS.PRICE_MULTIPLIER;
    
    // Increase multiplier based on queue length (competition)
    if (queueLength > 100) gasPriceMultiplier *= 1.5;
    else if (queueLength > 50) gasPriceMultiplier *= 1.3;
    else if (queueLength > 20) gasPriceMultiplier *= 1.2;
    
    // Increase multiplier based on retry attempt
    gasPriceMultiplier *= (1 + (attempt - 1) * 0.2); // +20% per attempt
    
    // Use EIP-1559 if available, otherwise legacy
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
              // Convert to number for calculations
      const maxFeePerGasNumber = Number(feeData.maxFeePerGas);
      const maxPriorityFeePerGasNumber = Number(feeData.maxPriorityFeePerGas);
      
      return {
        maxFeePerGas: Math.ceil(maxFeePerGasNumber * gasPriceMultiplier),
        maxPriorityFeePerGas: Math.ceil(maxPriorityFeePerGasNumber * gasPriceMultiplier),
        gasLimit: GAS_SETTINGS.GAS_LIMIT
      };
    } else {
      // Legacy gas price
      const gasPriceNumber = Number(feeData.gasPrice);
      const finalGasPrice = Math.ceil(gasPriceNumber * gasPriceMultiplier);
      
      // Check against maximum limits
      const maxGasPrice = ethers.parseUnits(GAS_SETTINGS.MAX_GAS_PRICE_GWEI.toString(), 'gwei');
      const finalGasPriceLimited = Math.min(finalGasPrice, Number(maxGasPrice));
      
      return {
        gasPrice: finalGasPriceLimited,
        gasLimit: GAS_SETTINGS.GAS_LIMIT
      };
    }
  } catch (error) {
    console.error('❌ Error getting gas settings:', error);
    // Fallback to basic gas settings
    return {
      gasLimit: GAS_SETTINGS.GAS_LIMIT
    };
  }
};

  // Adapt gas settings based on success rate
  const adaptGasSettings = () => {
    const successRate = mintMetrics.successfulMints / Math.max(mintMetrics.totalRequests, 1);
    
    if (successRate < 0.95) {
      // Increase gas price if success rate < 95%
      GAS_SETTINGS.PRICE_MULTIPLIER *= 1.1;
      console.log('📈 Increasing gas price multiplier due to low success rate');
    } else if (successRate > 0.98 && mintMetrics.totalRequests > 10) {
      // Decrease if success rate > 98% and we have enough data
      GAS_SETTINGS.PRICE_MULTIPLIER *= 0.95;
      console.log('📉 Decreasing gas price multiplier due to high success rate');
    }
    
    // Keep multiplier within reasonable bounds
    GAS_SETTINGS.PRICE_MULTIPLIER = Math.max(0.5, Math.min(3.0, GAS_SETTINGS.PRICE_MULTIPLIER));
  };

  const formatTimeLeft = (endTime) => {
    const now = Date.now();
    const diff = endTime - now;
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % collectionsData.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + collectionsData.length) % collectionsData.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#42C9EE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading Quest Collections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error loading collections: {error}</p>
          <button 
            onClick={() => refetch()} 
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative py-8">
        <div className="relative bg-black border border-white/20 rounded-2xl p-8 mx-auto max-w-5xl">
          {/* Bird with Trophy */}
          <img
            src={somniaQuestImage}
            alt="Bird with Trophy"
            className="absolute -left-8 -bottom-20 w-30 md:w-36"
          />
          
          {/* Main Content */}
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-pink-500 to-purple-500 mb-6">
              Somnia Quest
            </h1>
            
            <p className="text-base md:text-lg text-white leading-relaxed max-w-xl mx-auto">
              Animate your unique PFP, turn it into an NFT, and earn rewards!<br />
              Be creative. The more people mint your NFT, the higher your chances.<br />
              Winners with the most mints will receive USDC rewards, karma points from dreava.art.
            </p>
            
            <Link
              to="/explore#create"
              className="mt-6 inline-block py-[10px] px-6 rounded-lg bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-semibold text-sm transition-transform active:scale-95 shadow-md"
            >
              Create collection
            </Link>
          </div>
        </div>
      </div>

      {/* NFT Cards Block */}
      <div className="mx-auto max-w-5xl pb-20 mt-8">

        <div className="relative">
          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute -left-12 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 rounded-full p-2 hover:bg-black/70 transition"
          >
            <img src={leftArrow} alt="Previous" className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute -right-12 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 rounded-full p-2 hover:bg-black/70 transition"
          >
            <img src={rightArrow} alt="Next" className="w-6 h-6" />
          </button>

          {/* Cards Container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {collectionsData.slice(currentIndex, currentIndex + 3).map((collection, index) => {
              const progress = collection && collection.maxSupply ? Math.min(100, Math.round((collection.minted / collection.maxSupply) * 100)) : 0;
              const displayPrice = collection.activePhase ? collection.activePhase.price : '0';
              
              // Get wallet limit from contract data
              const getWalletLimit = () => {
                if (!collection.activePhase) return 0;
                
                // Find phase index to get contract limit
                const phases = collection.phases || collection.metadata?.phases || {};
                const phaseEntries = Object.entries(phases);
                const activePhaseIndex = phaseEntries.findIndex(([, phase]) => {
                  const startTime = Number(phase.start);
                  const endTime = Number(phase.end);
                  const now = Math.floor(Date.now() / 1000);
                  return startTime <= now && now <= endTime;
                });
                
                if (activePhaseIndex >= 0) {
                  const key = `${collection.address}_${activePhaseIndex}`;
                  return contractPhaseLimits[key] ?? collection.activePhase.maxPerWallet ?? 0;
                }
                
                return collection.activePhase.maxPerWallet ?? 0;
              };
              
              const walletLimit = getWalletLimit();
              const userMintedCount = userMintedCounts[collection.address] || 0;
              const isWalletLimitReached = walletLimit > 0 && userMintedCount >= walletLimit;
              
              return (
                <div 
                  key={collection.address}
                  className="bg-[#111] p-8 rounded-2xl text-white shadow-lg border border-zinc-800/50 h-[650px] flex flex-col"
                >
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

                  {/* Collection Info - фиксированная высота */}
                  <div className="flex justify-between items-start mb-3 flex-shrink-0 h-[72px]">
                    <div className="flex-1 mr-2">
                      <TruncatedTitle 
                        text={collection.name} 
                        onClick={() => navigate(`/launchpad/collection/${collection.address}`)}
                      />
                    </div>
                    <span className="text-blue-400 text-2xl flex-shrink-0">✔</span>
                  </div>
                  
                  {/* Subtitle - фиксированная высота */}
                  <div className="mb-3 flex-shrink-0 h-[72px]">
                    <TruncatedText 
                      text={collection.description} 
                      className="text-base text-gray-400"
                    />
                  </div>

                  {/* Supply and Price - фиксированная высота */}
                  <div className="flex justify-between text-base text-gray-300 mb-3 flex-shrink-0 h-6">
                    <span>Supply: {collection.minted} / {collection.maxSupply}</span>
                    <span className="flex items-center gap-1">
                      Price: 
                      <img src={somniaLogo} alt="STT" className="w-4 h-4" />
                      {displayPrice} STT
                    </span>
                  </div>

                  {/* Progress Bar - фиксированная высота */}
                  <div className="w-full h-3 bg-zinc-800 rounded-full mb-4 overflow-hidden flex-shrink-0">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-pink-500" style={{ width: `${progress}%` }} />
                  </div>

                  {/* Timer - фиксированная высота */}
                  <div className="mb-4 flex-shrink-0 h-6">
                    {collection.activePhase && (
                      <p className="text-base text-pink-400">
                        Ends in: {formatTimeLeft(Number(collection.activePhase.end) * 1000)}
                      </p>
                    )}
                  </div>

                  {/* Mint Button - фиксированная высота */}
                  <div className="mt-auto flex-shrink-0">
                    {/* Queue indicator for high traffic - only show if there's a real queue */}
                    {mintQueue.length > 1 && (
                      <div className="mb-2 text-center">
                        <p className="text-sm text-yellow-400">
                          ⏳ Queue: {mintQueue.length} pending
                        </p>
                        {mintMetrics.totalRequests > 0 && (
                          <p className="text-xs text-green-400">
                            Success Rate: {Math.round((mintMetrics.successfulMints / mintMetrics.totalRequests) * 100)}%
                          </p>
                        )}
                        {/* Show queue progress */}
                        <div className="mt-1">
                          <div className="w-full bg-zinc-800 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.min(100, (mintMetrics.successfulMints / Math.max(mintMetrics.totalRequests, 1)) * 100)}%` 
                              }}
                            />
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">
                            Progress: {Math.round((mintMetrics.successfulMints / Math.max(mintMetrics.totalRequests, 1)) * 100)}%
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Hot sale indicator */}
                    {mintQueue.length > 20 && (
                      <div className="mb-2 text-center">
                        <p className="text-sm text-red-400 animate-pulse">
                          🔥 HOT SALE - High demand detected!
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={() => openMintModal(collection)}
                      disabled={
                        !collection.activePhase || 
                        !collection.activePhase.isPublic || 
                        collection.minted >= collection.maxSupply || 
                        isMinting || 
                        processingQueue ||
                        isWalletLimitReached
                      }
                      className={`w-full py-[10px] rounded-lg font-semibold text-white transition-all duration-200 ${
                        isMinting || processingQueue
                          ? 'bg-zinc-600 text-zinc-300 cursor-not-allowed'
                          : collection.minted >= collection.maxSupply || isWalletLimitReached
                            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                            : collection.activePhase && collection.activePhase.isPublic
                              ? 'bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] hover:opacity-90 shadow-md'
                              : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                      }`}
                    >
                      {isMinting || processingQueue
                        ? '⏳ Processing...'
                        : collection.minted >= collection.maxSupply || isWalletLimitReached
                          ? 'Minted'
                          : collection.activePhase && collection.activePhase.isPublic 
                            ? `Mint for ${displayPrice} STT` 
                            : collection.activePhase && !collection.activePhase.isPublic
                              ? 'Whitelist Only'
                              : 'No active phase'
                      }
                    </button>

                    {/* Status messages */}
                    {collection.minted >= collection.maxSupply && (
                      <div className="mt-2 text-center">
                        <p className="text-sm text-red-400">
                          Collection is sold out!
                        </p>
                      </div>
                    )}
                    {isWalletLimitReached && collection.minted < collection.maxSupply && (
                      <div className="mt-2 text-center">
                        <p className="text-sm text-yellow-400">
                          Wallet limit reached ({userMintedCount}/{walletLimit === 0 ? '∞' : walletLimit})
                        </p>
                      </div>
                    )}
                    {walletLimit === 0 && (
                      <div className="mt-2 text-center">
                        <p className="text-sm text-blue-400">
                          Unlimited minting per wallet
                        </p>
                      </div>
                    )}

                    {/* View Contract Link */}
                    <a 
                      href={`https://shannon-explorer.somnia.network/address/${collection.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 underline mt-4 block text-center hover:text-blue-300 transition-colors"
                    >
                      View Contract
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Somnia Rewards Block */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Somnia Rewards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 p-6 rounded-lg">
              <div className="text-2xl font-bold text-white mb-2">USDC</div>
              <div className="text-white text-sm">from Somnia Network</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 p-6 rounded-lg">
              <div className="text-2xl font-bold text-white mb-2">Karma Points</div>
              <div className="text-white text-sm">from dreava.art</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 p-6 rounded-lg">
              <div className="text-2xl font-bold text-white mb-2">Roles on Discord</div>
              <div className="text-white text-sm">from dreava.art</div>
            </div>
          </div>
        </div>

        {/* How to Join the Quest Block */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">How to Join the Quest:</h2>
          <div className="bg-black/40 border border-white/10 rounded-lg p-8">
            <ul className="text-left space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-white">Follow Somnia and Dreava.art on Discord and Twitter</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-white">Animate your unique PFP — creativity is highly encouraged</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-white">Upload your animated NFT to the Dreava.art launchpad</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mint Modal */}
      {showMintModal && selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-700">
              <h3 className="text-xl font-bold text-white">Mint NFT</h3>
              <button
                onClick={closeMintModal}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Collection Info */}
              <div className="flex items-center gap-4 mb-6">
                <img 
                  src={selectedCollection.cover} 
                  alt={selectedCollection.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <h4 className="text-lg font-semibold text-white">{selectedCollection.name}</h4>
                  <p className="text-sm text-zinc-400">
                    {selectedCollection.minted} / {selectedCollection.maxSupply} minted
                  </p>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Quantity
                </label>
                <div className="flex items-center justify-between bg-zinc-800 rounded-lg p-3">
                  <button
                    onClick={() => handleQuantityChange(mintQuantity - 1)}
                    disabled={mintQuantity <= 1}
                    className="w-10 h-10 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-xl font-bold text-white px-4">{mintQuantity}</span>
                  <button
                    onClick={() => handleQuantityChange(mintQuantity + 1)}
                    disabled={mintQuantity >= getMaxQuantity(selectedCollection)}
                    className="w-10 h-10 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Max: {getMaxQuantity(selectedCollection)} per transaction
                </p>
              </div>

              {/* Price Info */}
              <div className="bg-zinc-800 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-400">Price per NFT:</span>
                  <div className="flex items-center gap-2">
                    <img src={somniaLogo} alt="STT" className="w-5 h-5" />
                    <span className="font-semibold text-white">
                      {selectedCollection.activePhase?.price || '0'} STT
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-400">Quantity:</span>
                  <span className="text-white">{mintQuantity}</span>
                </div>
                <div className="border-t border-zinc-700 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">Total:</span>
                    <div className="flex items-center gap-2">
                      <img src={somniaLogo} alt="STT" className="w-6 h-6" />
                      <span className="text-xl font-bold text-white">{totalPrice} STT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mint Button */}
              <button
                onClick={handleMintFromModal}
                disabled={isMinting}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isMinting ? '⏳ Processing...' : `Mint ${mintQuantity} NFT${mintQuantity > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Connect Modal */}
      {showWalletConnect && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full animate-fadeIn">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Connect Wallet</h3>
              <p className="text-zinc-400 mb-6">
                Please connect your wallet to mint NFTs
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWalletConnect(false)}
                  className="flex-1 py-2 px-4 rounded-lg bg-zinc-700 text-white hover:bg-zinc-600 transition-colors"
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
                  className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-all duration-200"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.visible && (
        <div className="fixed bottom-20 right-4 bg-zinc-800 text-white p-4 rounded-lg shadow-lg max-w-xs animate-fadeIn cursor-pointer hover:opacity-100 opacity-90">
          <p className="text-sm mb-1">{toast.message}</p>
          {toast.txHash && (
            <a
              href={`https://shannon-explorer.somnia.network/tx/${toast.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1 text-sm"
            >
              <ExternalLink size={16} />
              View Transaction
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default SomniaQuest; 