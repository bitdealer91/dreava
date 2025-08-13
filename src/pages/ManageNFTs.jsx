import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

const EditNFTs = () => {
  const { address } = useParams();
  const navigate = useNavigate();
  const [nfts, setNfts] = useState([]);
  const [phases, setPhases] = useState({});
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState('all');
  const [distributionMode, setDistributionMode] = useState('auto'); // 'auto' | 'manual'
  const [collectionStats, setCollectionStats] = useState({
    totalSupply: 0,
    minted: 0,
    remaining: 0,
    revenue: "0 STT",
    phaseBreakdown: [],
    blockchainStats: null
  });
  const [isCollectionLaunched, setIsCollectionLaunched] = useState(false);
  const [isLoadingLaunchStatus, setIsLoadingLaunchStatus] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showNFTDetails, setShowNFTDetails] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nftToDelete, setNftToDelete] = useState(null);

  // Функция автоматического распределения NFT по фазам
  const autoDistributeNFTs = (nfts, phases) => {
    if (!nfts.length || !phases) return nfts;
    
    console.log('🔄 Starting auto-distribution with:', {
      totalNFTs: nfts.length,
      phases: Object.keys(phases),
      phaseAllocations: Object.entries(phases).map(([key, phase]) => ({
        key,
        allocated: phase.allocated || 0,
        active: phase.active
      }))
    });
    
    let currentIndex = 0;
    const updatedNFTs = [...nfts];
    
    // Проходим по всем фазам в порядке приоритета
    const phaseOrder = ['Whitelist', 'FCFS', 'Public'];
    
    for (const phaseKey of phaseOrder) {
      const phase = phases[phaseKey];
      if (!phase || !phase.active) {
        console.log(`⏭️ Skipping ${phaseKey} - not active or not found`);
        continue;
      }
      
      const allocated = phase.allocated || 0;
      console.log(`📊 Processing ${phaseKey}: allocated ${allocated} NFTs, starting from index ${currentIndex}`);
      
      // Распределяем NFT для этой фазы
      for (let i = 0; i < allocated && currentIndex < updatedNFTs.length; i++) {
        const nft = updatedNFTs[currentIndex];
        if (nft) {
          updatedNFTs[currentIndex] = {
            ...nft,
            phaseKey,
            price: phase.price || 0,
            distributionType: 'auto',
            originalIndex: currentIndex
          };
          console.log(`✅ Assigned NFT ${currentIndex} (${nft.name}) to ${phaseKey} phase`);
        }
        currentIndex++;
      }
    }
    
    // Оставшиеся NFT помечаем как нераспределенные
    for (let i = currentIndex; i < updatedNFTs.length; i++) {
      const nft = updatedNFTs[i];
      if (nft) {
        updatedNFTs[i] = {
          ...nft,
          phaseKey: 'unassigned',
          price: 0,
          distributionType: 'auto',
          originalIndex: i
        };
        console.log(`⚠️ NFT ${i} (${nft.name}) marked as unassigned`);
      }
    }
    
    console.log('🎉 Auto-distribution complete. Summary:', {
      totalProcessed: updatedNFTs.length,
      byPhase: Object.entries(phases).reduce((acc, [key, phase]) => {
        acc[key] = updatedNFTs.filter(nft => nft.phaseKey === key).length;
        return acc;
      }, {}),
      unassigned: updatedNFTs.filter(nft => nft.phaseKey === 'unassigned').length
    });
    
    return updatedNFTs;
  };

  // Функция проверки корректности распределения
  const validateDistribution = (nfts, phases) => {
    const totalAllocated = Object.values(phases).reduce((sum, phase) => sum + (phase.allocated || 0), 0);
    const totalNFTs = nfts.length;
    const assignedNFTs = nfts.filter(nft => nft.phaseKey !== 'unassigned').length;
    
    console.log('🔍 Distribution validation:', {
      totalNFTs,
      totalAllocated,
      assignedNFTs,
      unassigned: totalNFTs - assignedNFTs,
      phases: Object.entries(phases).map(([key, phase]) => ({
        key,
        allocated: phase.allocated || 0,
        actual: nfts.filter(nft => nft.phaseKey === key).length
      }))
    });
    
    if (totalAllocated !== assignedNFTs) {
      console.warn('⚠️ Distribution mismatch detected!');
      console.warn(`Expected ${totalAllocated} assigned NFTs, but found ${assignedNFTs}`);
    }
    
    return {
      isValid: totalAllocated === assignedNFTs,
      totalNFTs,
      totalAllocated,
      assignedNFTs,
      unassigned: totalNFTs - assignedNFTs
    };
  };

  // Функция пересчета статистики
  const calculateCollectionStats = async (nfts, phases) => {
    const totalSupply = nfts.length;
    
    // Получаем реальные данные из блокчейна
    const blockchainStats = await fetchBlockchainStats();
    const minted = blockchainStats ? blockchainStats.totalSupply : 0;
    const remaining = totalSupply - minted;
    const currentPhase = blockchainStats ? blockchainStats.currentPhase : 0;
    
    // Получаем данные о профите
    const profitData = await calculateTotalProfit();
    
    // Подсчет по фазам
    const phaseBreakdown = Object.entries(phases).map(([key, phase]) => {
      const phaseNFTs = nfts.filter(nft => nft.phaseKey === key);
      const revenue = phaseNFTs.length * (phase.price || 0);
      
      return {
        name: key,
        allocated: phase.allocated || 0,
        actual: phaseNFTs.length,
        price: phase.price || 0,
        revenue: revenue,
        percentage: totalSupply > 0 ? (phaseNFTs.length / totalSupply) * 100 : 0
      };
    });
    
    const totalRevenue = phaseBreakdown.reduce((sum, phase) => sum + phase.revenue, 0);
    
    // Проверяем корректность распределения
    const validation = validateDistribution(nfts, phases);
    
    return {
      totalSupply,
      minted,
      remaining,
      currentPhase,
      revenue: `${totalRevenue} STT`,
      phaseBreakdown,
      validation,
      blockchainStats,
      profitData
    };
  };

  // Получение цвета для фазы
  const getPhaseColor = (phaseKey) => {
    switch (phaseKey) {
      case 'Whitelist': return 'border-blue-500 bg-blue-50';
      case 'FCFS': return 'border-purple-500 bg-purple-50';
      case 'Public': return 'border-pink-500 bg-pink-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getIpfsUrls = (url) => {
    if (!url) return [];
    if (url.startsWith('ipfs://')) {
      const cid = url.replace('ipfs://', '');
      return [
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
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

  useEffect(() => {
    const fetchNFTs = async () => {
      console.log('🔍 Fetching NFTs for collection:', address);
      
      const storedNFTs = JSON.parse(localStorage.getItem(`collection_${address}_nfts`)) || [];
      console.log('📦 Found stored NFTs:', storedNFTs.length);
      
      if (storedNFTs.length === 0) {
        console.log('⚠️ No NFTs found in localStorage for collection:', address);
        setNfts([]);
        return;
      }
      
      console.log('🖼️ Processing NFT images...');
      
      const updatedNFTs = await Promise.all(
        storedNFTs.map(async (nft, index) => {
          console.log(`📝 Processing NFT ${index + 1}/${storedNFTs.length}:`, nft.name);
          
          try {
            if (nft.image?.startsWith('ipfs://')) {
              console.log(`🔄 Converting IPFS image for ${nft.name}`);
              return {
                ...nft,
                image: getIpfsUrls(nft.image)[0]
              };
            }
            
            if (!nft.image && nft.tokenURI) {
              console.log(`🔄 Fetching metadata for ${nft.name} from tokenURI`);
              try {
                const urls = getIpfsUrls(nft.tokenURI);
                const metadata = await fetchWithFallback(urls);
                console.log(`✅ Metadata fetched for ${nft.name}:`, metadata.name);
                return {
                  ...nft,
                  image: metadata.image ? getIpfsUrls(metadata.image)[0] : nft.image
                };
              } catch (err) {
                console.error(`❌ Failed to fetch metadata for ${nft.name}:`, err.message);
                return nft;
              }
            }
            
            console.log(`✅ NFT ${nft.name} processed successfully`);
            return nft;
          } catch (err) {
            console.error(`❌ Error processing NFT ${nft.name}:`, err);
            return nft;
          }
        })
      );
      
      console.log('🎉 All NFTs processed. Setting state with:', updatedNFTs.length, 'NFTs');
      setNfts(updatedNFTs);
      localStorage.setItem(`collection_${address}_nfts`, JSON.stringify(updatedNFTs));
    };

    fetchNFTs();

    // Загружаем фазы
    const storedPhases = JSON.parse(localStorage.getItem(`phases_${address}`)) || {};
    console.log('📋 Found phases:', storedPhases);
    setPhases(storedPhases);

    // Проверяем статус запуска коллекции
    checkCollectionLaunchStatus();
  }, [address]);

  // Автоматическое распределение при изменении фаз или NFT
  useEffect(() => {
    const updateStats = async () => {
      if (nfts.length > 0 && Object.keys(phases).length > 0) {
        console.log('🔄 Auto-distributing NFTs based on phases...');
        const distributedNFTs = autoDistributeNFTs(nfts, phases);
        setNfts(distributedNFTs);
        localStorage.setItem(`collection_${address}_nfts`, JSON.stringify(distributedNFTs));
        
        // Обновляем статистику
        const stats = await calculateCollectionStats(distributedNFTs, phases);
        setCollectionStats(stats);
      }
    };
    
    updateStats();
  }, [phases, address]);

  const toggleSelect = (index) => {
    setSelected((prev) => prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]);
  };

  const handleAutoDistribute = async () => {
    console.log('🔄 Re-running auto-distribution...');
    const distributedNFTs = autoDistributeNFTs(nfts, phases);
    setNfts(distributedNFTs);
    localStorage.setItem(`collection_${address}_nfts`, JSON.stringify(distributedNFTs));
    
    const stats = await calculateCollectionStats(distributedNFTs, phases);
    setCollectionStats(stats);
    
    if (stats.validation.isValid) {
      alert('✅ Auto-distribution complete. All NFTs properly assigned to phases.');
    } else {
      alert(`⚠️ Auto-distribution complete, but ${stats.validation.unassigned} NFTs remain unassigned. Check your phase allocations.`);
    }
  };

  const handleDeleteNFT = (index) => {
    const updated = nfts.filter((_, i) => i !== index);
    setNfts(updated);
    localStorage.setItem(`collection_${address}_nfts`, JSON.stringify(updated));
    setShowDeleteConfirm(false);
    setNftToDelete(null);
  };

  const handlePreview = () => {
    navigate(`/preview/${address}`);
  };

  // Функция проверки статуса запуска коллекции
  const checkCollectionLaunchStatus = async () => {
    try {
      setIsLoadingLaunchStatus(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(address, [
        'function contractURI() public view returns (string)',
        'function baseTokenURI() public view returns (string)',
        'function maxSupply() public view returns (uint256)',
        'function phases(uint256) public view returns (uint256 start, uint256 end, uint256 price, uint256 maxPerWallet, bytes32 merkleRoot, bool isPublic)',
        'function phases(uint256) public view returns (tuple(uint256,uint256,uint256,uint256,bytes32,bool))'
      ], provider);

      // Проверяем, есть ли contractURI (признак запуска)
      const contractURI = await contract.contractURI();
      const baseTokenURI = await contract.baseTokenURI();
      const maxSupply = await contract.maxSupply();
      
      // Если есть contractURI и baseTokenURI, коллекция запущена
      const isLaunched = contractURI && contractURI !== '' && baseTokenURI && baseTokenURI !== '';
      
      console.log('🔍 Collection launch status check:', {
        address,
        contractURI: contractURI || 'empty',
        baseTokenURI: baseTokenURI || 'empty',
        maxSupply: maxSupply.toString(),
        isLaunched
      });
      
      setIsCollectionLaunched(isLaunched);
      return isLaunched;
    } catch (error) {
      console.error('❌ Error checking collection launch status:', error);
      // Если не можем проверить, считаем что коллекция не запущена
      setIsCollectionLaunched(false);
      return false;
    } finally {
      setIsLoadingLaunchStatus(false);
    }
  };

  // Функция получения реальных данных о минтинге из блокчейна
  const fetchBlockchainStats = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(address, [
        'function totalSupply() public view returns (uint256)',
        'function maxSupply() public view returns (uint256)',
        'function phases(uint256) public view returns (uint256 start, uint256 end, uint256 price, uint256 maxPerWallet, bytes32 merkleRoot, bool isPublic)',
        'function mintedPerWallet(address, uint256) public view returns (uint256)',
        'function currentPhase() public view returns (uint256)',
        'function owner() public view returns (address)',
        'function balanceOf(address) public view returns (uint256)'
      ], provider);

      // Получаем реальные данные из контракта
      const totalSupply = await contract.totalSupply();
      const maxSupply = await contract.maxSupply();
      
      // Получаем данные о фазах и определяем текущую активную фазу
      const phaseCount = 3; // Whitelist, FCFS, Public
      const phaseStats = [];
      let currentActivePhase = -1;
      const currentTime = Math.floor(Date.now() / 1000);
      
      for (let i = 0; i < phaseCount; i++) {
        try {
          const phase = await contract.phases(i);
          const phaseData = {
            phaseId: i,
            start: Number(phase.start),
            end: Number(phase.end),
            price: ethers.formatUnits(phase.price, 18),
            maxPerWallet: Number(phase.maxPerWallet),
            isPublic: phase.isPublic,
            merkleRoot: phase.merkleRoot,
            isActive: currentTime >= Number(phase.start) && currentTime <= Number(phase.end)
          };
          
          phaseStats.push(phaseData);
          
          // Определяем текущую активную фазу
          if (phaseData.isActive) {
            currentActivePhase = i;
          }
        } catch (error) {
          console.log(`Phase ${i} not found or not accessible`);
        }
      }

      // Если нет активной фазы, ищем ближайшую будущую
      if (currentActivePhase === -1) {
        for (let i = 0; i < phaseStats.length; i++) {
          if (currentTime < phaseStats[i].start) {
            currentActivePhase = i;
            break;
          }
        }
      }

      console.log('🔗 Blockchain stats fetched:', {
        totalSupply: totalSupply.toString(),
        maxSupply: maxSupply.toString(),
        currentActivePhase,
        currentTime,
        phaseStats: phaseStats.map(p => ({
          phaseId: p.phaseId,
          start: new Date(p.start * 1000).toISOString(),
          end: new Date(p.end * 1000).toISOString(),
          isActive: p.isActive,
          price: p.price
        }))
      });

      return {
        totalSupply: Number(totalSupply),
        maxSupply: Number(maxSupply),
        remaining: Number(maxSupply) - Number(totalSupply),
        currentPhase: currentActivePhase,
        phaseStats
      };
    } catch (error) {
      console.error('❌ Error fetching blockchain stats:', error);
      return null;
    }
  };

  // Функция подсчета общего профита
  const calculateTotalProfit = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(address, [
        'function totalSupply() public view returns (uint256)',
        'function phases(uint256) public view returns (uint256 start, uint256 end, uint256 price, uint256 maxPerWallet, bytes32 merkleRoot, bool isPublic)',
        'function mintedPerWallet(address, uint256) public view returns (uint256)'
      ], provider);

      const totalSupply = await contract.totalSupply();
      const mintedCount = Number(totalSupply);
      
      if (mintedCount === 0) {
        return {
          totalProfit: 0,
          profitInSTT: "0 STT",
          profitInUSD: "$0",
          averagePrice: 0
        };
      }

      // Получаем цены фаз
      const phasePrices = [];
      const phaseCount = 3;
      
      for (let i = 0; i < phaseCount; i++) {
        try {
          const phase = await contract.phases(i);
          phasePrices.push({
            phaseId: i,
            price: ethers.formatUnits(phase.price, 18)
          });
        } catch (error) {
          console.log(`Phase ${i} not accessible`);
        }
      }

      // Для упрощения считаем среднюю цену
      // В реальности нужно отслеживать, в какой фазе был сминчен каждый NFT
      const averagePrice = phasePrices.length > 0 
        ? phasePrices.reduce((sum, p) => sum + parseFloat(p.price), 0) / phasePrices.length
        : 0;

      const totalProfit = mintedCount * averagePrice;
      
      // Примерный курс STT к USD (можно заменить на реальный API)
      const sttToUsd = 0.1; // 1 STT = $0.1 (примерно)
      const profitInUSD = totalProfit * sttToUsd;

      console.log('💰 Profit calculation:', {
        mintedCount,
        averagePrice,
        totalProfit,
        profitInUSD,
        phasePrices
      });

      return {
        totalProfit,
        profitInSTT: `${totalProfit.toFixed(2)} STT`,
        profitInUSD: `$${profitInUSD.toFixed(2)}`,
        averagePrice,
        mintedCount
      };
    } catch (error) {
      console.error('❌ Error calculating profit:', error);
      return {
        totalProfit: 0,
        profitInSTT: "0 STT",
        profitInUSD: "$0",
        averagePrice: 0,
        mintedCount: 0
      };
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm"
        >
          Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const stats = await calculateCollectionStats(nfts, phases);
              setCollectionStats(stats);
            }}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm"
          >
            Reveal
          </button>
          <button
            onClick={handlePreview}
            className="px-4 py-2 rounded bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 text-sm"
          >
            Preview Storefront
          </button>
        </div>
      </div>

      {/* Collection Launch Status */}
      {isLoadingLaunchStatus ? (
        <div className="mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-700">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-zinc-400">Checking collection status...</span>
          </div>
        </div>
      ) : isCollectionLaunched ? (
        <div className="mb-6 p-4 bg-yellow-900/20 rounded-lg border border-yellow-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <span className="text-yellow-400 font-semibold">Collection Already Launched</span>
          </div>
          <div className="text-sm text-yellow-300">
            <p>This collection has been launched and is now live. NFT distribution cannot be changed as it affects the minting process.</p>
            <p className="mt-2">• NFT phases are locked to prevent minting conflicts</p>
            <p>• Only viewing and analytics are available</p>
            <p>• To make changes, you would need to create a new collection</p>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400 text-lg">📝</span>
            <span className="text-blue-400 font-semibold">Collection Not Launched</span>
          </div>
          <div className="text-sm text-blue-300">
            <p>You can still configure NFT distribution and phases before launching the collection.</p>
            <p className="mt-2">• NFT distribution is automatically updated when you change phase settings</p>
            <p>• Edit individual NFT metadata (name, description, image)</p>
            <p>• Configure phase settings (prices, allocations, timing)</p>
            <p>• Once launched, NFT distribution becomes locked</p>
          </div>
        </div>
      )}

      {/* Unified Analytics Section */}
      <div className={`mb-6 rounded-lg border ${
        showAnalytics 
          ? 'bg-purple-900/10 border-purple-500 shadow-purple-500/20' 
          : 'bg-zinc-800 border-zinc-600'
      }`}>
        {/* Header - Always Visible and Clickable */}
        <div 
          onClick={() => setShowAnalytics(!showAnalytics)}
          className={`p-4 border-b border-zinc-700/50 cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-lg ${
            showAnalytics 
              ? 'hover:bg-purple-900/20' 
              : 'hover:bg-zinc-700 hover:border-zinc-500'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-zinc-400">Total NFTs:</span>
                <span className="text-white font-semibold ml-1">{nfts.length}</span>
              </div>
              <div>
                <span className="text-zinc-400">Assigned:</span>
                <span className="text-green-400 font-semibold ml-1">
                  {nfts.filter(nft => nft.phaseKey !== 'unassigned').length}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">Unassigned:</span>
                <span className="text-red-400 font-semibold ml-1">
                  {nfts.filter(nft => nft.phaseKey === 'unassigned').length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-400">Status:</span>
                {collectionStats.validation?.isValid ? (
                  <span className="text-green-400 text-xs">✅ Complete</span>
                ) : (
                  <span className="text-yellow-400 text-xs">⚠️ Incomplete</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-zinc-500">
                {showAnalytics ? 'Click to hide detailed analytics' : 'Click to show detailed analytics'}
              </div>
              <span className={`text-xs transition-transform duration-200 ${showAnalytics ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </div>
          </div>
        </div>

        {/* Expandable Content - Not Clickable */}
        {showAnalytics && (
          <div className="p-4 animate-slideDown">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Detailed Analytics</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {collectionStats.blockchainStats ? '🔗 Live blockchain data' : '📱 Local data'}
                </span>
                <span className="text-xs text-zinc-400">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            {/* Distribution Status */}
            {collectionStats.validation && (
              <div className={`mb-4 p-3 rounded-lg border ${
                collectionStats.validation.isValid 
                  ? 'bg-green-900/20 border-green-500' 
                  : 'bg-red-900/20 border-red-500'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-semibold ${
                    collectionStats.validation.isValid ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {collectionStats.validation.isValid ? '✅' : '⚠️'} Distribution Status
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  <div>Total NFTs: {collectionStats.validation.totalNFTs}</div>
                  <div>Allocated: {collectionStats.validation.assignedNFTs}</div>
                  <div>Unassigned: {collectionStats.validation.unassigned}</div>
                  {!collectionStats.validation.isValid && (
                    <div className="text-red-400 mt-1">
                      ⚠️ Distribution mismatch! Some NFTs are not properly assigned to phases.
                    </div>
                  )}
                </div>
                
                {/* Collection Quality Score */}
                <div className="mt-3 pt-3 border-t border-zinc-700/50">
                  <div className="text-xs text-zinc-400 mb-2">Collection Quality Score:</div>
                  {(() => {
                    const totalNFTs = nfts.length;
                    const withDescription = nfts.filter(nft => nft.description).length;
                    const withAttributes = nfts.filter(nft => nft.attributes?.length > 0).length;
                    const assigned = nfts.filter(nft => nft.phaseKey && nft.phaseKey !== 'unassigned').length;
                    
                    const qualityScore = Math.round(
                      ((withDescription / totalNFTs) * 0.3 + 
                       (withAttributes / totalNFTs) * 0.4 + 
                       (assigned / totalNFTs) * 0.3) * 100
                    );
                    
                    const getQualityColor = (score) => {
                      if (score >= 80) return 'text-green-400';
                      if (score >= 60) return 'text-yellow-400';
                      return 'text-red-400';
                    };
                    
                    return (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${getQualityColor(qualityScore)}`}>
                          {qualityScore}/100
                        </span>
                        <div className="flex-1 bg-zinc-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              qualityScore >= 80 ? 'bg-green-500' : 
                              qualityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${qualityScore}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {qualityScore >= 80 ? 'Excellent' : 
                           qualityScore >= 60 ? 'Good' : 'Needs Work'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Phase Information */}
                {collectionStats.blockchainStats?.phaseStats && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/50">
                    <div className="text-xs text-zinc-400 mb-2">Blockchain Phase Status:</div>
                    {collectionStats.blockchainStats.phaseStats.map((phase, index) => (
                      <div key={index} className="text-xs text-zinc-400 mb-1">
                        <span className={`font-semibold ${
                          phase.isActive ? 'text-green-400' : 'text-zinc-500'
                        }`}>
                          Phase {phase.phaseId} ({index === 0 ? 'Whitelist' : index === 1 ? 'FCFS' : 'Public'}):
                        </span>
                        <span className="ml-2">
                          {phase.isActive ? '🟢 Active' : '⚪ Inactive'} | 
                          Price: {phase.price} STT | 
                          {new Date(phase.start * 1000).toLocaleDateString()} - {new Date(phase.end * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm mb-4">
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <div className="text-zinc-400 mb-1">Total Supply</div>
                <div className="text-xl font-bold text-blue-400">{collectionStats.totalSupply}</div>
                <div className="text-xs text-zinc-500">Max: {collectionStats.blockchainStats?.maxSupply || 'N/A'}</div>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <div className="text-zinc-400 mb-1">Minted</div>
                <div className="text-xl font-bold text-green-400">{collectionStats.minted}</div>
                <div className="text-xs text-zinc-500">
                  {collectionStats.totalSupply > 0 ? ((collectionStats.minted / collectionStats.totalSupply) * 100).toFixed(1) : 0}% sold
                </div>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <div className="text-zinc-400 mb-1">Remaining</div>
                <div className="text-xl font-bold text-pink-400">{collectionStats.remaining}</div>
                <div className="text-xs text-zinc-500">Available to mint</div>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <div className="text-zinc-400 mb-1">Current Phase</div>
                <div className="text-xl font-bold text-yellow-400">
                  {collectionStats.currentPhase === 0 ? 'Whitelist' : 
                   collectionStats.currentPhase === 1 ? 'FCFS' : 
                   collectionStats.currentPhase === 2 ? 'Public' : 
                   collectionStats.currentPhase === -1 ? 'None' : 'N/A'}
                </div>
                <div className="text-xs text-zinc-500">
                  {collectionStats.currentPhase >= 0 ? `Phase ${collectionStats.currentPhase}` : 'No active phase'}
                </div>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <div className="text-zinc-400 mb-1">Total Profit</div>
                <div className="text-xl font-bold text-emerald-400">
                  {collectionStats.profitData?.profitInSTT || '0 STT'}
                </div>
                <div className="text-xs text-zinc-500">
                  {collectionStats.profitData?.profitInUSD || '$0'}
                </div>
              </div>
            </div>
            
            {/* Phase Breakdown */}
            <div>
              <h4 className="text-md font-semibold mb-2 text-white">Phase Distribution</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {collectionStats.phaseBreakdown.map((phase) => (
                  <div key={phase.name} className="p-3 bg-zinc-800 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-white">{phase.name}</span>
                      <span className="text-sm text-zinc-400">{phase.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="text-sm text-zinc-400">
                      {phase.actual} / {phase.allocated} NFTs
                    </div>
                    <div className="text-sm text-zinc-400">
                      {phase.price} STT each
                    </div>
                    <div className="text-sm text-green-400 font-semibold">
                      {phase.revenue} STT total
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-zinc-700' : 'bg-zinc-800'} text-sm`}
        >
          All ({nfts.length})
        </button>
        <button
          onClick={() => setFilter('Whitelist')}
          className={`px-4 py-2 rounded ${filter === 'Whitelist' ? 'bg-blue-600' : 'bg-zinc-800'} text-sm`}
        >
          Whitelist ({nfts.filter(nft => nft.phaseKey === 'Whitelist').length})
        </button>
        <button
          onClick={() => setFilter('FCFS')}
          className={`px-4 py-2 rounded ${filter === 'FCFS' ? 'bg-purple-600' : 'bg-zinc-800'} text-sm`}
        >
          FCFS ({nfts.filter(nft => nft.phaseKey === 'FCFS').length})
        </button>
        <button
          onClick={() => setFilter('Public')}
          className={`px-4 py-2 rounded ${filter === 'Public' ? 'bg-pink-600' : 'bg-zinc-800'} text-sm`}
        >
          Public ({nfts.filter(nft => nft.phaseKey === 'Public').length})
        </button>
        <button
          onClick={() => setFilter('unassigned')}
          className={`px-4 py-2 rounded ${filter === 'unassigned' ? 'bg-gray-600' : 'bg-zinc-800'} text-sm`}
        >
          Unassigned ({nfts.filter(nft => nft.phaseKey === 'unassigned').length})
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {nfts.map((nft, actualIndex) => {
          // Пропускаем NFT которые не соответствуют фильтру
          if (filter !== 'all' && nft.phaseKey !== filter) {
            return null;
          }
          
          return (
            <div key={nft.id} className={`relative bg-zinc-900 rounded-xl border-2 p-3 ${getPhaseColor(nft.phaseKey)}`}>
              <img src={nft.image?.replace('ipfs://', 'https://ipfs.io/ipfs/')} alt={nft.name} className="rounded mb-2 w-full h-40 object-cover" />
              <h3 className="text-sm font-semibold mb-1">{nft.name}</h3>
              
              {/* Отображение фазы - только для показа */}
              <div className="mb-2">
                <div className="text-xs text-zinc-400 mb-1">
                  <span className="font-semibold">Phase:</span> {nft.phaseKey || 'Unassigned'}
                </div>
                <div className="text-xs text-zinc-400 mb-1">
                  <span className="font-semibold">Price:</span> {nft.price || 0} STT
                </div>
                <div className="text-xs text-zinc-400 mb-1">
                  <span className="font-semibold">Type:</span> {nft.distributionType || 'auto'}
                </div>
                <div className="text-xs text-zinc-500 mb-2">
                  <span className="font-semibold">Index:</span> {actualIndex}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelectedNFT(nft);
                      setShowNFTDetails(true);
                    }}
                    className="px-2 py-1 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white"
                    title="View NFT details"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => {
                      setNftToDelete({ nft, index: actualIndex });
                      setShowDeleteConfirm(true);
                    }}
                    disabled={isCollectionLaunched}
                    className={`px-2 py-1 rounded text-xs text-white ${
                      isCollectionLaunched
                        ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-500'
                    }`}
                    title="Delete NFT from collection"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* NFT Details Modal */}
      {showNFTDetails && selectedNFT && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-zinc-900 p-6 rounded-xl shadow-lg max-w-md w-full text-center animate-fadeIn relative">
            <button
              className="absolute top-2 right-2 text-zinc-400 hover:text-red-400"
              onClick={() => setShowNFTDetails(false)}
            >
              ✕
            </button>
            
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#FF0080] to-[#00A3FF] bg-clip-text text-transparent">
              NFT Details
            </h3>
            
            <div className="mb-4">
              <img 
                src={selectedNFT.image?.replace('ipfs://', 'https://ipfs.io/ipfs/')} 
                alt={selectedNFT.name} 
                className="w-32 h-32 object-cover rounded-lg mx-auto mb-3"
              />
              <h4 className="text-lg font-semibold text-white mb-2">{selectedNFT.name}</h4>
            </div>
            
            <div className="text-left text-sm space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-zinc-400">Phase:</span>
                <span className="text-white font-medium">{selectedNFT.phaseKey || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Price:</span>
                <span className="text-white font-medium">{selectedNFT.price || 0} STT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Distribution:</span>
                <span className="text-white font-medium">{selectedNFT.distributionType || 'auto'}</span>
              </div>
              {selectedNFT.description && (
                <div className="mt-3 pt-3 border-t border-zinc-700">
                  <span className="text-zinc-400 block mb-1">Description:</span>
                  <span className="text-white text-sm">{selectedNFT.description}</span>
                </div>
              )}
              {selectedNFT.attributes && selectedNFT.attributes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-700">
                  <span className="text-zinc-400 block mb-2">Attributes ({selectedNFT.attributes.length}):</span>
                  <div className="space-y-1">
                    {selectedNFT.attributes.map((attr, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-zinc-400">{attr.trait_type}:</span>
                        <span className="text-white">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowNFTDetails(false)}
              className="w-full py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && nftToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-zinc-900 p-6 rounded-xl shadow-lg max-w-md w-full text-center animate-fadeIn relative">
            <button
              className="absolute top-2 right-2 text-zinc-400 hover:text-red-400"
              onClick={() => {
                setShowDeleteConfirm(false);
                setNftToDelete(null);
              }}
            >
              ✕
            </button>
            
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
              ⚠️ Delete NFT
            </h3>
            
            <div className="mb-4">
              <img 
                src={nftToDelete.nft.image?.replace('ipfs://', 'https://ipfs.io/ipfs/')} 
                alt={nftToDelete.nft.name} 
                className="w-24 h-24 object-cover rounded-lg mx-auto mb-3"
              />
              <h4 className="text-lg font-semibold text-white mb-2">{nftToDelete.nft.name}</h4>
            </div>
            
            <div className="text-center text-sm space-y-2 mb-6">
              <p className="text-zinc-300">
                Are you sure you want to delete this NFT from your collection?
              </p>
              <p className="text-red-400 text-xs">
                This action cannot be undone. The NFT will be permanently removed.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setNftToDelete(null);
                }}
                className="flex-1 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNFT(nftToDelete.index)}
                className="flex-1 py-2 rounded bg-red-600 hover:bg-red-500 text-white text-sm font-medium"
              >
                Delete NFT
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default EditNFTs;
