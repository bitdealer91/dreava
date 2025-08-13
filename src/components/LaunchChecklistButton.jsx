// ✅ LaunchButtonWithChecklist.jsx (упрощенная версия)
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Loader2, CheckCircle, PartyPopper, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { ethers } from 'ethers';
import { ensureSomniaNetwork, SOMNIA_CHAIN_ID_DEC } from '../utils/network';
import { useReownWallet } from '../hooks/useReownWallet';
import { keccak256, solidityPacked } from 'ethers';
import nftAbi from '../abi/SomniaNFT.json';
import { MerkleTree } from 'merkletreejs';
import JSZip from 'jszip';

const LaunchButtonWithChecklist = ({ collection }) => {
  const [status, setStatus] = useState({
    metadataReady: false,
    bannerReady: false,
    nftsReady: false,
    phasesReady: false,
    whitelistReady: false,
    allReady: false
  });
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [launchSuccess, setLaunchSuccess] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', txHash: '' });
  const [progressStepText, setProgressStepText] = useState('');
  const [isCancelled, setIsCancelled] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isSaleActive, setIsSaleActive] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const abortControllerRef = useRef(null);

  const navigate = useNavigate();
  const { switchNetwork } = useReownWallet();

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Ensure focus on modal when it opens
  useEffect(() => {
    if (showModal) {
      const modalElement = document.querySelector('[data-modal="launch-checklist"]');
      if (modalElement) {
        modalElement.focus();
      }
    }
  }, [showModal]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showModal]);

  const showToast = (message, txHash = '') => {
    setToast({ visible: true, message, txHash });
  };

  const safeParseJSON = (data, fallback) => {
    try {
      const parsed = JSON.parse(data);
      return parsed !== undefined ? parsed : fallback;
    } catch {
      return fallback;
    }
  };

  // Упрощенная функция проверки базовых требований
  const checkBasicRequirements = async (fresh, nfts, phases) => {
    const nftCount = nfts.length;
    
    // Проверка распределения NFT по фазам
    let allocatedSum = 0;
    let allAllocated = true;
    Object.values(phases).forEach(phase => {
      allocatedSum += Number(phase.allocated) || 0;
    });
    if (allocatedSum !== nftCount) allAllocated = false;

    // Проверка whitelist для приватных фаз
    let whitelistReady = true;
    ['Whitelist', 'FCFS'].forEach(phaseKey => {
      const phase = phases[phaseKey];
      if (phase && Number(phase.allocated) > 0) {
        const wl = safeParseJSON(localStorage.getItem(`${fresh.address}_${phaseKey}_whitelist`), []);
        if (!Array.isArray(wl) || wl.length < Number(phase.allocated)) {
          whitelistReady = false;
        }
      }
    });

    // Загружаем баннер из localStorage
    const bannerUrl = localStorage.getItem(`collection_${fresh.address}_banner`);

    // Проверяем метаданные из всех возможных источников
    let hasMetadata = !!(fresh.metadata || fresh.metadataContent);
    
    // Проверяем localStorage
    const localMetadata = localStorage.getItem(`collection_${fresh.address}_metadata`);
    if (localMetadata) {
      hasMetadata = true;
      console.log('✅ Found metadata in localStorage');
    }
    
    // Проверяем блокчейн
    try {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const contract = new ethers.Contract(fresh.address, nftAbi, provider);
      
      // Проверяем contractURI в блокчейне
      const contractURI = await contract.contractURI();
      if (contractURI && contractURI !== '') {
        hasMetadata = true;
        console.log('✅ Found contractURI in blockchain:', contractURI);
      }
      
      // Проверяем baseTokenURI в блокчейне
      const baseTokenURI = await contract.baseTokenURI();
      if (baseTokenURI && baseTokenURI !== '') {
        hasMetadata = true;
        console.log('✅ Found baseTokenURI in blockchain:', baseTokenURI);
      }
    } catch (error) {
      console.log('Could not check blockchain metadata:', error.message);
    }
    
    console.log('🔍 Metadata check result:', {
      hasMetadata,
      hasLocalMetadata: !!fresh.metadata,
      hasMetadataContent: !!fresh.metadataContent,
      hasLocalStorageMetadata: !!localMetadata
    });

    return {
      metadataReady: hasMetadata,
      bannerReady: !!bannerUrl,
      nftsReady: Array.isArray(nfts) && nfts.length > 0,
      phasesReady: phases && Object.keys(phases).length > 0 && allAllocated,
      whitelistReady,
    };
  };

  // Упрощенная функция проверки статуса блокчейна
  const checkBlockchainStatus = async (fresh, phases) => {
    try {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const contract = new ethers.Contract(fresh.address, nftAbi, provider);
      
      let isInitialized = false;
      let totalMinted = 0;
      let hasActivePhase = false;
      
      try {
        // Check if contract has been initialized by checking if baseTokenURI is set
        const baseTokenURI = await contract.baseTokenURI();
        isInitialized = baseTokenURI && baseTokenURI !== '';
        
        if (isInitialized) {
          totalMinted = await contract.totalSupply();
          
          // Check if there are active phases by checking contract state
          const now = Math.floor(Date.now() / 1000);
          
          // Only check for active phases if we have phases data
          if (phases && Object.keys(phases).length > 0) {
            hasActivePhase = Object.values(phases).some(phase => {
              if (!phase.start || !phase.end) return false;
              const startTime = Math.floor(new Date(phase.start).getTime() / 1000);
              const endTime = Math.floor(new Date(phase.end).getTime() / 1000);
              return now >= startTime && now <= endTime;
            });
          }
          
          // Also check if sale is active by checking contract state
          try {
            if (typeof contract.isSaleActive === 'function') {
              const saleActive = await contract.isSaleActive();
              hasActivePhase = hasActivePhase || saleActive;
            }
          } catch (error) {
            console.log('Could not check isSaleActive:', error.message);
          }
          
          // Additional check: if contract is revealed, it might be active
          try {
            const revealed = await contract.revealed();
                      // Only consider it active if revealed AND has minted tokens AND has active phases
          if (revealed && totalMinted > 0 && hasActivePhase) {
            hasActivePhase = true;
          } else {
            // If not revealed OR no tokens minted, it's not really active yet
            hasActivePhase = false;
          }
          } catch (error) {
            console.log('Could not check revealed status:', error.message);
          }
        }
      } catch (error) {
        console.log('Error checking blockchain status:', error.message);
      }
      
      console.log('🔍 Blockchain status check result:', {
        address: fresh.address,
        isInitialized,
        totalMinted: Number(totalMinted),
        hasActivePhase,
        phasesCount: phases ? Object.keys(phases).length : 0,
        currentPath: window.location.pathname
      });
      
      return {
        isInitialized,
        totalMinted: Number(totalMinted),
        isSaleActive: hasActivePhase,
        canResume: isInitialized && !hasActivePhase
      };
    } catch (error) {
      console.error('Error checking blockchain status:', error);
      return {
        isInitialized: false,
        totalMinted: 0,
        isSaleActive: false,
        canResume: false
      };
    }
  };

  // Упрощенная функция проверки resume mode
  const checkResumeMode = async (fresh) => {
    try {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const contract = new ethers.Contract(fresh.address, nftAbi, provider);
      
      const baseUri = await contract.baseTokenURI();
      const maxSupply = await contract.maxSupply();
      const contractUri = await contract.contractURI();
      
      // Check phases count by trying to get phases from contract
      let phasesCount = 0;
      try {
        // Try to get phases count from contract if function exists
        if (typeof contract.getPhasesCount === 'function') {
          phasesCount = await contract.getPhasesCount();
        } else {
          // Fallback: check if contract has phases by trying to get phase info
          phasesCount = 0; // We'll determine this from localStorage
        }
      } catch (error) {
        console.log('Could not get phases count from contract:', error.message);
        phasesCount = 0;
      }
      
      const phases = safeParseJSON(localStorage.getItem(`phases_${fresh.address}`), {});
      const expectedPhasesCount = Object.values(phases).filter(p => p.active).length;
      
      const resumeSteps = [];
      if (!baseUri) resumeSteps.push('Set baseURI');
      if (!maxSupply || maxSupply === 0) resumeSteps.push('Set maxSupply');
      if (!contractUri) resumeSteps.push('Set contractURI');
      if (Number(phasesCount) < expectedPhasesCount) {
        resumeSteps.push(`Add ${expectedPhasesCount - Number(phasesCount)} phases`);
      }
      
      // Если есть хотя бы один шаг для выполнения, или коллекция частично инициализирована
      const hasStepsToComplete = resumeSteps.length > 0;
      const isPartiallyInitialized = baseUri || maxSupply > 0 || contractUri;
      
      return {
        canResume: hasStepsToComplete || isPartiallyInitialized,
        resumeSteps
      };
    } catch (error) {
      console.log('Error checking resume mode:', error.message);
      return { canResume: false, resumeSteps: [] };
    }
  };

  const checkAllStatus = async () => {
    setIsCheckingStatus(true);
    try {
      // Загружаем данные коллекции
      const local = safeParseJSON(localStorage.getItem(`collection_${collection.address}`), null);
      const fresh = local || collection;
      
      const nfts = safeParseJSON(localStorage.getItem(`collection_${fresh.address}_nfts`), []);
      const phases = safeParseJSON(localStorage.getItem(`phases_${fresh.address}`), {});
      
      // Проверяем базовые требования
      const basicChecks = await checkBasicRequirements(fresh, nfts, phases);
      
      // Проверяем статус блокчейна
      const blockchainStatus = await checkBlockchainStatus(fresh, phases);
      
      // Если сейл уже активен - редиректим на активные сейлы
      // Но только если мы находимся на странице управления коллекцией, а не в дашборде
      console.log('🔍 Sale active check:', {
        isSaleActive: blockchainStatus.isSaleActive,
        currentPath: window.location.pathname,
        isInDashboard: window.location.pathname === '/dashboard' || window.location.pathname === '/create-dreams'
      });
      
      if (blockchainStatus.isSaleActive) {
        const currentPath = window.location.pathname;
        const isInDashboard = currentPath === '/dashboard' || currentPath === '/create-dreams';
        
        if (!isInDashboard) {
          setIsSaleActive(true);
          showToast('🔄 Sale is already active! Redirecting to collection page...');
          setTimeout(() => navigate(`/launchpad/collection/${fresh.address}`), 2000);
          return;
        } else {
          // В дашборде просто скрываем кнопку, но не редиректим
          setIsSaleActive(true);
          return;
        }
      }
      
      // Если коллекция инициализирована, но сейл не активен - показываем кнопку для продолжения
      if (blockchainStatus.isInitialized && !blockchainStatus.isSaleActive) {
        console.log('✅ Collection is initialized but sale is not active - showing resume button');
      }
      
      // Проверяем resume mode если контракт инициализирован
      let resumeInfo = { canResume: false, resumeSteps: [] };
      if (blockchainStatus.isInitialized) {
        resumeInfo = await checkResumeMode(fresh);
      }
      
      const checks = {
        ...basicChecks,
        blockchainStatus,
        resumeInfo
      };
      
      // Определяем, можно ли запускать продажу
      checks.canLaunch = !blockchainStatus.isInitialized && Object.values(basicChecks).every(Boolean);
      
      // Кнопка должна показываться если:
      // 1. Можно запустить новую продажу (не инициализирована + все требования выполнены)
      // 2. Или коллекция инициализирована и можно продолжить (resume mode)
      // 3. Или коллекция инициализирована но не полностью запущена
      // 4. Или есть что доделать (resume mode)
      checks.allReady = checks.canLaunch || 
                       (blockchainStatus.isInitialized && resumeInfo.canResume) ||
                       (blockchainStatus.isInitialized && !blockchainStatus.isSaleActive) ||
                       resumeInfo.canResume;

      console.log('🎯 Final checks result:', {
        address: fresh.address,
        canLaunch: checks.canLaunch,
        isInitialized: blockchainStatus.isInitialized,
        canResume: resumeInfo.canResume,
        isSaleActive: blockchainStatus.isSaleActive,
        allReady: checks.allReady,
        basicChecks: Object.values(basicChecks),
        resumeSteps: resumeInfo.resumeSteps
      });
      
      console.log('🎯 Button visibility logic:', {
        canLaunch: checks.canLaunch,
        isInitializedAndCanResume: blockchainStatus.isInitialized && resumeInfo.canResume,
        isInitializedAndNotActive: blockchainStatus.isInitialized && !blockchainStatus.isSaleActive,
        resumeInfoCanResume: resumeInfo.canResume,
        finalAllReady: checks.allReady
      });

      setStatus(checks);
      return checks;
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Функция для загрузки с retry
  const uploadWithRetry = async (url, data, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (isCancelled) throw new Error('Operation cancelled');
        return await fetch(url, data);
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  };

  const getApiBase = () => {
    try {
      const isBrowser = typeof window !== 'undefined';
      const isLocal = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const isVite = isBrowser && String(window.location.port) === '5173';
      // In dev with Vite, use proxy via relative URLs
      if (isLocal && isVite) return '';
      // In non-dev, allow env override, else relative
      const envBase = import.meta?.env?.VITE_API_BASE;
      if (envBase && typeof envBase === 'string' && envBase.trim()) {
        const v = envBase.trim().replace(/\/$/, '');
        if (/^https?:\/\//i.test(v)) return v;
      }
      // Do not use localStorage override by default to avoid sticky misconfig
    } catch {}
    return '';
  };

  const buildApiUrl = (path) => {
    const base = getApiBase();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (!base) return normalizedPath;
    return `${base}${normalizedPath}`;
  };

  // Функция для очистки состояния
  const resetState = () => {
    setUploading(false);
    setProgress(0);
    setProgressStepText('');
    setIsCancelled(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleLaunch = async () => {
    let zip = null;
    try {
      setUploading(true);
      setProgress(10);
      setProgressStepText('Checking collection data...');
      abortControllerRef.current = new AbortController();

      // Загружаем данные коллекции
      const local = safeParseJSON(localStorage.getItem(`collection_${collection.address}`), null);
      const fresh = local || collection;
      
      if (!fresh || !fresh.address) throw new Error('Invalid collection data: missing address');
      if (!ethers.isAddress(fresh.address)) {
        throw new Error(`Invalid contract address: ${fresh.address}`);
      }

      // Ensure correct network before launching sale
      try {
        const sw = await (async () => { try { return await switchNetwork?.(SOMNIA_CHAIN_ID_DEC); } catch { return { success: false }; } })();
        if (!sw?.success) await ensureSomniaNetwork();
      } catch (e) {
        showToast('❌ Please switch to Somnia Testnet to launch the sale');
        resetState();
        return;
      }

      // Инициализируем контракт
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const nftContract = new ethers.Contract(fresh.address, [
        ...nftAbi,
        "function setAdmin(address user, bool enabled) external",
        "function isAdmin(address user) view returns (bool)",
        "function owner() view returns (address)"
      ], signer);
      
      if (!nftContract) {
        throw new Error('Failed to initialize contract');
      }

      // Проверяем resume mode
      let isResumeMode = false;
      try {
        const baseTokenURI = await nftContract.baseTokenURI();
        const isInitialized = baseTokenURI && baseTokenURI !== '';
        if (isInitialized) {
          const resumeInfo = await checkResumeMode(fresh);
          if (resumeInfo.canResume) {
            isResumeMode = true;
            showToast('🔄 Resume mode: continuing from where you left off...');
          } else {
            throw new Error('Collection already fully launched');
          }
        }
      } catch (error) {
        console.log('Contract not initialized or error checking status:', error.message);
      }

      // Загружаем NFT
      const nfts = safeParseJSON(localStorage.getItem(`collection_${fresh.address}_nfts`), []);
      if (!Array.isArray(nfts) || nfts.length === 0) {
        throw new Error('No NFTs found in collection');
      }

      // Проверяем валидность NFT
      for (const nft of nfts) {
        if (!nft.image) {
          throw new Error(`NFT ${nft.name} has no image URL`);
        }
      }

      // Создаем ZIP с метаданными (если не в resume mode)
      if (!isResumeMode) {
        setProgress(20);
        setProgressStepText('Generating metadata zip...');
        
        zip = new JSZip();
        nfts.forEach((nft, idx) => {
          const metadata = {
            name: String(nft.name || `NFT #${idx + 1}`),
            description: String(nft.description || ''),
            image: String(nft.image),
            attributes: Array.isArray(nft.attributes) ? nft.attributes.map(attr => ({
              trait_type: String(attr.trait_type || ''),
              value: String(attr.value || '')
            })) : []
          };
          
          if (!metadata.image) {
            throw new Error(`NFT ${idx + 1} has no image URL`);
          }
          
          if (!metadata.image.startsWith('ipfs://') && !metadata.image.startsWith('http')) {
            throw new Error(`Invalid image URL format for NFT ${idx + 1}: ${metadata.image}`);
          }
          
          // Backend ожидает файлы вида 0.json, 1.json, ...
          zip.file(`${idx}.json`, JSON.stringify(metadata, null, 2));
        });

        const zipBlob = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 9 }
        });

        if (zipBlob.size > 100 * 1024 * 1024) {
          throw new Error('Metadata folder is too large (max 100MB)');
        }

        setProgress(30);
        setProgressStepText('Uploading metadata folder to IPFS...');

        const formData = new FormData();
        formData.append('folder', zipBlob, 'metadata.zip');

        const zipRes = await uploadWithRetry(buildApiUrl('/api/upload-metadata-folder'), {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal
        });

        if (!zipRes.ok) {
          const errorData = await zipRes.json();
          throw new Error(errorData.error || 'Metadata folder upload failed');
        }

        const zipData = await zipRes.json();
        if (!zipData.cid) {
          throw new Error('No CID returned from server');
        }

        const baseUri = zipData.url;
        if (!baseUri.startsWith('ipfs://')) {
          throw new Error('Invalid baseURI format');
        }

        setProgress(40);
        setProgressStepText('Setting baseURI in contract...');

        const txBase = await nftContract.setBaseURI(baseUri);
        showToast('⏳ Setting baseURI...', txBase.hash);
        await txBase.wait();

        // Устанавливаем maxSupply
        const maxSupply = nfts.length;
        const txMax = await nftContract.setMaxSupply(maxSupply);
        showToast('⏳ Setting maxSupply...', txMax.hash);
        setProgress(45);
        setProgressStepText('Setting maxSupply in contract...');
        await txMax.wait();
      }

      // Добавляем фазы
      setProgress(50);
      setProgressStepText('Adding phases to contract...');
      const phases = safeParseJSON(localStorage.getItem(`phases_${fresh.address}`), {});
      if (!phases || Object.keys(phases).length === 0) throw new Error('No phases found');
      
      const phaseKeys = Object.keys(phases);
      let phaseIdx = 0;
      
      for (const key of phaseKeys) {
        const phase = phases[key];
        if (!phase || phase.active === false) continue;
        
        const isPublic = key === 'Public';
        let merkleRoot = '0x' + '0'.repeat(64);
        
        if (!isPublic) {
          const wl = safeParseJSON(localStorage.getItem(`${fresh.address}_${key}_whitelist`), []);
          
          if (wl.length > 0) {
            const normalizedWl = wl.map(addr => {
              try {
                return ethers.getAddress(addr.trim());
              } catch (error) {
                return addr.trim().toLowerCase();
              }
            });
            
            const leaves = normalizedWl.map(addr => keccak256(solidityPacked(['address'], [addr])));
            const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
            merkleRoot = tree.getHexRoot();
            
            // Сохраняем proofs
            const proofs = {};
            normalizedWl.forEach(addr => {
              const leaf = keccak256(solidityPacked(['address'], [addr]));
              let proof = tree.getHexProof(leaf);
              if (proof.length === 0 && normalizedWl.length === 1) {
                proof = [];
              }
              proofs[addr] = proof;
            });
            
            localStorage.setItem(`${fresh.address}_${key}_whitelist_proofs`, JSON.stringify(proofs));
            localStorage.setItem(`${fresh.address}_${key}_whitelist_root`, merkleRoot);
          }
        }
        
        const start = Math.floor(new Date(phase.start).getTime() / 1000);
        const end = Math.floor(new Date(phase.end).getTime() / 1000);
        const price = ethers.parseUnits(phase.price || '0', 18);
        const maxPerWallet = Number(phase.limit) || 0;
        
        try {
          const txPhase = await nftContract.addPhase(
            start,
            end,
            price,
            maxPerWallet,
            merkleRoot,
            isPublic
          );
          showToast(`⏳ Adding phase ${key}...`, txPhase.hash);
          setProgress(50 + Math.floor(10 * (phaseIdx + 1) / phaseKeys.length));
          await txPhase.wait();
        } catch (e) {
          console.error('Phase addition failed:', e);
          showToast(`❌ Error adding phase ${key}: ${e.message}`);
          throw e;
        }
        phaseIdx++;
      }

            // Загружаем метаданные коллекции
      setProgress(65);
      setProgressStepText('Uploading collection metadata to IPFS...');
      
      // Загружаем данные коллекции из правильного ключа
      const collectionData = safeParseJSON(localStorage.getItem(`collection_${fresh.address}`), null);
      console.log('🔍 Loading metadata - collectionData:', collectionData);
      
      // Также пробуем загрузить из общего списка
      const allCollections = safeParseJSON(localStorage.getItem('dreava_collections'), []);
      const found = allCollections && Array.isArray(allCollections) ? allCollections.find((c) => c.address === fresh.address) : null;
      
      // Соц.ссылки из студии (localStorage)
      const savedSocial = safeParseJSON(localStorage.getItem(`collection_${fresh.address}_social`), {}) || {};
      // Баннер из студии (localStorage)
      const savedBanner = typeof window !== 'undefined' ? window.localStorage.getItem(`collection_${fresh.address}_banner`) : '';
      
      // Объединяем данные: сначала из общего списка, потом из конкретной коллекции, потом из fresh
      const meta = { ...found, ...collectionData, ...fresh };
      console.log('🔍 Loading metadata - meta:', meta);
      
      const metadata = {
        name: meta.name || fresh.name || 'Untitled Collection',
        description: meta.description || fresh.description || 'A unique NFT collection',
        image: meta.image || fresh.image || meta.cover || fresh.cover || '',
        banner: savedBanner || meta.banner || fresh.banner || '',
        external_link: meta.external_link || savedSocial.website || '',
        website: savedSocial.website || undefined,
        twitter: savedSocial.twitter || undefined,
        discord: savedSocial.discord || undefined,
        royaltyRecipient: meta.royaltyRecipient || '',
        royaltyPercent: meta.royaltyPercent || 0,
        nfts: Array.isArray(nfts) ? nfts.map((nft, idx) => ({
          name: nft.name || `NFT #${idx + 1}`,
          tokenURI: `${fresh.metadata || fresh.baseTokenURI || 'ipfs://' + 'cid'}/${idx}`,
          image: nft.image || nft.image_url || ''
        })) : [],
        phases: phases && typeof phases === 'object' ? Object.entries(phases).reduce((acc, [key, phase]) => {
          if (!phase || !phase.active) return acc;
          acc[key] = {
            price: phase.price,
            limit: phase.limit,
            start: Math.floor(new Date(phase.start).getTime() / 1000),
            end: Math.floor(new Date(phase.end).getTime() / 1000),
            allocated: phase.allocated,
            isPublic: key === 'Public'
          };
          return acc;
        }, {}) : {}
      };

      console.log('📤 Uploading metadata to server...');
      console.log('📤 Metadata to upload:', metadata);
      
      let res;
      try {
        res = await fetch('/api/upload-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata }),
        });
        
        console.log('📤 Fetch completed, status:', res.status);
      } catch (fetchError) {
        console.error('❌ Fetch error:', fetchError);
        throw fetchError;
      }
      
      console.log('📤 Upload response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Upload failed:', errorText);
        throw new Error(`Metadata upload failed: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      console.log('✅ Upload response data:', data);
      
      const ipfsUri = data.url || (data.cid ? `ipfs://${data.cid}` : null);
      if (!ipfsUri) throw new Error('No IPFS URI returned from server');

      setProgress(80);
      setProgressStepText('Updating contractURI in contract...');
      
      const tx2 = await nftContract.setContractURI(ipfsUri);
      showToast('⏳ Updating contractURI...', tx2.hash);
      await tx2.wait();

      // Автоматический reveal
      setProgress(90);
      setProgressStepText('Revealing collection...');
      try {
        const signerAddress = await signer.getAddress();
        const isUserAdmin = await nftContract.isAdmin(signerAddress);
        const contractOwner = await nftContract.owner();
        
        if (!isUserAdmin && signerAddress.toLowerCase() !== contractOwner.toLowerCase()) {
          if (signerAddress.toLowerCase() === contractOwner.toLowerCase()) {
            const txAddAdmin = await nftContract.setAdmin(signerAddress, true);
            await txAddAdmin.wait();
          } else {
            throw new Error('User does not have admin permissions on this contract');
          }
        }
        
        const txReveal = await nftContract.setRevealed(true);
        showToast('⏳ Revealing collection...', txReveal.hash);
        await txReveal.wait();
        
        const newRevealedStatus = await nftContract.revealed();
        if (!newRevealedStatus) {
          throw new Error('Reveal transaction succeeded but revealed status is still false');
        }
      } catch (revealErr) {
        console.error('Error revealing collection:', revealErr);
        if (revealErr.message && revealErr.message.includes('Not admin')) {
          showToast('❌ Permission denied: You are not an admin of this contract');
        } else {
          showToast('❌ Error revealing collection: ' + (revealErr.message || revealErr));
        }
      }

      setProgress(100);
      setProgressStepText('Launch complete!');
      setLaunchSuccess(true);
      
      // 🎯 Record quest action for collection launch
      try {
        const signerAddress = await signer.getAddress();
        await fetch('/api/quest/record-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: signerAddress,
            actionType: 'collection_launched',
            data: {
              collectionAddress: fresh.address,
              collectionName: fresh.name || (collection?.name) || 'Unknown Collection',
              maxSupply: nfts?.length || 0
            }
          })
        });
      } catch (questErr) {
        console.warn('⚠️ Failed to record collection_launched action:', questErr);
      }

      const finalRevealedStatus = await nftContract.revealed();
        if (finalRevealedStatus) {
          showToast('✅ Collection launched and revealed! Redirecting to collection page...', tx2.hash);
        } else {
          showToast('✅ Collection launched! Redirecting to collection page...', tx2.hash);
        }

        setTimeout(() => navigate(`/launchpad/collection/${fresh.address}`), 3000);
    } catch (err) {
      console.error('❌ Launch error:', err);
      showToast(`❌ Launch error: ${err.message}`);
      resetState();
    } finally {
      zip = null;
    }
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      resetState();
    };
  }, []);

  // Автоматическая проверка статуса при загрузке
  useEffect(() => {
    if (collection?.address) {
      checkAllStatus();
    }
  }, [collection?.address]);

  // Если сейл уже активен, показываем Share кнопку
  if (isSaleActive) {
    return (
      <>
        <button
          onClick={() => setShowShareModal(true)}
          className="px-4 py-2 rounded text-sm font-semibold transition shadow-md flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
          Share
        </button>

        {/* Share Modal */}
        {showShareModal && createPortal(
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
                  <img 
                    src={collection.cover || collection.firstNFTImage || collection.image || '/default-cover.png'} 
                    alt={collection.name}
                    className="w-16 h-16 rounded-xl object-cover border border-zinc-600/30"
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
                  <div>
                    <h4 className="text-lg font-semibold text-white">{collection.name}</h4>
                    <p className="text-sm text-zinc-400">
                      Collection is live! 🚀
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
                      value={`${window.location.origin}/launchpad/collection/${collection.address}`}
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
                        navigator.clipboard.writeText(`${window.location.origin}/launchpad/collection/${collection.address}`);
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
                          {`${window.location.origin}/launchpad/collection/${collection.address}`}
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
                      "I just launched my NFT collection "{collection.name}" on Dreava Art! 🚀
                      <br /><br />
                      Check it out: <span className="break-all text-blue-400">{`${window.location.origin}/launchpad/collection/${collection.address}`}</span>
                      <br /><br />
                      Try it yourself, it's really simple! ✨"
                    </p>
                  </div>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just launched my NFT collection "${collection.name}" on Dreava Art! 🚀\n\nCheck it out: ${window.location.origin}/launchpad/collection/${collection.address}\n\nTry it yourself, it's really simple! ✨`)}`}
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
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => checkAllStatus().then(() => setShowModal(true))}
        disabled={isCheckingStatus}
        className={`px-4 py-2 rounded text-sm font-semibold transition shadow-md flex items-center gap-2 ${
          isCheckingStatus
            ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90'
        }`}
      >
        {isCheckingStatus ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            Checking...
          </>
        ) : 'Launch Sale'
        }
      </button>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[999999] p-4">
          <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full animate-fadeIn border border-zinc-700/50 relative overflow-hidden transform transition-all duration-300 hover:scale-[1.02]" tabIndex={-1} autoFocus data-modal="launch-checklist">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
            
            {/* Content */}
            <div className="relative z-10 p-6">
              <button
                className="absolute top-3 right-3 text-zinc-400 hover:text-red-400 transition-all duration-200 hover:scale-110"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            {!launchSuccess ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-[#FF0080] to-[#00A3FF] bg-clip-text text-transparent">Launch Checklist</h3>
                  <button
                    onClick={checkAllStatus}
                    disabled={isCheckingStatus}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors text-xs"
                    title="Refresh status"
                  >
                    {isCheckingStatus ? (
                      <Loader2 className="animate-spin" size={12} />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {isCheckingStatus ? 'Checking...' : 'Refresh'}
                  </button>
                </div>

                {/* Checklist Items */}
                <div className="grid grid-cols-1 gap-3 mb-4">
                  <div className={`${status.metadataReady ? 'bg-green-900/20 border-green-500/50 text-green-300' : 'bg-red-900/20 border-red-500/50 text-red-300'} p-3 rounded-xl border transition-all`}>
                    <div className="flex items-center gap-3">
                      {status.metadataReady ? (
                        <CheckCircle className="text-green-400" size={18} />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border-2 border-red-400"></div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm">Metadata</h4>
                        <p className="text-xs opacity-80">{status.metadataReady ? 'Collection metadata ready' : 'Missing collection metadata'}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`${status.bannerReady ? 'bg-green-900/20 border-green-500/50 text-green-300' : 'bg-red-900/20 border-red-500/50 text-red-300'} p-3 rounded-xl border transition-all`}>
                    <div className="flex items-center gap-3">
                      {status.bannerReady ? (
                        <CheckCircle className="text-green-400" size={18} />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border-2 border-red-400"></div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm">Banner</h4>
                        <p className="text-xs opacity-80">{status.bannerReady ? 'Banner image ready' : 'Missing banner image'}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`${status.nftsReady ? 'bg-green-900/20 border-green-500/50 text-green-300' : 'bg-red-900/20 border-red-500/50 text-red-300'} p-3 rounded-xl border transition-all`}>
                    <div className="flex items-center gap-3">
                      {status.nftsReady ? (
                        <CheckCircle className="text-green-400" size={18} />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border-2 border-red-400"></div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm">NFTs</h4>
                        <p className="text-xs opacity-80">{status.nftsReady ? 'NFTs uploaded and ready' : 'No NFTs found in collection'}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`${status.phasesReady ? 'bg-green-900/20 border-green-500/50 text-green-300' : 'bg-red-900/20 border-red-500/50 text-red-300'} p-3 rounded-xl border transition-all`}>
                    <div className="flex items-center gap-3">
                      {status.phasesReady ? (
                        <CheckCircle className="text-green-400" size={18} />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border-2 border-red-400"></div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm">Phases</h4>
                        <p className="text-xs opacity-80">{status.phasesReady ? 'Sale phases configured' : 'Missing or incomplete phase configuration'}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`${status.whitelistReady ? 'bg-green-900/20 border-green-500/50 text-green-300' : 'bg-red-900/20 border-red-500/50 text-red-300'} p-3 rounded-xl border transition-all`}>
                    <div className="flex items-center gap-3">
                      {status.whitelistReady ? (
                        <CheckCircle className="text-green-400" size={18} />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border-2 border-red-400"></div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm">Whitelist</h4>
                        <p className="text-xs opacity-80">{status.whitelistReady ? 'Whitelist addresses ready' : 'Missing whitelist addresses for private phases'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Removed verbose blockchain status text per spec */}
                </div>

                {/* Progress Section */}
                {uploading && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-zinc-300">Launch Progress</span>
                      <span className="text-xs text-zinc-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-pink-500 h-2 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">{progressStepText}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {status.allReady && !uploading && (
                    <button
                      onClick={handleLaunch}
                      disabled={uploading}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle size={16} />
                      {status.blockchainStatus?.isInitialized ? 'Resume Launch' : 'Confirm Launch'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold transition-all duration-300"
                  >
                    Close
                  </button>
                </div>

                {/* Resume Mode Info (kept) */}
                {status.resumeInfo?.canResume && (
                  <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="text-blue-400" size={14} />
                      <h4 className="font-semibold text-blue-300 text-sm">Resume Mode</h4>
                    </div>
                    <p className="text-xs text-blue-200 mb-2">
                      Collection is partially initialized. You can resume from where you left off.
                    </p>
                    <div className="text-xs text-blue-300">
                      <p>Steps to complete:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {status.resumeInfo.resumeSteps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {!status.allReady && (
                  <div className="mt-3 p-3 bg-red-900/20 border border-red-500/50 rounded-xl">
                    <p className="text-xs text-red-300">
                      Please complete all checklist items before launching the sale.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <PartyPopper size={56} className="text-pink-500 animate-bounce mx-auto mb-3" />
                <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-green-400 to-lime-400 bg-clip-text text-transparent">
                  🎉 Sale Launched!
                </h3>
                <p className="text-base text-zinc-300 mb-5">
                  Your collection has been successfully launched and is now available for minting!
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => navigate('/launchpad')}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 text-white font-semibold transition-all duration-300"
                  >
                    Go to Launchpad
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-semibold transition-all duration-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
                  </div>
    </div>
  </div>,
  document.body
)}

{/* Toast Notifications */}
{toast.visible && createPortal(
  <div className="fixed bottom-6 right-6 bg-zinc-800 text-white p-4 rounded-xl shadow-2xl max-w-sm animate-fadeIn border border-zinc-700/50 backdrop-blur-xl z-[999999]">
    <p className="text-sm mb-2">{toast.message}</p>
    {toast.txHash && (
      <a
        href={`https://shannon-explorer.somnia.network/tx/${toast.txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:underline flex items-center gap-2 text-sm"
      >
        <ExternalLink size={16} />
        View Transaction
      </a>
    )}
  </div>,
  document.body
)}
    </>
  );
};

export default LaunchButtonWithChecklist;