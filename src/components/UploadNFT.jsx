// src/components/UploadNFT.jsx
import { useEffect, useMemo, useState } from 'react';
import SingleNFT from './upload/SingleNFT';
import MultipleNFT from './upload/MultipleNFT';

const UploadNFT = ({ collectionAddress, isReady }) => {
  const [mode, setMode] = useState('single');
  const [collection, setCollection] = useState(null);

  useEffect(() => {
    if (!collectionAddress) {
      setCollection(null);
      return;
    }

    try {
      // Try detailed collection first
      const detailed = JSON.parse(localStorage.getItem(`collection_${collectionAddress}`) || 'null');
      if (detailed && detailed.address) {
        setCollection(detailed);
        return;
      }

      // Fallback to list
      const list = JSON.parse(localStorage.getItem('dreava_collections') || '[]');
      const found = Array.isArray(list) ? list.find(c => c.address === collectionAddress) : null;
      if (found) {
        setCollection(found);
        return;
      }

      // Minimal object
      setCollection({ address: collectionAddress });
    } catch {
      setCollection({ address: collectionAddress });
    }
  }, [collectionAddress]);

  const modes = [
    { key: 'single', label: 'Single NFT' },
    { key: 'multiple', label: 'Multiple NFTs' },
  ];

  const Warning = () => (
    <p className="text-xs text-center text-zinc-500 mt-2">
      ⚠️ Draft is not yet published. If you clear browser data, it may be lost.
    </p>
  );

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-4 text-sm font-medium border-b border-zinc-700 mb-4">
        {modes.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`px-4 py-2 transition-colors ${
              mode === key
                ? 'border-b-2 border-pink-500 text-pink-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mode-specific UI */}
      {mode === 'single' && (
        <>
          <SingleNFT collection={collection} />
          <Warning />
        </>
      )}

      {mode === 'multiple' && (
        <>
          <MultipleNFT collection={collection} />
          <Warning />
        </>
      )}
    </div>
  );
};

export default UploadNFT;
