// src/pages/MyStudio.jsx
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import factoryAbi from '../abi/SomniaFactory.json';
import nftAbi from '../abi/SomniaNFT.json';
import LaunchChecklistButton from '../components/LaunchChecklistButton';
import { getIpfsUrls } from '../utils/ipfs';
import React from 'react';
import logo from '../assets/logo.svg';

const FACTORY_ADDRESS = '0xb7C9318Ac06AA59fE3cDD8342769361bB0Cc3d09';

const fetchWithFallback = async (urls) => {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {}
  }
  throw new Error('All IPFS gateways failed');
};

const MyStudio = () => {
  const [collections, setCollections] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCollections = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();

        const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, provider);
        const userAddresses = await factory.getUserCollections(userAddress);

        const details = await Promise.all(
          userAddresses.map(async (addr) => {
            try {
              const nft = new ethers.Contract(addr, nftAbi, provider);
              const owner = await nft.owner();
              if (owner.toLowerCase() !== userAddress.toLowerCase()) {
                console.warn(`Skipping ${addr} because owner mismatch`);
                return null;
              }

              const name = await nft.name();

              let image = '';
              let metadataUri = '';

              try {
                metadataUri = await nft.contractURI();
                console.log(`Contract ${addr} returned contractURI: '${metadataUri}'`);
              } catch (err) {
                console.warn(`No contractURI() on contract ${addr}:`, err);
              }

              if (metadataUri && metadataUri !== '') {
                const urls = getIpfsUrls(metadataUri);
                try {
                  const json = await fetchWithFallback(urls);
                  if (json.image) {
                    const imageUrls = getIpfsUrls(json.image);
                    image = imageUrls[0];
                  } else {
                    console.warn(`No image field in metadata for ${addr}`);
                  }
                } catch (err) {
                  console.warn(`Failed to fetch metadata JSON for ${addr}:`, err);
                }
              } else {
                console.warn(`Metadata URI is empty for contract ${addr}`);
              }

              return {
                address: addr,
                name,
                cover: image || logo,
                createdAt: '-',  // Можно добавить реальное время, если получаем из данных
                views: Math.floor(Math.random() * 500),
                revenue: (Math.random() * 10).toFixed(2),
              };
            } catch (innerErr) {
              console.error(`Error processing contract ${addr}:`, innerErr);
              return null;
            }
          })
        );

        const filtered = details.filter((item) => item !== null);
        setCollections(filtered);
      } catch (err) {
        console.error('Failed to load collections:', err);
      }
    };

    loadCollections();
  }, []);

  const handleManage = (address) => {
    navigate(`/manage/${address}`);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-12 text-white font-sans relative z-10">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-[#FF0080] via-[#367aff] to-[#00A3FF] bg-clip-text text-transparent mb-3">
          My Studio
        </h1>
        <p className="text-zinc-400 mt-2 max-w-2xl mx-auto text-base">
          Welcome, Creator. Here, you are more than an artist — you are a storyteller, a world-builder, a gatekeeper to dreams.
        </p>
      </div>

      {collections.length === 0 ? (
        <div className="text-center text-zinc-500">
          <p className="mb-4">You haven't created any collections yet.</p>
          <Link
            to="/explore#create"
            className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-semibold shadow-md hover:opacity-90 transition"
          >
            Create Your First Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {collections.map((col, index) => (
            <div
              key={index}
              className="relative h-[420px] rounded-2xl shadow-lg hover:scale-105 transform transition duration-300 overflow-hidden border border-zinc-700"
              style={{ 
                backgroundImage: `url(${col.cover || col.firstNFTImage || '/default-cover.png'})`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent p-4 flex flex-col justify-end">
                <h3 className="text-lg font-semibold mb-1 truncate" title={col.name}>{col.name}</h3>
                <p className="text-zinc-400 text-xs mb-2">Created on {col.createdAt || 'Unknown'}</p>

                <div className="text-xs text-zinc-400 mb-3 space-y-1">
                  <p>Views: <span className="text-white font-medium">{col.views}</span></p>
                  <p>Revenue: <span className="text-white font-medium">Ξ {col.revenue}</span></p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleManage(col.address)}
                    className="flex-1 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 transition relative group"
                  >
                    Manage
                    <span className="absolute left-1/2 transform -translate-x-1/2 -bottom-8 bg-zinc-700 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">
                      Set prices, phases, analytics
                    </span>
                  </button>
                  <div className="flex-1">
                    <LaunchChecklistButton collection={col} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default MyStudio;
