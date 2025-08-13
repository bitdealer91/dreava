// src/pages/CreateDreams.jsx
import { useState } from 'react';
import { X } from 'lucide-react';
import CreateCollection from '../components/CreateCollection';
import CollectionSelector from '../components/CollectionSelector';
import SingleNFT from '../components/upload/SingleNFT';
import MultipleNFT from '../components/upload/MultipleNFT';
import CollectionManager from '../components/CollectionManager';
import BackgroundCircles from '../components/BackgroundCircles';

const CreateDreams = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [uploadTab, setUploadTab] = useState(0); // 0 for single, 1 for multiple
  const [newlyCreatedCollection, setNewlyCreatedCollection] = useState(null);
  const [recentlyUploadedNFTs, setRecentlyUploadedNFTs] = useState(null);

  const tabs = [
    { id: 0, name: 'Collection Identity' },
    { id: 1, name: 'Populate Collection' },
    { id: 2, name: 'Studio Dashboard' }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 1) {
      setSelectedCollection(null);
      setUploadTab(0); // Reset upload tab to single when switching to Populate Collection
    }
  };

  const handleCollectionSelect = (collection) => {
    console.log('🎯 Selected collection:', collection);
    if (!collection || !collection.address) {
      console.error('Invalid collection selected:', collection);
      return;
    }
    setSelectedCollection(collection);
    // Очищаем индикатор недавно загруженных NFT при смене коллекции
    setRecentlyUploadedNFTs(null);
  };

  const handleCreateNewCollection = () => {
    // Switch to Collection Identity tab to create a new collection
    setActiveTab(0);
    setSelectedCollection(null);
  };

  const handleCollectionCreated = (collectionData) => {
    // When a collection is successfully created, switch to Populate Collection tab
    console.log('🎉 Collection created successfully:', collectionData);
    
    if (!collectionData) {
      console.error('❌ No collection data received');
      return;
    }

    // Persist into local "created collections" list (already done in CreateCollection, but ensure uniqueness)
    try {
      const saved = JSON.parse(localStorage.getItem('dreava_collections') || '[]');
      const exists = saved.some((c) => c && c.address && c.address.toLowerCase() === collectionData.address.toLowerCase());
      if (!exists) {
        localStorage.setItem('dreava_collections', JSON.stringify([collectionData, ...saved]));
      }
    } catch {}

    // Also refresh user-specific cache bucket if we have current account
    try {
      if (window.ethereum) {
        window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
          const user = accounts && accounts[0];
          if (user) {
            const key = `dreava_user_collections_${user.toLowerCase()}`;
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : { ts: Date.now(), collections: [] };
            const merged = Array.isArray(parsed.collections) ? parsed.collections : [];
            const map = new Map(merged.map((c) => [c.address?.toLowerCase(), c]));
            map.set(collectionData.address.toLowerCase(), collectionData);
            localStorage.setItem(key, JSON.stringify({ ts: Date.now(), collections: Array.from(map.values()) }));
          }
        }).catch(() => {});
      }
    } catch {}
    
    // Небольшая задержка для плавного перехода
    setTimeout(() => {
      setNewlyCreatedCollection(collectionData);
      setSelectedCollection(collectionData);
      setActiveTab(1);
      
      console.log('✅ Switched to Populate Collection tab with selected collection:', collectionData.name);
    }, 300);
  };

  const handleNFTUploadSuccess = (uploadData) => {
    // When NFTs are successfully uploaded, switch to Studio Dashboard tab
    console.log('🎉 NFT upload successful:', uploadData);
    
    if (uploadData) {
      if (uploadData.type === 'single') {
        console.log(`✅ Single NFT "${uploadData.nft.name}" uploaded successfully`);
      } else if (uploadData.type === 'multiple') {
        console.log(`✅ ${uploadData.totalUploaded} NFTs uploaded successfully, ${uploadData.totalFailed} failed`);
      }
    }
    
    // Небольшая задержка для плавного перехода
    setTimeout(() => {
      setActiveTab(2);
      setRecentlyUploadedNFTs(uploadData);
    }, 300);
  };



  return (
    <div className="min-h-screen bg-black text-white">
      <BackgroundCircles />
      {/* Header */}
              <div className="bg-zinc-900 border-b border-zinc-800 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] bg-clip-text text-transparent">
                Create Your Dreams
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Build, populate, and manage your NFT collections
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-zinc-900 border-b border-zinc-800 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-4 px-6 font-medium transition-all duration-200 border-b-2 ${
                  activeTab === tab.id
                    ? 'text-white border-pink-500 bg-gradient-to-r from-pink-500/10 to-blue-500/10'
                    : 'text-zinc-400 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 pb-24 relative z-10">
        <div className="animate-fadeIn">
          {activeTab === 0 && (
            <div>
              <CreateCollection onSuccess={handleCollectionCreated} />
            </div>
          )}

          {activeTab === 1 && (
            <div className="max-w-4xl mx-auto">
              {!selectedCollection ? (
                <div className="py-12">
                  <h3 className="text-xl font-semibold text-white mb-4">Populate Collection</h3>
                  <p className="text-zinc-400 mb-6">Select a collection to add NFTs</p>
                  <CollectionSelector 
                    onSelect={handleCollectionSelect}
                    showCreateButton={true}
                    onCreateNew={handleCreateNewCollection}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Collection Image */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-700/30 bg-zinc-800 flex-shrink-0">
                        {selectedCollection.cover || selectedCollection.image || selectedCollection.banner ? (
                          <img
                            src={selectedCollection.cover || selectedCollection.image || selectedCollection.banner}
                            alt={selectedCollection.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="w-full h-full flex items-center justify-center" style={{ display: selectedCollection.cover || selectedCollection.image || selectedCollection.banner ? 'none' : 'flex' }}>
                          <div className="w-8 h-8 bg-zinc-600 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-semibold text-white">Populate Collection</h3>
                        <p className="text-zinc-400">
                          Selected: {selectedCollection.name}
                          {newlyCreatedCollection && newlyCreatedCollection.address === selectedCollection.address && (
                            <span className="ml-2 text-green-400 text-sm">✨ Newly Created</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCollection(null)}
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      Change Collection
                    </button>
                  </div>
                  
                  {/* NFT Upload Tabs - Same style as Studio Dashboard */}
                  <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-8 shadow-2xl">
                    {/* Tab Headers */}
                    <div className="flex border-b border-zinc-700 mb-6">
                      <button
                        onClick={() => setUploadTab(0)}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-all duration-200 ${
                          uploadTab === 0
                            ? 'text-white border-b-2 border-pink-500 bg-gradient-to-r from-pink-500/10 to-blue-500/10'
                            : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Single NFT</span>
                      </button>
                      <button
                        onClick={() => setUploadTab(1)}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-all duration-200 ${
                          uploadTab === 1
                            ? 'text-white border-b-2 border-pink-500 bg-gradient-to-r from-pink-500/10 to-blue-500/10'
                            : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span>Multiple NFTs</span>
                      </button>
                    </div>
                    
                    {/* Tab Content */}
                    <div>
                      <div className="animate-fadeIn">
                        {uploadTab === 0 && (
                          <SingleNFT 
                            collection={selectedCollection}
                            onSuccess={handleNFTUploadSuccess}
                          />
                        )}
                        {uploadTab === 1 && (
                          <MultipleNFT 
                            collection={selectedCollection}
                            onSuccess={handleNFTUploadSuccess}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 2 && (
            <div className="max-w-4xl mx-auto">
              {!selectedCollection ? (
                <div className="py-12">
                  <h3 className="text-xl font-semibold text-white mb-4">Studio Dashboard</h3>
                  <p className="text-zinc-400 mb-6">Select a collection to manage</p>
                  <CollectionSelector 
                    onSelect={handleCollectionSelect}
                    showCreateButton={true}
                    onCreateNew={handleCreateNewCollection}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Collection Image */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-700/30 bg-zinc-800 flex-shrink-0">
                        {selectedCollection.cover || selectedCollection.image || selectedCollection.banner ? (
                          <img
                            src={selectedCollection.cover || selectedCollection.image || selectedCollection.banner}
                            alt={selectedCollection.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="w-full h-full flex items-center justify-center" style={{ display: selectedCollection.cover || selectedCollection.image || selectedCollection.banner ? 'none' : 'flex' }}>
                          <div className="w-8 h-8 bg-zinc-600 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 00-2-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-semibold text-white">Studio Dashboard</h3>
                        <p className="text-zinc-400">
                          Selected: {selectedCollection.name}
                          {recentlyUploadedNFTs && recentlyUploadedNFTs.collection && recentlyUploadedNFTs.collection.address === selectedCollection.address && (
                            <span className="ml-2 text-green-400 text-sm">
                              ✨ Recently Uploaded {recentlyUploadedNFTs.type === 'single' ? 'NFT' : `${recentlyUploadedNFTs.totalUploaded} NFTs`}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCollection(null)}
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      Change Collection
                    </button>
                  </div>
                  <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-8 shadow-2xl">
                    <CollectionManager collection={selectedCollection} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateDreams; 