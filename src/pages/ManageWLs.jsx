import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { generateMerkleData } from '../utils/hashUtils';

const ManageWLs = () => {
  const { address } = useParams();
  const navigate = useNavigate();
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
    const phaseSettings = JSON.parse(localStorage.getItem(`phases_${address}`)) || {};
    setAllocated(phaseSettings[phase]?.allocated || 0);

    const key = `${address}_${phase}_whitelist`;
    const saved = JSON.parse(localStorage.getItem(key)) || [];
    setSavedAddresses(saved);
  }, [address, phase]);

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
    console.log('🔍 === MANUAL INPUT DEBUG ===');
    console.log('Raw text:', text);
    console.log('Text length:', text.length);
    console.log('Text char codes:', Array.from(text).map(c => c.charCodeAt(0)));
    
    const lines = text.split(/\r?\n/).filter(Boolean);
    console.log('Split lines:', lines);
    console.log('Lines count:', lines.length);
    console.log('Each line:', lines.map((line, idx) => ({ index: idx, line, length: line.length, trimmed: line.trim() })));
    
    // Дополнительная очистка и валидация адресов
    const cleanedLines = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => {
        try {
          // Проверяем, что это валидный Ethereum адрес
          getAddress(line);
          return true;
        } catch (error) {
          console.warn('Invalid Ethereum address:', line, error.message);
          return false;
        }
      });
    
    console.log('Cleaned and validated lines:', cleanedLines);
    console.log('🔍 === END MANUAL INPUT DEBUG ===');
    
    setAddresses(cleanedLines);
  };

  // --- Генерация и сохранение Merkle proofs и root ---
  const regenerateProofs = (combined) => {
    if (phase === 'Public' || combined.length === 0) return;
    
    console.log('🌳 === MERKLE DEBUG ===');
    console.log('Input addresses:', combined);
    console.log('Phase:', phase);
    
    const { root, proofs } = generateMerkleData(combined);
    
    console.log('Generated root:', root);
    console.log('Generated proofs for each address:');
    Object.entries(proofs).forEach(([addr, proof]) => {
      console.log(`  ${addr}:`, proof);
    });
    
    const proofsKey = `${address}_${phase}_whitelist_proofs`;
    const rootKey = `${address}_${phase}_whitelist_root`;
    localStorage.setItem(proofsKey, JSON.stringify(proofs));
    localStorage.setItem(rootKey, root);
    console.log('Merkle root:', root);
    console.log('Merkle proofs regenerated:', proofs);
    console.log('🌳 === END MERKLE DEBUG ===');
  };

  const handleSave = () => {
    const isPublicPhase = phase === 'Public';
    const totalAddresses = savedAddresses.length + addresses.length;

    console.log('💾 === SAVE DEBUG ===');
    console.log('Phase:', phase);
    console.log('Is public phase:', isPublicPhase);
    console.log('Allocated slots:', allocated);
    console.log('Saved addresses count:', savedAddresses.length);
    console.log('New addresses count:', addresses.length);
    console.log('Total addresses:', totalAddresses);
    console.log('New addresses:', addresses);
    console.log('Saved addresses:', savedAddresses);

    // Проверяем валидность новых адресов
    const invalidAddresses = addresses.filter(addr => {
      try {
        getAddress(addr);
        return false;
      } catch {
        return true;
      }
    });

    if (invalidAddresses.length > 0) {
      showToast(`❌ Invalid addresses found: ${invalidAddresses.join(', ')}`, 'error');
      return;
    }

    if (!isPublicPhase && totalAddresses > allocated) {
      showToast(`❌ Too many addresses! Allocated: ${allocated}, Already saved: ${savedAddresses.length}, New: ${addresses.length}`, 'error');
      return;
    }

    const combined = Array.from(new Set([...savedAddresses, ...addresses]));
    console.log('Combined addresses (unique):', combined);
    console.log('Combined count:', combined.length);
    
    const key = `${address}_${phase}_whitelist`;
    localStorage.setItem(key, JSON.stringify(combined));
    setSavedAddresses(combined);
    setAddresses([]);
    showToast(`✅ Saved ${combined.length} addresses for ${phase}`);

    regenerateProofs(combined);
    console.log('💾 === END SAVE DEBUG ===');
  };

  const filteredSaved = savedAddresses.filter(addr => addr.includes(search));

  return (
          <main className="max-w-4xl mx-auto px-4 py-8 pb-24 text-white font-sans">
      <button
        onClick={() => navigate(-1)}
        className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm mb-4"
      >
        ← Back
      </button>
      <h1 className="text-3xl font-bold mb-4">Manage Whitelists</h1>

      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium text-white">Select Phase</label>
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-600 focus:border-blue-500 focus:outline-none transition-colors text-white"
        >
          <option value="Whitelist">Whitelist</option>
          <option value="FCFS">FCFS</option>
        </select>
      </div>

      <div className="mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-700">
        <h3 className="text-lg font-semibold mb-3 text-white">Phase Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-zinc-800 rounded-lg">
            <div className="text-zinc-400 mb-1">Allocated Slots</div>
            <div className="text-xl font-bold text-blue-400">{phase === 'Public' ? '∞' : allocated}</div>
          </div>
          <div className="text-center p-3 bg-zinc-800 rounded-lg">
            <div className="text-zinc-400 mb-1">Saved Addresses</div>
            <div className="text-xl font-bold text-green-400">{savedAddresses.length}</div>
          </div>
          <div className="text-center p-3 bg-zinc-800 rounded-lg">
            <div className="text-zinc-400 mb-1">Remaining Slots</div>
            <div className="text-xl font-bold text-pink-400">{phase === 'Public' ? '∞' : Math.max(allocated - savedAddresses.length, 0)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4 text-white">Upload Addresses</h2>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Upload Addresses</label>
            <div className="relative">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-full h-12 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:opacity-90 text-white font-semibold text-sm cursor-pointer transition-all duration-200 border border-transparent hover:border-white/20"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Upload .CSV/.TXT
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Or Paste Addresses</label>
            <textarea
              rows={6}
              placeholder="Paste addresses (one per line)"
              onChange={handleManualInput}
              className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-600 focus:border-blue-500 focus:outline-none transition-colors"
            ></textarea>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 text-white font-semibold transition-all duration-200"
          >
            Save List
          </button>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-white">Saved Addresses</h2>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">Search Addresses</label>
            <input
              type="text"
              placeholder="Search address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-600 focus:border-blue-500 focus:outline-none transition-colors text-sm"
            />
          </div>
          <div className="bg-zinc-900 rounded-lg border border-zinc-700 max-h-64 overflow-y-auto">
            {filteredSaved.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">No matching addresses</div>
            ) : (
              <ul className="text-sm">
                {filteredSaved.map((addr, idx) => (
                  <li key={idx} className="flex justify-between items-center border-b border-zinc-700 py-3 px-4 hover:bg-zinc-800 transition-colors">
                    <span className="font-mono text-xs">{addr}</span>
                    <button
                      onClick={() => {
                        const updated = savedAddresses.filter(a => a !== addr);
                        setSavedAddresses(updated);
                        localStorage.setItem(`${address}_${phase}_whitelist`, JSON.stringify(updated));
                        regenerateProofs(updated);
                        showToast(`✅ Removed address: ${addr}`);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {toast.visible && (
        <div className={`fixed bottom-24 right-4 p-4 rounded-lg shadow-lg max-w-xs animate-fadeIn cursor-pointer hover:opacity-100 opacity-90 z-50 ${
          toast.type === 'error' ? 'bg-red-800 text-white' : 'bg-zinc-800 text-white'
        }`}>
          <p className="text-sm">{toast.message}</p>
        </div>
      )}
    </main>
  );
};

export default ManageWLs;
