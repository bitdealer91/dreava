// PhaseSettingsWrapper.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PhaseSettings from '../components/PhaseSettings';
import { getIpfsUrls } from '../utils/ipfs';
import { ethers } from 'ethers';
import nftAbi from '../abi/SomniaNFT.json';
import { AlertTriangle, StopCircle } from 'lucide-react';

const AVAILABLE_PHASES = [
  { key: 'Whitelist', enumValue: 1 },
  { key: 'FCFS', enumValue: 2 },
  { key: 'Public', enumValue: 3 },
];

// Public phase is always required
const REQUIRED_PHASES = ['Public'];

const fetchWithFallback = async (urls) => {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {}
  }
  throw new Error('All IPFS gateways failed');
};

const PhaseSettingsWrapper = () => {
  const { address: collectionAddress } = useParams();
  const navigate = useNavigate();

  const [phases, setPhases] = useState([]);
  const [nfts, setNfts] = useState([]);
  const [showPhaseMenu, setShowPhaseMenu] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [isCollectionLaunched, setIsCollectionLaunched] = useState(false);
  const [isStoppingSale, setIsStoppingSale] = useState(false);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Check if collection is launched
  const checkCollectionStatus = async () => {
    if (!collectionAddress) return;
    
    try {
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const contract = new ethers.Contract(collectionAddress, nftAbi, provider);
      
      // Check if contract is initialized (launched)
      let launched = false;
      try {
        if (typeof contract.initialized === 'function') {
          launched = await contract.initialized();
        }
      } catch (error) {
        console.log('Contract not initialized yet');
      }
      
      setIsCollectionLaunched(launched);
      console.log('Collection launch status:', launched);
    } catch (error) {
      console.error('Error checking collection status:', error);
    }
  };

  // Stop sale function
  const handleStopSale = async () => {
    if (!collectionAddress) return;
    
    try {
      setIsStoppingSale(true);
      
      // Connect to wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(collectionAddress, nftAbi, signer);
      
      // Check if user has permissions
      const signerAddress = await signer.getAddress();
      const isUserAdmin = await contract.isAdmin(signerAddress);
      const contractOwner = await contract.owner();
      
      if (!isUserAdmin && signerAddress.toLowerCase() !== contractOwner.toLowerCase()) {
        showToast('❌ You do not have permission to stop this sale', 'error');
        return;
      }
      
      // Stop all phases by setting them to inactive
      const savedPhases = JSON.parse(localStorage.getItem(`phases_${collectionAddress}`)) || {};
      const updatedPhases = {};
      
      Object.keys(savedPhases).forEach(key => {
        updatedPhases[key] = {
          ...savedPhases[key],
          active: false
        };
      });
      
      localStorage.setItem(`phases_${collectionAddress}`, JSON.stringify(updatedPhases));
      
      showToast('✅ Sale stopped successfully! All phases are now inactive.', 'success');
      setIsCollectionLaunched(false);
      
      // Refresh the page to update UI
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error stopping sale:', error);
      showToast(`❌ Error stopping sale: ${error.message}`, 'error');
    } finally {
      setIsStoppingSale(false);
    }
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('dreava_collections')) || [];
    const found = saved.find((col) => col.address === collectionAddress);
    if (found) setCollectionName(found.name);

    const savedPhases = JSON.parse(localStorage.getItem(`collection_${collectionAddress}_phases`)) || [];
    
    // Ensure Public phase is always present
    const hasPublic = savedPhases.some(phase => phase.key === 'Public');
    if (!hasPublic) {
      savedPhases.push({ key: 'Public', enumValue: 3 });
      localStorage.setItem(`collection_${collectionAddress}_phases`, JSON.stringify(savedPhases));
    }
    
    setPhases(savedPhases);

    const loadNFTs = async () => {
      const storedNFTs = JSON.parse(localStorage.getItem(`collection_${collectionAddress}_nfts`)) || [];

      const updatedNFTs = await Promise.all(
        storedNFTs.map(async (nft, idx) => {
          let updated = { ...nft, id: nft.id ?? `nft-${idx}` };
          if (updated.image?.startsWith('ipfs://')) {
            updated.image = getIpfsUrls(updated.image)[0];
          }
          if (!updated.image && updated.tokenURI) {
            try {
              const urls = getIpfsUrls(updated.tokenURI);
              const metadata = await fetchWithFallback(urls);
              updated.image = metadata.image ? getIpfsUrls(metadata.image)[0] : updated.image;
            } catch {
              // Пропускаем ошибку
            }
          }
          return updated;
        })
      );

      // Убираем дубликаты по id
      const uniqueNFTs = Array.from(new Map(updatedNFTs.map(nft => [nft.id, nft])).values());

      setNfts(uniqueNFTs);
      localStorage.setItem(`collection_${collectionAddress}_nfts`, JSON.stringify(uniqueNFTs));
    };

    loadNFTs();
    checkCollectionStatus();
  }, [collectionAddress]);

  const handleAddPhase = (phase) => {
    const updatedPhases = [...phases, phase];
    setPhases(updatedPhases);
    localStorage.setItem(`collection_${collectionAddress}_phases`, JSON.stringify(updatedPhases));
    setShowPhaseMenu(false);
    showToast(`✅ Phase "${phase.key}" added.`);
  };

  const handleRemovePhase = (keyToRemove) => {
    // Prevent removing required phases
    if (REQUIRED_PHASES.includes(keyToRemove)) {
      showToast(`❌ Cannot remove required phase "${keyToRemove}"`, 'error');
      return;
    }
    
    const updated = phases.filter((p) => p.key !== keyToRemove);
    setPhases(updated);
    localStorage.setItem(`collection_${collectionAddress}_phases`, JSON.stringify(updated));
    showToast(`ℹ️ Phase "${keyToRemove}" removed.`, 'info');
  };

  const handleActivatePhase = (phaseEnum) => {
    // Получаем текущие настройки фаз
    const savedPhases = JSON.parse(localStorage.getItem(`phases_${collectionAddress}`)) || {};
    console.log('Current saved phases:', savedPhases);
    
    // Находим фазу по enum значению
    const phaseKey = AVAILABLE_PHASES.find(p => p.enumValue === phaseEnum)?.key;
    if (!phaseKey) return;

    // Check if this phase is being activated
    const isActivating = savedPhases[phaseKey]?.active;
    
    // If activating a phase, deactivate all others first
    if (isActivating) {
      Object.keys(savedPhases).forEach(key => {
        if (key !== phaseKey && savedPhases[key]?.active) {
          savedPhases[key].active = false;
          console.log(`Deactivating phase ${key} to activate ${phaseKey}`);
        }
      });
    }

    // Обновляем состояние фазы
    const updatedPhases = phases.map(phase => {
      if (phase.key === phaseKey) {
        return {
          ...phase,
          active: savedPhases[phaseKey]?.active || false
        };
      }
      return phase;
    });

    console.log('Updated phases:', updatedPhases);
    console.log('Phase settings:', savedPhases);

    // Сохраняем обновленные фазы
    setPhases(updatedPhases);
    localStorage.setItem(`collection_${collectionAddress}_phases`, JSON.stringify(updatedPhases));
    localStorage.setItem(`phases_${collectionAddress}`, JSON.stringify(savedPhases));
    
    showToast(`🚀 Phase ${phaseKey} ${isActivating ? 'activated' : 'deactivated'}!`);
  };

  // Sort phases in fixed order: WL → FCFS → Public
  const getSortedPhases = () => {
    const phaseOrder = [
      { key: 'Whitelist', priority: 1 },
      { key: 'FCFS', priority: 2 },
      { key: 'Public', priority: 3 }
    ];
    
    return phaseOrder
      .filter(phase => phases.some(p => p.key === phase.key))
      .map(phase => phases.find(p => p.key === phase.key))
      .filter(Boolean);
  };

  const availableOptions = AVAILABLE_PHASES.filter(
    (phase) => !phases.some((p) => p.key === phase.key)
  );

  const sortedPhases = getSortedPhases();

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 text-white font-sans">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm"
        >
          ← Back
        </button>
        <div className="flex gap-2">
          {isCollectionLaunched && (
            <button
              onClick={handleStopSale}
              disabled={isStoppingSale}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-sm flex items-center gap-2"
            >
              {isStoppingSale ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Stopping...
                </>
              ) : (
                <>
                  <StopCircle size={16} />
                  Stop Sale
                </>
              )}
            </button>
          )}
        <div className="relative">
          <button
            onClick={() => setShowPhaseMenu(!showPhaseMenu)}
            className="px-4 py-2 rounded bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 text-sm"
              disabled={availableOptions.length === 0 || isCollectionLaunched}
          >
            + Add Phase
          </button>
          {showPhaseMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-600 rounded shadow-lg z-10">
              {availableOptions.length === 0 ? (
                <div className="px-4 py-2 text-sm text-zinc-400">All phases added</div>
              ) : (
                availableOptions.map((phase) => (
                  <button
                    key={phase.key}
                    onClick={() => handleAddPhase(phase)}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-sm"
                  >
                    {phase.key}
                  </button>
                ))
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
        Configure Phases for {collectionName || 'Your Collection'}
      </h1>
      <p className="text-zinc-400 mb-6">
        Set prices, limits, and timings for each sale phase. Public phase is required. Only one phase can be active at a time.
      </p>

      {sortedPhases.length === 0 ? (
        <p className="text-zinc-400">No phases configured. Public phase will be added automatically.</p>
      ) : (
        <PhaseSettings
          collectionAddress={collectionAddress}
          phases={sortedPhases}
          onActivatePhase={handleActivatePhase}
          onRemovePhase={handleRemovePhase}
          nfts={nfts}
          isCollectionLaunched={isCollectionLaunched}
        />
      )}

      {toast.visible && (
        <div className={`fixed bottom-24 right-4 p-4 rounded-lg shadow-lg max-w-xs animate-fadeIn cursor-pointer hover:opacity-100 opacity-90 z-50 ${
          toast.type === 'error' ? 'bg-red-800 text-white' : 
          toast.type === 'info' ? 'bg-blue-800 text-white' : 
          'bg-zinc-800 text-white'
        }`}>
          <p className="text-sm">{toast.message}</p>
        </div>
      )}
    </main>
  );
};

export default PhaseSettingsWrapper;
