// src/components/CollectionStatsTab.jsx
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { BarChart3, TrendingUp, Users, Coins, Download, ExternalLink, DollarSign, RefreshCw } from 'lucide-react';
import nftAbi from '../abi/SomniaNFT.json';
import somniaLogo from '../assets/somnia-logo.svg';

const CollectionStatsTab = ({ collection }) => {
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', txHash: '' });
  const [stats, setStats] = useState({
    totalSupply: 0,
    maxSupply: 0,
    totalRevenue: '0',
    potentialRevenue: '0',
    totalMints: 0,
    uniqueHolders: 0,
    averagePrice: '0',
    phases: [],
    contractBalance: 0,
    contractOwner: '',
    canWithdraw: false
  });

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const showToast = (message, txHash = '') => {
    setToast({ visible: true, message, txHash });
  };

  const loadCollectionStats = async () => {
    if (!collection?.address) return;
    
    try {
      setLoading(true);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(collection.address, nftAbi, provider);
      
      // Get contract balance (this is the actual rewards available)
      const contractBalance = await provider.getBalance(collection.address);
      const balanceInSTT = ethers.formatUnits(contractBalance, 18);
      
      console.log('🔗 Contract balance (rewards):', balanceInSTT, 'STT');
      
      // Load NFTs from localStorage (uploaded NFTs)
      const uploadedNFTs = JSON.parse(localStorage.getItem(`collection_${collection.address}_nfts`) || '[]');
      console.log('📦 Uploaded NFTs count:', uploadedNFTs.length);
      
      // Load phases data
      const phases = JSON.parse(localStorage.getItem(`phases_${collection.address}`)) || {};
      const phaseStats = Object.entries(phases).map(([key, phase]) => ({
        name: key,
        price: phase.price || '0',
        allocated: phase.allocated || 0,
        start: phase.start,
        end: phase.end,
        active: phase.active !== false
      }));
      
      console.log('📅 Phase stats:', phaseStats);
      
      // Calculate potential revenue from phases
      const potentialRevenue = phaseStats.reduce((sum, phase) => {
        const price = parseFloat(phase.price) || 0;
        const allocated = parseInt(phase.allocated) || 0;
        return sum + (price * allocated);
      }, 0);
      
      console.log('💰 Potential revenue from phases:', potentialRevenue);
      
      // Try to get blockchain data
      let blockchainData = null;
      try {
        const [totalSupply, maxSupply] = await Promise.all([
          contract.totalSupply(),
          contract.maxSupply()
        ]);
        
        blockchainData = {
          totalSupply: Number(totalSupply),
          maxSupply: Number(maxSupply),
          totalMinted: Number(totalSupply)
        };
        console.log('🔗 Blockchain data:', blockchainData);
      } catch (error) {
        console.log('⚠️ Blockchain data not available (sale might not have started):', error.message);
        blockchainData = null;
      }
      
      // Get contract owner info
      const contractOwner = await contract.owner();
      const signer = await provider.getSigner();
      const currentUser = await signer.getAddress();
      const canWithdraw = contractOwner.toLowerCase() === currentUser.toLowerCase();
      
      console.log('🔗 Contract owner:', contractOwner);
      console.log('🔗 Current user:', currentUser);
      console.log('🔗 Can withdraw:', canWithdraw);
      
      // Determine if sale has started (if we have blockchain data and totalSupply > 0)
      const saleHasStarted = blockchainData && blockchainData.totalMinted > 0;
      
              const stats = {
          // Use blockchain data if available, otherwise use uploaded NFTs count
          totalSupply: blockchainData ? blockchainData.maxSupply : uploadedNFTs.length,
          maxSupply: blockchainData ? blockchainData.maxSupply : uploadedNFTs.length,
          totalMinted: blockchainData ? blockchainData.totalMinted : 0,
          uploadedNFTs: uploadedNFTs.length, // Always show uploaded NFTs count
          totalRevenue: parseFloat(balanceInSTT).toFixed(3), // Real contract balance
          potentialRevenue: potentialRevenue.toFixed(2), // Potential from phases
          uniqueHolders: blockchainData ? Math.floor(blockchainData.totalMinted * 0.8) : 0,
          averagePrice: uploadedNFTs.length > 0 ? (potentialRevenue / uploadedNFTs.length).toFixed(2) : '0',
          phases: phaseStats,
          contractBalance: parseFloat(balanceInSTT),
          contractOwner: contractOwner,
          canWithdraw: canWithdraw,
          saleHasStarted: saleHasStarted
        };
      
      console.log('💰 Final stats:', stats);
      console.log('🎯 Sale has started:', saleHasStarted);
      setStats(stats);
      
      // Save stats to localStorage for other components to use
      localStorage.setItem(`collection_${collection.address}_real_stats`, JSON.stringify(stats));
    } catch (error) {
      console.error('Error loading collection stats:', error);
      showToast('Failed to load collection statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (collection?.address) {
      loadCollectionStats();
    }
  }, [collection?.address]);

  const handleWithdrawRewards = async () => {
    if (!collection?.address) return;
    
    try {
      setWithdrawing(true);
      
      // Connect to wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(collection.address, nftAbi, signer);
      
      // Check if user has permissions
      const signerAddress = await signer.getAddress();
      const contractOwner = await contract.owner();
      
      if (signerAddress.toLowerCase() !== contractOwner.toLowerCase()) {
        showToast('❌ Only contract owner can withdraw rewards');
        return;
      }
      
      // Check contract balance
      const balance = await provider.getBalance(collection.address);
      
      if (balance === 0n) {
        showToast('❌ No rewards available to withdraw');
        return;
      }
      
      console.log('💰 Withdrawing balance:', ethers.formatUnits(balance, 18), 'STT');
      
      // Withdraw rewards
      const tx = await contract.withdraw();
      showToast('⏳ Withdrawing rewards...');
      
      await tx.wait();
      showToast('✅ Rewards withdrawn successfully!', tx.hash);
      
      // Reload stats
      loadCollectionStats();
    } catch (error) {
      console.error('Error withdrawing rewards:', error);
      
      // Provide more specific error messages
      if (error.message.includes('user rejected')) {
        showToast('❌ Transaction was cancelled by user');
      } else if (error.message.includes('insufficient funds')) {
        showToast('❌ Insufficient gas fees for transaction');
      } else if (error.message.includes('execution reverted')) {
        showToast('❌ Transaction failed - check contract permissions');
      } else {
        showToast(`❌ Failed to withdraw rewards: ${error.message}`);
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Not set';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!collection) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-400">No collection selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-zinc-400">Uploaded NFTs</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : stats.uploadedNFTs}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {stats.saleHasStarted ? '✅ Sale Active' : '⏳ Pre-sale'}
          </div>
        </div>
        
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-sm text-zinc-400">Available Rewards</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : `${stats.totalRevenue} STT`}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {stats.canWithdraw ? '✅ Can withdraw' : '❌ Not owner'}
          </div>
        </div>
        
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-pink-400" />
            <span className="text-sm text-zinc-400">Total Mints</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : stats.totalMinted}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {stats.saleHasStarted ? '🔗 From blockchain' : '📦 From uploads'}
          </div>
        </div>
        
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-zinc-400">Potential Revenue</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : `${stats.potentialRevenue} STT`}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            From configured phases
          </div>
        </div>
      </div>
      
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadCollectionStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Phase Statistics */}
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Phase Configuration</h4>
          <div className="text-sm text-zinc-400">
            {stats.phases?.length || 0} phases configured
          </div>
        </div>
        
        {stats.phases && stats.phases.length > 0 ? (
          <div className="space-y-4">
            {stats.phases.map((phase, index) => {
              const now = Math.floor(Date.now() / 1000);
              const isActive = phase.active && phase.start <= now && phase.end >= now;
              const isUpcoming = phase.start > now;
              const isPast = phase.end < now;
              
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      isActive ? 'bg-green-500' : 
                      isUpcoming ? 'bg-yellow-500' : 
                      isPast ? 'bg-gray-500' : 'bg-gray-500'
                    }`} />
                    <div>
                      <h5 className="font-semibold text-white">{phase.name}</h5>
                      <p className="text-sm text-zinc-400">
                        {formatDate(phase.start)} - {formatDate(phase.end)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{phase.price} STT</div>
                    <div className="text-sm text-zinc-400">{phase.allocated} NFTs</div>
                    <div className="text-xs text-zinc-500">
                      Potential: {(parseFloat(phase.price) * phase.allocated).toFixed(2)} STT
                    </div>
                    <div className="text-xs mt-1">
                      {isActive ? (
                        <span className="text-green-400">● Active</span>
                      ) : isUpcoming ? (
                        <span className="text-yellow-400">● Upcoming</span>
                      ) : isPast ? (
                        <span className="text-gray-400">● Ended</span>
                      ) : (
                        <span className="text-gray-400">● Inactive</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Total Potential Revenue:</span>
                <span className="text-lg font-bold text-white">{stats.potentialRevenue} STT</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-zinc-400">Sale Status:</span>
                <span className={`text-sm font-medium ${
                  stats.saleHasStarted ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {stats.saleHasStarted ? 'Active' : 'Not Started'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-zinc-400 mb-2">No phases configured</p>
            <p className="text-xs text-zinc-500">Configure phases in the "Phase Settings" tab to see potential revenue</p>
          </div>
        )}
      </div>

      {/* Rewards Section */}
      <div className="bg-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Rewards & Withdrawals</h4>
          <button
            onClick={loadCollectionStats}
            disabled={loading}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors duration-200"
          >
            Refresh
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-3">
              <img src={somniaLogo} alt="STT" className="w-6 h-6" />
              <div>
                <h5 className="font-semibold text-white">Contract Balance (Rewards)</h5>
                <p className="text-sm text-zinc-400">Money earned from NFT mints</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-white">
                {loading ? '...' : `${stats.totalRevenue} STT`}
              </div>
              <div className="text-xs text-zinc-500">
                {stats.canWithdraw ? '✅ Can withdraw' : '❌ Not owner'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              <div>
                <h5 className="font-semibold text-white">Potential Revenue</h5>
                <p className="text-sm text-zinc-400">From configured phases</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-white">
                {loading ? '...' : `${stats.potentialRevenue} STT`}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-green-400" />
              <div>
                <h5 className="font-semibold text-white">Total Mints</h5>
                <p className="text-sm text-zinc-400">NFTs minted so far</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-white">
                {loading ? '...' : `${stats.totalMinted}/${stats.maxSupply}`}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleWithdrawRewards}
            disabled={withdrawing || loading || parseFloat(stats.totalRevenue) === 0 || !stats.canWithdraw}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            {withdrawing ? 'Withdrawing...' : 'Withdraw Rewards'}
          </button>
          
          <div className="text-xs text-zinc-500 space-y-1">
            <p className="text-center">
              {stats.canWithdraw 
                ? '✅ You are the contract owner and can withdraw rewards' 
                : '❌ Only collection owner can withdraw rewards'
              }
            </p>
            <p className="text-center">
              Contract Owner: {stats.contractOwner ? `${stats.contractOwner.substring(0, 6)}...${stats.contractOwner.substring(38)}` : 'Loading...'}
            </p>
            <p className="text-center">
              <a 
                href={`https://shannon-explorer.somnia.network/address/${collection.address}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 hover:underline"
              >
                View Contract on Explorer
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Export Data */}
      <div className="bg-zinc-800/50 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Export Data</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                const data = {
                  collection: collection.name,
                  address: collection.address,
                  stats: stats,
                  timestamp: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${collection.name}_stats.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('✅ Statistics exported successfully');
              } catch (error) {
                console.error('Export error:', error);
                showToast('❌ Failed to export statistics');
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors duration-200"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          
          <button
            onClick={() => {
              window.open(`https://shannon-explorer.somnia.network/address/${collection.address}`, '_blank');
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors duration-200"
          >
            <ExternalLink className="w-4 h-4" />
            View Contract
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast.visible && (
        <div className="fixed bottom-20 right-4 bg-zinc-900/95 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl max-w-xs animate-fadeIn cursor-pointer hover:opacity-100 opacity-90 border border-zinc-700/50 hover:border-pink-500/50 transition-all duration-300 hover:scale-105">
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
    </div>
  );
};

export default CollectionStatsTab; 