import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import factoryAbi from '../abi/SomniaFactory.json';
import nftAbi from '../abi/SomniaNFT.json';
import { getIpfsUrls } from '../utils/ipfs';
import logo from '../assets/logo.svg';

const FACTORY_ADDRESS = '0xb7C9318Ac06AA59fE3cDD8342769361bB0Cc3d09';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RPC_ENDPOINTS = ['https://dream-rpc.somnia.network/', 'https://rpc.ankr.com/somnia_testnet'];

async function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await promise(controller);
    clearTimeout(timeout);
    return res;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

async function tryProviders(callFn) {
  for (const url of RPC_ENDPOINTS) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      return await callFn(provider);
    } catch (e) {
      // try next
    }
  }
  throw new Error('All RPC endpoints failed');
}

function getCacheKey(userAddress) {
  return `dreava_user_collections_${(userAddress || '').toLowerCase()}`;
}

function readCollectionsCache(userAddress) {
  try {
    const raw = localStorage.getItem(getCacheKey(userAddress));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.collections) || !parsed.ts) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeCollectionsCache(userAddress, collections) {
  try {
    const payload = { ts: Date.now(), collections };
    localStorage.setItem(getCacheKey(userAddress), JSON.stringify(payload));
  } catch (e) {}
}

function mergeCollections(a, b) {
  const map = new Map();
  for (const col of [...(a || []), ...(b || [])]) {
    if (!col || !col.address) continue;
    const key = col.address.toLowerCase();
    if (!map.has(key)) map.set(key, col);
  }
  return Array.from(map.values());
}

const fetchWithFallback = async (urls) => {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {}
  }
  throw new Error('Failed to fetch metadata');
};

const CollectionCoverImg = ({ cover, firstNFTImage }) => {
  // 🎯 ПРИОРИТЕТ 1: Обложка коллекции
  if (cover) {
    const urls = getIpfsUrls(cover);
    const imgSrc = urls[0] || logo;
    
    return (
      <img
        src={imgSrc}
        alt="cover"
        className="w-8 h-8 object-cover rounded-md border border-zinc-600"
        loading="lazy"
        onError={(e) => {
          console.warn('⚠️ Collection cover failed to load:', e.target.src);
          // Если нет обложки, пробуем показать изображение NFT
          if (firstNFTImage && firstNFTImage !== e.target.src) {
            e.target.src = firstNFTImage;
          } else {
            // Если нет изображения NFT, показываем логотип
            e.target.src = logo;
          }
        }}
      />
    );
  }
  
  // 🎯 ПРИОРИТЕТ 2: Изображение NFT из коллекции
  if (firstNFTImage) {
    return (
      <img
        src={firstNFTImage}
        alt="NFT"
        className="w-8 h-8 object-cover rounded-md border border-zinc-600"
        loading="lazy"
        onError={(e) => {
          console.warn('⚠️ Collection NFT image failed to load:', e.target.src);
          e.target.src = logo;
        }}
      />
    );
  }
  
  // 🎯 ПРИОРИТЕТ 3: Логотип как fallback
  return (
    <img
      src={logo}
      alt="logo"
      className="w-8 h-8 object-cover rounded-md border border-zinc-600 opacity-50"
    />
  );
};

