// src/components/CollectionManager.jsx
import { useState } from 'react';
import { Settings, Users, Image, BarChart3, Rocket } from 'lucide-react';
import PhaseSettingsTab from './PhaseSettingsTab';
import ManageWLsTab from './ManageWLsTab';
import ViewCollectionTab from './ViewNFTsTab';
import CollectionStatsTab from './CollectionStatsTab';
import LaunchChecklistButton from './LaunchChecklistButton';
import React from 'react';
import logo from '../assets/logo.svg';

const CollectionManager = ({ collection }) => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 0, name: 'Phase Settings', icon: Settings },
    { id: 1, name: 'Manage WLs', icon: Users },
    { id: 2, name: 'View Collection', icon: Image },
    { id: 3, name: 'Stats', icon: BarChart3 }
  ];

  if (!collection) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Please select a collection to manage</p>
      </div>
    );
  }

  // Ensure collection has required properties
  if (!collection.address) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Invalid collection data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Collection Header with Launch Button */}
      <div className="flex items-center justify-between p-6 bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 shadow-2xl">
        <div className="flex items-center gap-4">
          <img
            src={collection.cover || collection.firstNFTImage || logo}
            alt="cover"
            className="w-24 h-24 object-cover rounded-xl border border-zinc-700"
            onError={(e) => {
              console.warn('⚠️ Collection cover failed to load:', e.target.src);
              // Если нет обложки, пробуем показать изображение NFT
              if (collection.firstNFTImage && collection.firstNFTImage !== e.target.src) {
                e.target.src = collection.firstNFTImage;
              } else {
                // Если нет изображения NFT, показываем логотип
                e.target.src = logo;
              }
            }}
          />
          <div>
            <h3 className="text-xl font-semibold text-white">{collection.name || 'Unnamed Collection'}</h3>
            <p className="text-zinc-400 text-sm">{collection.address}</p>
          </div>
        </div>
        
        {/* Launch Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-700/50 rounded-lg">
            <Rocket className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">Ready to launch?</span>
          </div>
          <LaunchChecklistButton collection={collection} />
        </div>
      </div>

      {/* Management Tabs */}
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 shadow-2xl overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-zinc-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-pink-500 bg-gradient-to-r from-pink-500/10 to-blue-500/10'
                    : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 0 && (
            <div className="animate-fadeIn">
              <PhaseSettingsTab collection={collection} />
            </div>
          )}

          {activeTab === 1 && (
            <div className="animate-fadeIn">
              <ManageWLsTab collection={collection} />
            </div>
          )}

          {activeTab === 2 && (
            <div className="animate-fadeIn">
              <ViewCollectionTab collection={collection} />
            </div>
          )}

          {activeTab === 3 && (
            <div className="animate-fadeIn">
              <CollectionStatsTab collection={collection} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionManager; 