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
    toast.error(`❌ Invalid addresses found: ${invalidAddresses.join(', ')}`, {
      autoClose: 5000,
    });
    return;
  }

  if (!isPublicPhase && totalAddresses > allocated) {
    toast.error(`❌ Too many addresses! Allocated: ${allocated}, Already saved: ${savedAddresses.length}, New: ${addresses.length}`, {
      autoClose: 3000,
    });
    return;
  }

  const combined = Array.from(new Set([...savedAddresses, ...addresses]));
  console.log('Combined addresses (unique):', combined);
  console.log('Combined count:', combined.length);
  
  const key = `${address}_${phase}_whitelist`;
  localStorage.setItem(key, JSON.stringify(combined));
  setSavedAddresses(combined);
  setAddresses([]);
  toast.success(`✅ Saved ${combined.length} addresses for ${phase}`, {
    autoClose: 3000,
  });

  regenerateProofs(combined);
  
  // 🔥 НОВОЕ: Сохраняем whitelist в IPFS через сервер
  if (!isPublicPhase && combined.length > 0) {
    saveWhitelistToServer(combined);
  }
  
  console.log('💾 === END SAVE DEBUG ===');
};

// 🔥 НОВАЯ ФУНКЦИЯ: Сохранение whitelist в IPFS через сервер
const saveWhitelistToServer = async (addresses) => {
  try {
    console.log('🌐 === SAVE TO SERVER ===');
    console.log('Saving whitelist to IPFS via server:', { collection: address, phase, addressCount: addresses.length });
    
            const response = await fetch('/api/whitelist/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection: address,
        phase: phase,
        addresses: addresses
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Whitelist saved to IPFS:', data);
      
      // Сохраняем IPFS URL в localStorage для фронтенда
      const ipfsUrlKey = `${address}_${phase}_whitelist_ipfs`;
      localStorage.setItem(ipfsUrlKey, data.data.ipfsUrl);
      console.log('✅ IPFS URL saved to localStorage:', data.data.ipfsUrl);
      
      toast.success(`🌐 Whitelist also saved to IPFS (${data.data.addressCount} addresses)`, {
        autoClose: 3000,
      });
    } else {
      console.warn('⚠️ Failed to save whitelist to IPFS, but local storage is fine');
      toast.warn('⚠️ Local storage saved, but IPFS backup failed', {
        autoClose: 3000,
      });
    }
  } catch (error) {
    console.error('❌ Server save failed:', error);
    toast.warn('⚠️ Local storage saved, but IPFS backup failed', {
      autoClose: 3000,
    });
  }
};

          {/* Debug button */}
          <button
            onClick={() => {
              const proofsKey = `${address}_${phase}_whitelist_proofs`;
              const rootKey = `${address}_${phase}_whitelist_root`;
              const proofs = JSON.parse(localStorage.getItem(proofsKey) || '{}');
              const root = localStorage.getItem(rootKey);
              console.log('🔍 === DEBUG CURRENT PROOFS ===');
              console.log('Phase:', phase);
              console.log('Collection address:', address);
              console.log('Proofs key:', proofsKey);
              console.log('Root key:', rootKey);
              console.log('Current root:', root);
              console.log('Current proofs:', proofs);
              console.log('Proofs count:', Object.keys(proofs).length);
              console.log('🔍 === END DEBUG CURRENT PROOFS ===');
            }}
            className="w-full mt-2 py-2 rounded bg-zinc-600 hover:bg-zinc-500 text-white font-semibold text-sm"
          >
            Debug Current Proofs
          </button>
          
          {/* Test Server Button */}
          <button
            onClick={async () => {
              try {
                console.log('🧪 === TESTING SERVER ===');
                const response = await fetch('/api/status');
                if (response.ok) {
                  const data = await response.json();
                  console.log('✅ Server status:', data);
                  toast.success('✅ Server is online and working!', {
                    autoClose: 3000,
                  });
                } else {
                  throw new Error(`Server responded with ${response.status}`);
                }
              } catch (error) {
                console.error('❌ Server test failed:', error);
                toast.error('❌ Server is offline or not responding', {
                  autoClose: 3000,
                });
              }
            }}
            className="w-full mt-2 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-semibold text-sm"
          >
            Test Server Connection
          </button> 