const CollectionSelector = ({ selected, onSelect, showCreateButton = true, onCreateNew }) => {
  const [collections, setCollections] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState('bottom'); // 'top' or 'bottom'
  const navigate = useNavigate();

  useEffect(() => {
    const loadCollections = async () => {
      try {
        let userAddress = null;

        if (window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
              userAddress = accounts[0];
            }
          } catch (err) {
            console.warn('Could not get user address from wallet:', err);
          }
        }

        if (!userAddress) {
          console.warn('No user address available, cannot load collections');
          setCollections([]);
          return;
        }

        // 1) Serve cached immediately (stale if needed)
        const cached = readCollectionsCache(userAddress);
        const localCreated = JSON.parse(localStorage.getItem('dreava_collections') || '[]');
        if (cached && Array.isArray(cached.collections)) {
          const initial = mergeCollections(cached.collections, localCreated);
          setCollections(initial);
        } else if (localCreated.length > 0) {
          setCollections(localCreated);
        }

        // 2) Refresh in background from chain and update cache/state (with RPC fallback)
        const userAddresses = await tryProviders(async (prov) => {
          const factoryContract = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, prov);
          return await factoryContract.getUserCollections(userAddress);
        });

        // Limit concurrency to avoid RPC overload
        const CONCURRENCY = 4;
        const details = [];
        for (let i = 0; i < userAddresses.length; i += CONCURRENCY) {
          const slice = userAddresses.slice(i, i + CONCURRENCY);
          const chunk = slice.map(async (addr) => {
            // Always provide a fallback item to keep UI populated
            const fallbackItem = {
              address: addr,
              name: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
              cover: logo,
              description: ''
            };

            try {
              // Fetch name with timeout and RPC fallback
              const name = await withTimeout(async (controller) => {
                return await tryProviders(async (prov) => {
                  const nft = new ethers.Contract(addr, nftAbi, prov);
                  return await nft.name({ signal: controller.signal });
                });
              }, 5000).catch(() => fallbackItem.name);

              // Fetch contractURI and image
              let image = fallbackItem.cover;
              let description = '';
              const metadataUri = await withTimeout(async (controller) => {
                return await tryProviders(async (prov) => {
                  const nft2 = new ethers.Contract(addr, nftAbi, prov);
                  return await nft2.contractURI({ signal: controller.signal });
                });
              }, 5000).catch(() => '');

              if (metadataUri) {
                const urls = getIpfsUrls(metadataUri);
                try {
                  const json = await fetchWithFallback(urls);
                  if (json.image) {
                    const imageUrls = getIpfsUrls(json.image);
                    image = imageUrls[0] || image;
                  }
                  if (json.description) description = String(json.description);
                } catch {}
              }

              return {
                address: addr,
                name,
                cover: image || logo,
                description,
              };
            } catch (innerErr) {
              console.error(`Error processing contract ${addr}:`, innerErr);
              return fallbackItem;
            }
          });
          // eslint-disable-next-line no-await-in-loop
          const res = await Promise.all(chunk);
          details.push(...res);
        }

        const filtered = details.filter((item) => item !== null);
        const merged = mergeCollections(filtered, localCreated);
        writeCollectionsCache(userAddress, merged);
        setCollections(merged);
      } catch (err) {
        console.error('Failed to load collections:', err);
      }
    };

    loadCollections();
  }, []);

  const handleSelect = (collection) => {
    setIsOpen(false);
    onSelect(collection);
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    if (onCreateNew) {
      onCreateNew();
    } else {
      // Only navigate if we're not in a modal/page context
      navigate('/create-dreams');
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      // Check if there's enough space below
      const button = document.querySelector('[data-collection-selector]');
      if (button) {
        const rect = button.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 200; // Approximate height of dropdown
        
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          setDropdownPosition('top');
        } else {
          setDropdownPosition('bottom');
        }
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative w-full max-w-sm">
      <button
        onClick={toggleDropdown}
        className="w-full flex justify-between items-center bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm font-medium hover:border-pink-500 transition"
        data-collection-selector
      >
        {selected?.name || 'Select collection'}
        <span className="ml-2 text-zinc-400">▾</span>
      </button>

      {isOpen && (
        <div className={`absolute w-full bg-zinc-800 border border-zinc-700 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-zinc-700 max-h-48 overflow-y-auto ${
          dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}>
          {showCreateButton && (
          <button
              onClick={handleCreateNew}
            className="block w-full text-left px-4 py-3 text-pink-400 hover:bg-zinc-700 text-sm font-medium"
          >
            + Create new collection
          </button>
          )}
          {collections.map((col, idx) => (
            <button
              key={col.address + idx}
              onClick={() => handleSelect(col)}
              className="flex items-center gap-3 px-4 py-2 w-full hover:bg-zinc-700 text-sm text-white"
            >
              <CollectionCoverImg cover={col.cover} firstNFTImage={col.firstNFTImage} />
              <span className="truncate max-w-[160px] font-medium">{col.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectionSelector;
