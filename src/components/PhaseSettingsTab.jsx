// src/components/PhaseSettingsTab.jsx
import { useState, useEffect } from 'react';
import PhaseSettings from './PhaseSettings';
import { ethers } from 'ethers';
import nftAbi from '../abi/SomniaNFT.json';
import { Pause, Play, AlertTriangle, Loader2 } from 'lucide-react';

const PhaseSettingsTab = ({ collection }) => {
  const [phases, setPhases] = useState([]);
  const [nfts, setNfts] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [saleStatus, setSaleStatus] = useState({
    isInitialized: false,
    isPaused: false,
    isLoading: false
  });

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Проверка статуса продажи в блокчейне
  const checkSaleStatus = async () => {
    if (!collection?.address) return;
    
    try {
      setSaleStatus(prev => ({ ...prev, isLoading: true }));
      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
      const contract = new ethers.Contract(collection.address, nftAbi, provider);
      
      let isInitialized = false;
      let isPaused = false;
      
      try {
        // Проверяем, инициализирован ли контракт
        if (typeof contract.initialized === 'function') {
          isInitialized = await contract.initialized();
        }
        
        // Проверяем статус паузы (если функция существует)
        if (isInitialized && typeof contract.paused === 'function') {
          isPaused = await contract.paused();
        }
      } catch (error) {
        console.log('Contract not fully initialized or pause function not available');
      }
      
      setSaleStatus({
        isInitialized,
        isPaused,
        isLoading: false
      });
    } catch (error) {
      console.error('Error checking sale status:', error);
      setSaleStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Функция паузы продажи
  const handlePauseSale = async () => {
    if (!collection?.address) return;
    
    try {
      setSaleStatus(prev => ({ ...prev, isLoading: true }));
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(collection.address, nftAbi, signer);
      
      // Проверяем, что пользователь является владельцем
      const owner = await contract.owner();
      const userAddress = await signer.getAddress();
      
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        showToast('Only the collection owner can pause the sale', 'error');
        return;
      }
      
      const tx = await contract.pause();
      await tx.wait();
      
      showToast('Sale paused successfully!', 'success');
      await checkSaleStatus(); // Обновляем статус
    } catch (error) {
      console.error('Error pausing sale:', error);
      showToast(`Error pausing sale: ${error.message}`, 'error');
    } finally {
      setSaleStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Функция возобновления продажи
  const handleResumeSale = async () => {
    if (!collection?.address) return;
    
    try {
      setSaleStatus(prev => ({ ...prev, isLoading: true }));
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(collection.address, nftAbi, signer);
      
      // Проверяем, что пользователь является владельцем
      const owner = await contract.owner();
      const userAddress = await signer.getAddress();
      
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        showToast('Only the collection owner can resume the sale', 'error');
        return;
      }
      
      const tx = await contract.unpause();
      await tx.wait();
      
      showToast('Sale resumed successfully!', 'success');
      await checkSaleStatus(); // Обновляем статус
    } catch (error) {
      console.error('Error resuming sale:', error);
      showToast(`Error resuming sale: ${error.message}`, 'error');
    } finally {
      setSaleStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Load NFTs for the collection
  const loadNFTs = async () => {
    if (!collection?.address) return;
    
    try {
      const saved = JSON.parse(localStorage.getItem(`collection_${collection.address}_nfts`)) || [];
      setNfts(saved);
    } catch (error) {
      console.error('Error loading NFTs:', error);
    }
  };

  // Load phases for the collection
  const loadPhases = async () => {
    if (!collection?.address) {
      setPhases([]);
      return;
    }
    
    try {
      const saved = JSON.parse(localStorage.getItem(`phases_${collection.address}`)) || {};
      
      // Convert object to array format expected by PhaseSettings
      const phaseEntries = Object.entries(saved);
      const phasesArray = phaseEntries.map(([key, phase]) => ({
        key,
        enumValue: key === 'Whitelist' ? 1 : key === 'FCFS' ? 2 : 3,
        ...phase
      }));
      
      console.log('📋 Loaded phases for collection:', collection.address, phasesArray);
      setPhases(phasesArray);
    } catch (error) {
      console.error('Error loading phases:', error);
      setPhases([]); // Set empty array as fallback
    }
  };

  useEffect(() => {
    if (collection?.address) {
      loadNFTs();
      loadPhases();
      checkSaleStatus(); // Initial check on mount
    }
  }, [collection?.address]);

  const handleAddPhase = (phase) => {
    // This will be handled by PhaseSettings component
    console.log('Adding phase:', phase);
  };

  const handleRemovePhase = (keyToRemove) => {
    // This will be handled by PhaseSettings component
    console.log('Removing phase:', keyToRemove);
  };

  const handleActivatePhase = (phaseEnum) => {
    // This will be handled by PhaseSettings component
    console.log('Activating phase:', phaseEnum);
  };

  if (!collection) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-400">No collection selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Phase Settings Component */}
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-8 shadow-2xl">
        <PhaseSettings
          collectionAddress={collection.address}
          phases={phases}
          onActivatePhase={handleActivatePhase}
          onRemovePhase={handleRemovePhase}
          nfts={nfts}
          saleStatus={saleStatus}
          onPauseSale={handlePauseSale}
          onResumeSale={handleResumeSale}
        />
      </div>

      {/* Toast */}
      {toast.visible && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
        } text-white`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default PhaseSettingsTab; 