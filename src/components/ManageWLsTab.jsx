// src/components/ManageWLsTab.jsx
import { useState, useEffect } from 'react';
import { ExternalLink, Upload, Users, Trash2 } from 'lucide-react';
import { generateMerkleData, validateAddresses } from '../utils/hashUtils';

const ManageWLsTab = ({ collection }) => {
  const [phase, setPhase] = useState('Whitelist');
  const [addresses, setAddresses] = useState([]);
  const [search, setSearch] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [allocated, setAllocated] = useState(0);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    if (!collection?.address) return;
    
    const phaseSettings = JSON.parse(localStorage.getItem(`phases_${collection.address}`)) || {};
    setAllocated(phaseSettings[phase]?.allocated || 0);

    const key = `${collection.address}_${phase}_whitelist`;
    const saved = JSON.parse(localStorage.getItem(key)) || [];
    setSavedAddresses(saved);
  }, [collection?.address, phase]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(Boolean);
        setAddresses(lines);
      };
      reader.readAsText(file);
    }
  };

  const handleManualInput = (e) => {
    const text = e.target.value;
    const lines = text.split(/\r?\n/).filter(Boolean);
    setAddresses(lines);
  };

  const handleSave = () => {
    const isPublicPhase = phase === 'Public';
    const totalAddresses = savedAddresses.length + addresses.length;

    // Проверяем валидность новых адресов
    const { valid, invalid } = validateAddresses(addresses);

    if (invalid.length > 0) {
      showToast(`❌ Invalid addresses found: ${invalid.join(', ')}`, 'error');
      return;
    }

    if (!isPublicPhase && totalAddresses > allocated) {
      showToast(`❌ Too many addresses! Allocated: ${allocated}, Already saved: ${savedAddresses.length}, New: ${addresses.length}`, 'error');
      return;
    }

    const combined = Array.from(new Set([...savedAddresses, ...valid]));
    
    const key = `${collection.address}_${phase}_whitelist`;
    localStorage.setItem(key, JSON.stringify(combined));
    setSavedAddresses(combined);
    setAddresses([]);
    showToast(`✅ Saved ${combined.length} addresses for ${phase}`);

    // Regenerate proofs
    regenerateProofs(combined);
    
    // Save to IPFS via server
    if (!isPublicPhase && combined.length > 0) {
      saveWhitelistToServer(combined);
    }
  };

  const regenerateProofs = (combined) => {
    if (combined.length === 0) return;
    
    const { root, proofs } = generateMerkleData(combined);
    
    // Save root and proofs
    const rootKey = `${collection.address}_${phase}_merkle_root`;
    const proofsKey = `${collection.address}_${phase}_merkle_proofs`;
    
    localStorage.setItem(rootKey, root);
    localStorage.setItem(proofsKey, JSON.stringify(proofs));
    
    console.log('✅ Merkle root and proofs saved for', phase);
  };

  const saveWhitelistToServer = async (addresses) => {
    try {
              const response = await fetch('/api/whitelist/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: collection.address,
          phase: phase,
          addresses: addresses
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Save IPFS URL
        const ipfsUrlKey = `${collection.address}_${phase}_whitelist_ipfs`;
        localStorage.setItem(ipfsUrlKey, data.data.ipfsUrl);
        
        showToast(`🌐 Whitelist also saved to IPFS (${data.data.addressCount} addresses)`);
      } else {
        showToast('⚠️ Local storage saved, but IPFS backup failed', 'warning');
      }
    } catch (error) {
      console.error('❌ Server save failed:', error);
      showToast('⚠️ Local storage saved, but IPFS backup failed', 'warning');
    }
  };

  const removeAddress = (addressToRemove) => {
    const filtered = savedAddresses.filter(addr => addr !== addressToRemove);
    setSavedAddresses(filtered);
    
    const key = `${collection.address}_${phase}_whitelist`;
    localStorage.setItem(key, JSON.stringify(filtered));
    
    showToast(`✅ Removed ${addressToRemove}`);
    regenerateProofs(filtered);
  };

  const filteredAddresses = savedAddresses.filter(addr => 
    addr.toLowerCase().includes(search.toLowerCase())
  );

  if (!collection) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-400">No collection selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Phase Selection */}
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-8 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Select Phase</h3>
        <div className="flex gap-4">
          <button
            onClick={() => setPhase('Whitelist')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              phase === 'Whitelist'
                ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg'
                : 'bg-zinc-700 hover:bg-zinc-600 text-white'
            }`}
          >
            Whitelist
          </button>
          <button
            onClick={() => setPhase('FCFS')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              phase === 'FCFS'
                ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg'
                : 'bg-zinc-700 hover:bg-zinc-600 text-white'
            }`}
          >
            FCFS
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-6 shadow-2xl">
          <div className="text-2xl font-bold text-blue-400">{savedAddresses.length}</div>
          <div className="text-sm text-zinc-400">Total Addresses</div>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-6 shadow-2xl">
          <div className="text-2xl font-bold text-green-400">{allocated}</div>
          <div className="text-sm text-zinc-400">Allocated Slots</div>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-6 shadow-2xl">
          <div className="text-2xl font-bold text-pink-400">{addresses.length}</div>
          <div className="text-sm text-zinc-400">New Addresses</div>
        </div>
      </div>

      {/* Add Addresses */}
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-8 shadow-2xl">
        <h4 className="text-lg font-semibold text-white mb-4">Add Addresses</h4>
        
        {/* File Upload */}
        <div className="mb-4">
          <label className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg cursor-pointer transition-colors duration-200">
            <Upload className="w-4 h-4" />
            Upload CSV/TXT File
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Manual Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Manual Input (one address per line)
          </label>
          <textarea
            value={addresses.join('\n')}
            onChange={handleManualInput}
            placeholder="0x1234...\n0x5678...\n0x9abc..."
            className="w-full h-32 p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={addresses.length === 0}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Addresses
        </button>
      </div>

      {/* Saved Addresses */}
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Saved Addresses</h4>
          <input
            type="text"
            placeholder="Search addresses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredAddresses.map((address, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
              <span className="text-sm font-mono text-zinc-300">{address}</span>
              <button
                onClick={() => removeAddress(address)}
                className="text-red-400 hover:text-red-300 transition-colors duration-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
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

export default ManageWLsTab; 