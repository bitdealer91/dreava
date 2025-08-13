// src/pages/CreateNFTs.jsx
import { useState } from 'react';
import UploadNFT from '../components/UploadNFT';
import CollectionSelector from '../components/CollectionSelector';

const CreateNFTs = () => {
  const [selectedCollection, setSelectedCollection] = useState(null);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 text-white space-y-8">
      {/* Tabs always visible */}
      <div className="space-y-4">
        <CollectionSelector selected={selectedCollection} onSelect={setSelectedCollection} />
      </div>

      {/* Only blur UploadNFT if not ready */}
      <div
        className={`rounded-2xl transition-all p-6 border bg-zinc-900 border-zinc-800 shadow-lg ${
          selectedCollection ? '' : 'opacity-30 pointer-events-none select-none blur-sm'
        }`}
      >
        <UploadNFT collectionAddress={selectedCollection?.address} isReady={!!selectedCollection} />
      </div>
    </main>
  );
};

export default CreateNFTs;
