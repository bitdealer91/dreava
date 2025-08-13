// MyNFTs.jsx — современная галерея NFT в стиле топовых маркетплейсов

import React, { useState, useEffect } from 'react';
import { useReownWallet } from '../hooks/useReownWallet';
import { ethers } from 'ethers';
import { Search, Filter, Grid, List, SortAsc, SortDesc, Heart, Share2, MoreHorizontal } from 'lucide-react';
import logo from '../assets/logo.svg';
import SomniaFactoryABI from '../abi/SomniaFactory.json';

// Basic ERC721 ABI for tokenURI + optional enumeration
const ERC721_ABI = [
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function contractURI() view returns (string)"
];

const FACTORY_ADDRESS = '0xb7C9318Ac06AA59fE3cDD8342769361bB0Cc3d09';

// Helper to convert ipfs:// to gateway
const toIpfsGateway = (url, isFactory = false) => {
  if (typeof url !== 'string') return url;
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    return isFactory
      ? `https://gateway.lighthouse.storage/ipfs/${cid}`
      : `https://ipfs.io/ipfs/${cid}`;
  }
  return url;
};

// Probe content-type for URLs without extension (helps pick correct media)
const probeContentType = async (url) => {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return (res.headers.get('Content-Type') || '').toLowerCase();
  } catch {}
  return '';
};

// Fallback loader: query factory collections on-chain and collect user's tokens
const fetchOnChainFactoryNFTs = async (userAddress) => {
  try {
    const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
    const factory = new ethers.Contract(FACTORY_ADDRESS, SomniaFactoryABI, provider);
    const collections = await factory.getAllCollections();

    const results = [];
    for (const contractAddress of collections) {
      try {
        const nft = new ethers.Contract(contractAddress, ERC721_ABI, provider);
        let ownedTokenIds = [];
        // Try ERC721Enumerable path first
        try {
          const bal = await nft.balanceOf(userAddress);
          const balance = Number(bal);
          if (balance > 0) {
            for (let i = 0; i < Math.min(balance, 20); i++) { // cap to avoid long loops
              try {
                const tokenId = await nft.tokenOfOwnerByIndex(userAddress, i);
                ownedTokenIds.push(Number(tokenId));
              } catch {}
            }
          }
        } catch {}

        // If enumerable not supported or empty, probe first N tokenIds for owner
        if (ownedTokenIds.length === 0) {
          for (let tid = 0; tid < 25; tid++) { // small scan for fresh mints (includes tokenId 0)
            try {
              const owner = await nft.ownerOf(tid);
              if (owner && owner.toLowerCase() === userAddress.toLowerCase()) {
                ownedTokenIds.push(tid);
              }
            } catch {}
          }
        }

        if (ownedTokenIds.length === 0) continue;

        // Try to resolve collection name from contractURI metadata
        let collectionName = 'Unknown Collection';
        try {
          const cURI = await nft.contractURI();
          if (cURI && typeof cURI === 'string') {
            const metaUrl = toIpfsGateway(cURI);
            const res = await fetch(metaUrl);
            if (res.ok) {
              const meta = await res.json();
              if (meta?.name) collectionName = meta.name;
            }
          }
        } catch {}

        for (const tokenId of ownedTokenIds) {
          try {
            let tokenURI = await nft.tokenURI(tokenId);
            tokenURI = toIpfsGateway(tokenURI || '', true);
            let metadata = {};
            try {
              const r = await fetch(tokenURI);
              if (r.ok) metadata = await r.json();
            } catch {}
            const media = toIpfsGateway(metadata.image || metadata.animation_url || metadata.image_url || '');

            results.push({
              id: tokenId,
              metadata: { ...metadata, image: media },
              collectionName,
              tokenType: 'ERC-721',
              token: {
                address: contractAddress,
                name: collectionName,
                type: 'ERC-721'
              },
              isFactoryNFT: true
            });
          } catch {}
        }
      } catch {}
    }
    return results;
  } catch (e) {
    console.warn('On-chain factory fallback failed:', e.message);
    return [];
  }
};

const getImageUrl = async (nft) => {
  try {
    console.log('🖼️ === getImageUrl DEBUG START ===');
    console.log('NFT:', nft.id, nft.collectionName);
    
    // Старый метод - проверяем все поля изображения
    let imageUrl = nft.image || nft.image_url || nft.media_url || '';
    console.log('Direct image URL:', imageUrl);
    
    // Проверяем, является ли NFT фабричным через фабрику
    const contractAddress = nft.contractAddress || nft.token?.address;
    const isFactoryNFT = await checkIfFactoryCollection(contractAddress) || nft.isFactoryNFT;
    console.log('Is Factory NFT:', isFactoryNFT);
    console.log('Contract Address:', contractAddress);

    const tokenIdNum = typeof nft.id === 'string' ? parseInt(nft.id, 10) : nft.id;

    // Для фабричных сначала пробуем достать изображение из contractURI
    if (isFactoryNFT && contractAddress && tokenIdNum !== undefined && tokenIdNum !== null) {
      try {
        const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
        const contract = new ethers.Contract(contractAddress, [
          'function contractURI() view returns (string)'
        ], provider);
        const cURI = await contract.contractURI();
        if (cURI && typeof cURI === 'string') {
          const urls = gatewayFallbacks(cURI, true);
          let cm = null;
          for (const u of urls) {
            try { const r = await fetch(u); if (r.ok) { cm = await r.json(); break; } } catch {}
          }
          if (cm) {
            // 1) Пытаемся найти конкретный токен по metadata.nfts[*].tokenURI
            if (Array.isArray(cm.nfts)) {
              const match = cm.nfts.find((x) => {
                const t = x?.tokenURI || x?.tokenUri;
                if (typeof t !== 'string') return false;
                const base = t.replace(/\.json$/i, '');
                return base.endsWith(`/${tokenIdNum}`);
              });
              const img = match?.image || match?.image_url;
              if (img) {
                const resolved = img.startsWith('ipfs://') ? toPreferredGateway(img, true) : img;
                console.log('✅ contractURI.nfts image:', resolved);
                return resolved;
              }
            }
            // 2) Берём общий image/banner как резерв
            const collImgRaw = cm.image || cm.banner || cm.image_url;
            if (collImgRaw) {
              const resolved = collImgRaw.startsWith('ipfs://') ? toPreferredGateway(collImgRaw, true) : collImgRaw;
              console.log('✅ contractURI collection image/banner:', resolved);
              imageUrl = imageUrl || resolved;
            }
          }
        }
      } catch (e) {
        console.warn('contractURI image resolution failed:', e.message);
      }
    }
    
    // 🔥 НОВАЯ ЛОГИКА: Для фабричных NFT затем пробуем получить метаданные из tokenURI
    if (!imageUrl && isFactoryNFT && contractAddress && nft.id !== undefined && nft.id !== null) {
      console.log('🏭 Factory NFT detected, fetching token metadata from contract...');
      try {
        const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
        const contract = new ethers.Contract(contractAddress, [
          'function tokenURI(uint256 tokenId) view returns (string)'
        ], provider);
        
        const tokenId = tokenIdNum;
        console.log('Calling tokenURI with tokenId:', tokenId);
        const tokenURI = await contract.tokenURI(tokenId);
        console.log('Contract tokenURI result:', tokenURI);
        
        if (tokenURI) {
          // Мульти-шлюзы для метаданных токена
          const metadataUrls = gatewayFallbacks(tokenURI, true /* factory-only path above */);
          try {
            let tokenMetadata = null;
            for (const u of metadataUrls) {
              try { const r = await fetch(u); if (r.ok) { tokenMetadata = await r.json(); break; } } catch {}
            }
            if (!tokenMetadata && !/\.json$/i.test(tokenURI)) {
              // Некоторые шлюзы требуют .json
              const jsonCandidates = gatewayFallbacks(tokenURI + '.json', true);
              for (const u of jsonCandidates) {
                try { const r = await fetch(u); if (r.ok) { tokenMetadata = await r.json(); break; } } catch {}
              }
            }
            if (tokenMetadata) {
              console.log('✅ Token metadata fetched:', tokenMetadata);
              let mediaUrl = tokenMetadata.image || tokenMetadata.animation_url || tokenMetadata.image_url;
              if (mediaUrl && mediaUrl.startsWith('ipfs://')) mediaUrl = toPreferredGateway(mediaUrl, true);
              if (mediaUrl) {
                console.log('✅ Using token metadata media URL:', mediaUrl);
                return mediaUrl;
              }
            }
          } catch (metadataError) {
            console.error('❌ Error fetching token metadata:', metadataError);
          }

          // Если tokenURI указывает на файл без расширения — пробуем набор расширений (gif в приоритете)
          let directUrl = toPreferredGateway(tokenURI, true);
          if (!/\.(png|jpg|jpeg|gif|webp|svg|mp4|webm)$/i.test(directUrl)) {
            const candidates = [directUrl + '.gif', directUrl + '.png', directUrl + '.webp', directUrl + '.jpg', directUrl];
            for (const u of candidates) {
              try { const r = await fetch(u, { method: 'HEAD' }); if (r.ok) return u; } catch {}
            }
            for (const u of candidates) {
              try { const r = await fetch(u); if (r.ok) return u; } catch {}
            }
          } else {
            return directUrl;
          }
        }
      } catch (contractError) {
        console.error('❌ Error fetching tokenURI from contract:', contractError);
      }
    }

    // Доп. фолбэк: пробуем baseTokenURI + tokenId + расширения (на случай отсутствия JSON по tokenURI)
    if (!imageUrl && isFactoryNFT && contractAddress && tokenIdNum !== undefined && tokenIdNum !== null) {
      try {
        const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
        const contract = new ethers.Contract(contractAddress, [
          'function baseTokenURI() view returns (string)'
        ], provider);
        const base = await contract.baseTokenURI();
        if (base && typeof base === 'string') {
          const baseUrl = toPreferredGateway(base.endsWith('/') ? base : base + '/', true);
          const withoutExt = baseUrl + String(tokenIdNum);
          const candidates = [withoutExt + '.gif', withoutExt + '.png', withoutExt + '.webp', withoutExt + '.jpg'];
          for (const u of candidates) {
            try { const r = await fetch(u, { method: 'HEAD' }); if (r.ok) { console.log('✅ baseTokenURI image:', u); return u; } } catch {}
          }
          for (const u of candidates) {
            try { const r = await fetch(u); if (r.ok) { console.log('✅ baseTokenURI image (GET):', u); return u; } } catch {}
          }
        }
      } catch (e) {
        console.warn('baseTokenURI probing failed:', e.message);
      }
    }
 
    // Если нет прямого изображения, пробуем из метаданных (нефабричные пути)
    if (!imageUrl && nft.metadata?.image) {
      imageUrl = nft.metadata.image;
      console.log('Using metadata image:', imageUrl);
    }
    
    // Если нет изображения из token_instances
    if (!imageUrl && nft.token_instances && nft.token_instances.length > 0) {
      const instance = nft.token_instances[0];
      if (instance.image) {
        imageUrl = instance.image;
        console.log('Using token instance image:', imageUrl);
      } else if (instance.image_url) {
        imageUrl = instance.image_url;
        console.log('Using token instance image_url:', imageUrl);
      }
    }
    
    // Если нет изображения из token
    if (!imageUrl && nft.token?.image) {
      imageUrl = nft.token.image;
      console.log('Using token image:', imageUrl);
    } else if (!imageUrl && nft.token?.image_url) {
      imageUrl = nft.token.image_url;
      console.log('Using token image_url:', imageUrl);
    }
    
    // Обработка итогового URL
    if (imageUrl) {
      console.log('Processing image URL:', imageUrl);
      if (imageUrl.startsWith('ipfs://')) {
        const urls = gatewayFallbacks(imageUrl, isFactoryNFT);
        try { const ok = await fetchFirstOk(urls, { method: 'HEAD' }); imageUrl = ok.url; } catch { imageUrl = toPreferredGateway(imageUrl, isFactoryNFT); }
      }
      // Для factory и URL без расширения — мягкая проверка типа/расширений (gif вперёд)
      if (isFactoryNFT && !/\.(png|jpg|jpeg|gif|webp|svg|mp4|webm)$/i.test(imageUrl)) {
        try {
          const ctype = await probeContentType(imageUrl);
          if (!ctype) {
            const candidates = ['.gif', '.png', '.webp', '.jpg'];
            for (const ext of candidates) {
              const testUrl = imageUrl + ext;
              try { const r = await fetch(testUrl, { method: 'HEAD' }); if (r.ok) { imageUrl = testUrl; break; } } catch {}
            }
          }
        } catch {}
      }
      console.log('✅ Final image URL:', imageUrl);
      return imageUrl;
    }

    console.log('❌ No image URL found');
    console.log('🖼️ === getImageUrl DEBUG END ===');
    return null;
  } catch (error) {
    console.error('❌ Error getting image URL:', error);
    return null;
  }
};

const getMediaType = (nft) => {
  const url = nft.animation_url || nft.media_url || nft.image_url || nft.metadata?.image || '';
  
  if (nft.animation_url) return 'animation';
  if (url.match(/\.(mp4|webm|mov|avi|wmv|flv|mkv)$/i)) return 'video';
  if (url.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i)) return 'image';
  if (url.startsWith('data:image/')) return 'image';
  if (url.startsWith('data:video/')) return 'video';
  
  return 'image';
};

const NFTMedia = ({ nft }) => {
  console.log('🎨 NFTMedia component called for:', nft.id, nft.collectionName);
  
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadImage = async () => {
      console.log('🔄 NFTMedia loadImage started for:', nft.id, nft.collectionName);
      try {
        setIsLoading(true);
        setError(null);
        
        // Используем функцию getImageUrl для правильной обработки
        console.log('📞 Calling getImageUrl for:', nft.id);
        const url = await getImageUrl(nft);
        console.log('📞 getImageUrl returned:', url);
        
        if (url) {
          console.log('✅ Setting image URL:', url);
          setImageUrl(url);
          
          // Дополнительно проверяем, что изображение действительно загружается
          const img = new Image();
          img.onload = () => {
            console.log('✅ Image loaded successfully:', url);
          };
          img.onerror = () => {
            console.error('❌ Image failed to load:', url);
            setError('Image failed to load');
          };
          img.src = url;
        } else {
          console.log('❌ No image URL found');
          setError('Image not found');
        }
      } catch (err) {
        console.error('❌ Error loading image:', err);
        setError('Failed to load image');
      } finally {
        setIsLoading(false);
      }
    };
    loadImage();
  }, [nft]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-700">
        <div className="text-center">
          <img src={logo} alt="Logo" className="w-16 h-16 mx-auto mb-2" />
          <div className="text-sm text-zinc-300">No Image</div>
          {error && <div className="text-xs text-zinc-400 mt-1">{error}</div>}
        </div>
      </div>
    );
  }

  // Рендерим видео для видео-URL, иначе изображение
  const isVideo = /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(imageUrl || '');
  if (isVideo) {
    return (
      <video
        src={imageUrl}
        className="w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        onError={() => setError('Failed to load video')}
      />
    );
  }
  return (
    <img
      src={imageUrl}
      alt={nft.metadata?.name || nft.name || `NFT #${nft.id}`}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      onLoad={() => console.log('✅ Image loaded in component:', imageUrl)}
      onError={(e) => {
        console.error('❌ Image error in component:', imageUrl);
        e.target.style.display = 'none';
        setError('Failed to load image');
      }}
    />
  );
};

const NFTCard = ({ nft }) => {
  try {
    const [nftBaseURI, setNftBaseURI] = useState(null);
    const [isLoadingBaseURI, setIsLoadingBaseURI] = useState(false);
    const [collectionName, setCollectionName] = useState(nft.collectionName || nft.collection?.name || nft.contractName || 'Unknown Collection');

    // Проверяем, является ли NFT фабричным через фабрику
    const [isFactoryNFT, setIsFactoryNFT] = useState(false);

    // Загружаем информацию о коллекции при монтировании
    useEffect(() => {
      const loadCollectionInfo = async () => {
        const contractAddress = nft.token?.address;
        const factoryCheck = await checkIfFactoryCollection(contractAddress);
        setIsFactoryNFT(factoryCheck || nft.isFactoryNFT);
        
        if (factoryCheck || nft.isFactoryNFT) {
          const baseName = nft.collectionName || nft.token?.name || 'Unknown Collection';
          setCollectionName(baseName);
        }
      };
      
      loadCollectionInfo();
    }, [nft]);

    // Функция для получения baseURI из контракта
    const getBaseURI = async () => {
      if (!nft.token?.address || !nft.id) return null;
      
      try {
        setIsLoadingBaseURI(true);
        const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
        const contract = new ethers.Contract(nft.token.address, [
          "function tokenURI(uint256 tokenId) view returns (string)"
        ], provider);

        const tokenId = typeof nft.id === 'string' ? parseInt(nft.id, 10) : nft.id;
        const tokenURI = await contract.tokenURI(tokenId);
        
        // Извлекаем baseURI из полного tokenURI
        if (tokenURI && tokenURI.includes('/')) {
          const lastSlashIndex = tokenURI.lastIndexOf('/');
          const baseURI = tokenURI.substring(0, lastSlashIndex + 1);
          console.log('Extracted baseURI:', baseURI);
          return baseURI;
        }
        
        return tokenURI;
      } catch (error) {
        console.error('Error getting baseURI:', error);
        return null;
      } finally {
        setIsLoadingBaseURI(false);
      }
    };

    // Функция для конвертации IPFS URL
    const convertIPFSURL = (url) => {
      if (url.startsWith('ipfs://')) {
        return `https://gateway.lighthouse.storage/ipfs/${url.replace('ipfs://', '')}`;
      }
      return url;
    };

    // Загружаем baseURI при монтировании компонента
    useEffect(() => {
      if (nft.token?.address && nft.id) {
        getBaseURI().then(baseURI => {
          setNftBaseURI(baseURI);
          console.log('Loaded baseURI for NFT', nft.id, ':', baseURI);
          console.log('Is Factory NFT (by address):', isFactoryNFT ? 'yes' : 'no');
        });
      }
    }, [nft.token?.address, nft.id]);

    return (
      <div className="group relative bg-zinc-900 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-zinc-800">
        {/* Image Container */}
        <div className="relative w-full aspect-square">
          <NFTMedia nft={nft} />
          
          {/* Collection Badge */}
          {isFactoryNFT && (
            <div className="absolute bottom-3 left-3" style={{ zIndex: 30 }}>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500 text-white shadow-lg">
                dreava.art
              </span>
            </div>
          )}
        </div>

        {/* NFT Info */}
        <div className="p-4 bg-zinc-900">
          {/* Collection Badge */}
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500 text-white">
              {collectionName}
            </span>
            <span className="text-xs text-zinc-400 font-medium">
              #{nft.id}
            </span>
          </div>
          
          {/* NFT Name */}
          <h3 className="font-bold text-white text-lg mb-2 line-clamp-1">
            {nft.metadata?.name || nft.name || nft.title || `NFT #${nft.id}`}
          </h3>
          
          {/* Token Type & Additional Info */}
          <div className="flex items-center justify-between text-sm text-zinc-400 mb-3">
            <span className="font-medium">
              {nft.tokenType || 'ERC-721'}
            </span>
            {nft.value && nft.value !== "1" && (
              <span className="bg-zinc-800 px-2 py-1 rounded text-xs font-medium text-zinc-300">
                x{nft.value}
              </span>
            )}
          </div>
          
          {/* Description */}
          {nft.description && (
            <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
              {nft.description}
            </p>
          )}
          
          {/* Status & Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500 text-white">
              Owned
            </span>
            <div className="flex gap-1">
              <button 
                className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
                onClick={async () => {
                  console.log('🔍 === NFT DEBUG INFO ===');
                  console.log('NFT ID:', nft.id);
                  console.log('NFT Name:', nft.name || nft.metadata?.name);
                  console.log('Collection Name:', nft.collectionName);
                  console.log('Collection Address:', nft.token?.address);
                  console.log('Contract Address:', nft.contractAddress);
                  console.log('Token URI:', nft.token_uri || nft.tokenURI);
                  console.log('Is Factory NFT (from API):', nft.isFactoryNFT);
                  console.log('Factory Address:', FACTORY_ADDRESS);
                  
                  // Проверяем через фабрику
                  const contractAddress = nft.contractAddress || nft.token?.address;
                  const factoryCheck = await checkIfFactoryCollection(contractAddress);
                  console.log('Is Factory NFT (from factory check):', factoryCheck);
                  
                  // Тестируем существующую работающую логику из MyNFTs
                  if (factoryCheck && contractAddress) {
                    console.log('🏭 === TESTING EXISTING MYNFTS LOGIC ===');
                    try {
                      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
                      const contract = new ethers.Contract(contractAddress, [
                        "function tokenURI(uint256 tokenId) view returns (string)",
                        "function baseTokenURI() view returns (string)"
                      ], provider);

                      // Проверяем baseURI контракта
                      const baseTokenURI = await contract.baseTokenURI();
                      console.log('Contract baseTokenURI:', baseTokenURI);

                      const tokenId = typeof nft.id === 'string' ? parseInt(nft.id, 10) : nft.id;
                      console.log('Calling tokenURI with tokenId:', tokenId);
                      const tokenURI = await contract.tokenURI(tokenId);
                      console.log('TokenURI result:', tokenURI);
                      
                      // Извлекаем baseURI из полного tokenURI (как в getBaseURI)
                      if (tokenURI && tokenURI.includes('/')) {
                        const lastSlashIndex = tokenURI.lastIndexOf('/');
                        const baseURI = tokenURI.substring(0, lastSlashIndex + 1);
                        console.log('Extracted baseURI:', baseURI);
                        
                        // Строим URL изображения (как в convertIPFSURL)
                        let imageUrl = baseURI + tokenId + '.png';
                        console.log('Built image URL:', imageUrl);
                        
                        // Конвертируем IPFS URL
                        if (imageUrl.startsWith('ipfs://')) {
                          imageUrl = imageUrl.replace('ipfs://', 'https://gateway.lighthouse.storage/ipfs/');
                          console.log('Converted IPFS URL:', imageUrl);
                        }
                        
                        console.log('✅ Existing MyNFTs logic image URL:', imageUrl);
                      } else {
                        console.log('❌ No baseURI extracted from tokenURI');
                        console.log('❌ This suggests the contract baseURI is not set correctly');
                      }
                      
                    } catch (err) {
                      console.error('❌ Error testing existing MyNFTs logic:', err);
                    }
                    console.log('🏭 === END TESTING EXISTING MYNFTS LOGIC ===');
                  }
                  
                  // Тестируем работающую логику из CollectionSelector
                  if (factoryCheck && contractAddress) {
                    console.log('🏭 === TESTING WORKING FACTORY LOGIC ===');
                    try {
                      const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
                      const nftContract = new ethers.Contract(contractAddress, [
                        "function contractURI() view returns (string)",
                        "function tokenURI(uint256 tokenId) view returns (string)"
                      ], provider);
                      
                      // Получаем contractURI (как в CollectionSelector)
                      const contractURI = await nftContract.contractURI();
                      console.log('Contract URI:', contractURI);
                      
                      if (contractURI && contractURI !== '') {
                        // Конвертируем IPFS URL
                        let metadataUrls = [contractURI];
                        if (contractURI.startsWith('ipfs://')) {
                          const cid = contractURI.replace('ipfs://', '');
                          metadataUrls = [`https://gateway.lighthouse.storage/ipfs/${cid}`];
                        }
                        console.log('Metadata URLs:', metadataUrls);
                        
                        // Получаем метаданные
                        let metadata = null;
                        for (const url of metadataUrls) {
                          try {
                            const res = await fetch(url);
                            if (res.ok) {
                              metadata = await res.json();
                              console.log('✅ Metadata fetched:', metadata);
                              break;
                            }
                          } catch (err) {
                            console.warn('❌ Failed to fetch from:', url, err.message);
                          }
                        }
                        
                        if (metadata && metadata.image) {
                          // Конвертируем URL изображения
                          let imageUrl = metadata.image;
                          if (imageUrl.startsWith('ipfs://')) {
                            const cid = imageUrl.replace('ipfs://', '');
                            imageUrl = `https://gateway.lighthouse.storage/ipfs/${cid}`;
                          }
                          console.log('✅ Working logic image URL:', imageUrl);
                        } else {
                          console.log('❌ No image in metadata');
                        }
                      } else {
                        console.log('❌ Empty contractURI');
                      }
                      
                      // Также пробуем tokenURI для конкретного токена
                      console.log('🔍 Testing tokenURI for token ID:', nft.id);
                      const tokenId = typeof nft.id === 'string' ? parseInt(nft.id, 10) : nft.id;
                      const tokenURI = await nftContract.tokenURI(tokenId);
                      console.log('Token URI:', tokenURI);
                      
                      if (tokenURI && tokenURI !== '') {
                        let tokenMetadataUrls = [tokenURI];
                        if (tokenURI.startsWith('ipfs://')) {
                          const cid = tokenURI.replace('ipfs://', '');
                          tokenMetadataUrls = [`https://gateway.lighthouse.storage/ipfs/${cid}`];
                        }
                        console.log('Token metadata URLs:', tokenMetadataUrls);
                        
                        // Получаем метаданные токена
                        let tokenMetadata = null;
                        for (const url of tokenMetadataUrls) {
                          try {
                            const res = await fetch(url);
                            if (res.ok) {
                              tokenMetadata = await res.json();
                              console.log('✅ Token metadata fetched:', tokenMetadata);
                              break;
                            }
                          } catch (err) {
                            console.warn('❌ Failed to fetch token metadata from:', url, err.message);
                          }
                        }
                        
                        if (tokenMetadata && tokenMetadata.image) {
                          let tokenImageUrl = tokenMetadata.image;
                          if (tokenImageUrl.startsWith('ipfs://')) {
                            const cid = tokenImageUrl.replace('ipfs://', '');
                            tokenImageUrl = `https://gateway.lighthouse.storage/ipfs/${cid}`;
                          }
                          console.log('✅ Token image URL:', tokenImageUrl);
                        } else {
                          console.log('❌ No image in token metadata');
                        }
                      }
                      
                    } catch (err) {
                      console.error('❌ Error testing factory logic:', err);
                    }
                    console.log('🏭 === END TESTING WORKING FACTORY LOGIC ===');
                  }
                  
                  // Новый анализ состояния контракта
                  try {
                    const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
                    const contract = new ethers.Contract(nft.token?.address, [
                      "function baseTokenURI() view returns (string)",
                      "function revealed() view returns (bool)",
                      "function tokenURI(uint256) view returns (string)",
                      "function ownerOf(uint256) view returns (address)"
                    ], provider);
                    const tokenId = typeof nft.id === 'string' ? parseInt(nft.id, 10) : nft.id;
                    const baseTokenURI = await contract.baseTokenURI();
                    console.log('baseTokenURI():', baseTokenURI);
                    const revealed = await contract.revealed();
                    console.log('revealed():', revealed);
                    const tokenURI = await contract.tokenURI(tokenId);
                    console.log(`tokenURI(${tokenId}):`, tokenURI);
                    const owner = await contract.ownerOf(tokenId);
                    console.log(`ownerOf(${tokenId}):`, owner);
                  } catch (err) {
                    console.error('Error analyzing NFT contract state:', err);
                  }
                  
                  console.log('Full NFT Data:', nft);
                  console.log('Token Data:', nft.token);
                  console.log('Metadata:', nft.metadata);
                  console.log('🔍 === END NFT DEBUG ===');
                }}
                title="Debug NFT"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6"/>
                  <path d="M21 12h-6m-6 0H3"/>
                </svg>
              </button>
              
              <button className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
                <Heart size={14} className="text-zinc-400" />
              </button>
              <button className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
                <Share2 size={14} className="text-zinc-400" />
              </button>
              <button className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors">
                <MoreHorizontal size={14} className="text-zinc-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error('Error in NFTCard:', err);
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
        <div className="text-red-500 font-medium">Error rendering NFT card</div>
        <div className="text-gray-500 text-sm">ID: {nft?.id || 'unknown'}</div>
      </div>
    );
  }
};

// Function to check if a collection is created by factory
const checkIfFactoryCollection = async (contractAddress) => {
  try {
    if (!contractAddress) return false;
    
    const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
    const factoryContract = new ethers.Contract(FACTORY_ADDRESS, SomniaFactoryABI, provider);
    
    // Get all collections from factory
    const allCollections = await factoryContract.getAllCollections();
    
    // Check if the contract address is in the list
    const isFactoryNFT = allCollections.map(addr => addr.toLowerCase()).includes(contractAddress.toLowerCase());
    
    console.log('🏭 Factory check for', contractAddress, ':', {
      allCollections: allCollections,
      isFactoryNFT: isFactoryNFT
    });
    
    return isFactoryNFT;
  } catch (error) {
    console.error('❌ Error checking factory collection:', error);
    return false;
  }
};

const getCollectionName = async (nft) => {
  // Проверяем, является ли NFT фабричным через фабрику
  const contractAddress = nft.contractAddress || nft.token?.address;
  const isFactoryNFT = await checkIfFactoryCollection(contractAddress) || nft.isFactoryNFT;

  // Для остальных NFT возвращаем обычное название
  const regularName = nft.collectionName || nft.token?.name || 'Unknown Collection';
  console.log('🌐 Regular NFT - using standard name:', regularName);
  return regularName;
};

const MyNFTs = () => {
  const { address, isConnected } = useReownWallet();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Обработка URL параметров для автоматического поиска
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const nftId = urlParams.get('nftId');
    const contract = urlParams.get('contract');
    const nftName = urlParams.get('nftName');
    const collection = urlParams.get('collection');
    
    if (nftId || contract || nftName || collection) {
      console.log('🔍 Auto-search params from URL:', { nftId, contract, nftName, collection });
      
      // Устанавливаем параметры поиска
      if (nftName) setSearchTerm(nftName);
      if (collection && collection !== 'all') setSelectedCollection(collection);
      
      // Очищаем URL параметры после применения
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Get unique collections
  const collections = ['all', ...new Set(nfts.map(nft => nft.collectionName).filter(Boolean))];

  // Filter and sort NFTs
  const filteredNFTs = nfts
    .filter(nft => {
      const matchesSearch = searchTerm === '' || 
        nft.metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nft.collectionName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCollection = selectedCollection === 'all' || 
        nft.collectionName === selectedCollection;
      
      return matchesSearch && matchesCollection;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'oldest':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        case 'name':
          return (a.metadata?.name || '').localeCompare(b.metadata?.name || '');
        case 'collection':
          return (a.collectionName || '').localeCompare(b.collectionName || '');
        default:
          return 0;
      }
    });

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!address) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching NFTs for address:', address);
        
        // Добавляем retry логику для API
        const fetchWithRetry = async (url, maxRetries = 3) => {
          for (let i = 0; i < maxRetries; i++) {
            try {
              const response = await fetch(url);
              if (response.ok) {
                return response;
              }
              
              // Если 503 ошибка, ждем перед повторной попыткой
              if (response.status === 503) {
                console.log(`API returned 503, retrying in ${(i + 1) * 2} seconds... (attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
                continue;
              }
              
              // Для других ошибок сразу выбрасываем
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            } catch (err) {
              if (i === maxRetries - 1) throw err;
              console.log(`Fetch attempt ${i + 1} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        };
        
        const response = await fetchWithRetry(
          `https://somnia.w3us.site/api/v2/addresses/${address}/nft/collections?type=ERC-721%2CERC-404%2CERC-1155`
        );
        
        // Проверяем, что response существует перед вызовом .json()
        if (!response) {
          throw new Error('API server is completely unavailable');
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (!data.items || !Array.isArray(data.items)) {
          throw new Error('Invalid API response format');
        }
        
        // Flatten all NFT instances from all collections
        let allNFTs = data.items.flatMap(collection => {
          if (!collection.token_instances || !Array.isArray(collection.token_instances)) {
            return [];
          }
          
          return collection.token_instances.map(nft => ({
            ...nft,
            id: nft.id, // ensure id is present
            collectionName: collection.token?.name || 'Unknown',
            collectionSymbol: collection.token?.symbol || '',
            tokenType: collection.token?.type || 'ERC-721',
            token: collection.token || {},
            isFactoryNFT: collection.token?.address?.toLowerCase() === FACTORY_ADDRESS.toLowerCase()
          }));
        });

        // Fallback: if API collection items have no token_instances, fetch tokens endpoint directly
        if (!allNFTs || allNFTs.length === 0) {
          try {
            const tokensRes = await fetch(`https://somnia.w3us.site/api/v2/addresses/${address}/nft/tokens?type=ERC-721%2CERC-404%2CERC-1155`);
            if (tokensRes.ok) {
              const tokensData = await tokensRes.json();
              if (Array.isArray(tokensData.items)) {
                allNFTs = tokensData.items.map(t => ({
                  ...t,
                  id: t.id,
                  collectionName: t.token?.name || 'Unknown',
                  collectionSymbol: t.token?.symbol || '',
                  tokenType: t.token?.type || 'ERC-721',
                  token: t.token || {},
                  isFactoryNFT: t.token?.address?.toLowerCase() === FACTORY_ADDRESS.toLowerCase()
                }));
              }
            }
          } catch (e) {
            console.warn('Fallback token fetch failed:', e.message);
          }
        }

        // Отображаем сначала API NFT, не блокируя UI. Не фильтруем по наличию image —
        // новые фабричные коллекции могут не иметь картинок в API, но картинка будет
        // получена ончейн в компоненте NFTMedia через tokenURI.
        const initialNFTs = allNFTs.filter(Boolean);
        const uniqueNFTs = initialNFTs.filter((nft, index, self) =>
          index === self.findIndex((t) => 
            (String(t.id) === String(nft.id)) && 
            ((t.token?.address || t.contractAddress || '').toLowerCase() === (nft.token?.address || nft.contractAddress || '').toLowerCase())
          )
        );

        console.log('All NFTs (merged):', uniqueNFTs.length);
        setNfts(uniqueNFTs);

        // 🚀 Ончейн-фолбек фабрики в фоне (только ERC721Enumerable, без brute-force ownerOf)
        (async () => {
          try {
            const factoryProvider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network/');
            const factory = new ethers.Contract(FACTORY_ADDRESS, SomniaFactoryABI, factoryProvider);
            const collections = await factory.getAllCollections();
            // Расширяем окно: берём и начало, и конец списка, чтобы покрыть старые и новые коллекции
            let limited = collections;
            if (collections.length > 250) {
              const head = collections.slice(0, 50);
              const tail = collections.slice(-200);
              const seen = new Set();
              limited = [...head, ...tail].filter((addr) => {
                const k = addr.toLowerCase();
                if (seen.has(k)) return false; seen.add(k); return true;
              });
            }
            const added = [];
            for (const addrC of limited) {
              try {
                const nft = new ethers.Contract(addrC, [
                  "function tokenURI(uint256 tokenId) view returns (string)",
                  "function balanceOf(address owner) view returns (uint256)",
                  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
                  "function contractURI() view returns (string)",
                  "function ownerOf(uint256 tokenId) view returns (address)"
                ], factoryProvider);
                let bal = 0;
                try { bal = Number(await nft.balanceOf(address)); } catch { bal = 0; }
                if (!bal || bal <= 0) continue;
                const ownedIds = [];
                // Сначала пытаемся через ERC721Enumerable
                for (let i = 0; i < Math.min(bal, 10); i++) {
                  try { const tid = await nft.tokenOfOwnerByIndex(address, i); ownedIds.push(Number(tid)); } catch {}
                }
                // Если перечисление не поддерживается или ничего не вернуло — делаем ограниченный ownerOf‑скан
                if (ownedIds.length === 0) {
                  try {
                    // Пытаемся определить верхнюю границу по totalSupply/nextTokenId/currentIndex (ERC721A)
                    let upperBound = 200;
                    try {
                      const withSupply = new ethers.Contract(addrC, [
                        "function totalSupply() view returns (uint256)",
                        "function nextTokenId() view returns (uint256)",
                        "function currentIndex() view returns (uint256)"
                      ], factoryProvider);
                      try { const ts = await withSupply.totalSupply(); if (ts) upperBound = Math.min(1000, Number(ts)); } catch {}
                      try { const ni = await withSupply.nextTokenId(); if (ni) upperBound = Math.min(1000, Math.max(upperBound, Number(ni))); } catch {}
                      try { const ci = await withSupply.currentIndex(); if (ci) upperBound = Math.min(1000, Math.max(upperBound, Number(ci))); } catch {}
                    } catch {}
                    // Сканируем ownerOf по диапазону 0..upperBound (останавливаемся, когда нашли bal штук)
                    for (let tid = 0; tid < upperBound && ownedIds.length < bal && ownedIds.length < 20; tid++) {
                      try {
                        const owner = await nft.ownerOf(tid);
                        if (owner && owner.toLowerCase() === address.toLowerCase()) {
                          ownedIds.push(tid);
                        }
                      } catch {}
                    }
                  } catch {}
                }
                // Фолбэк: читаем contractURI и массив metadata.nfts, проверяем ownerOf по этим id
                if (ownedIds.length === 0) {
                  try {
                    const cUri = await nft.contractURI();
                    if (cUri && typeof cUri === 'string') {
                      const metaUrls = gatewayFallbacks(cUri, true);
                      let meta = null;
                      for (const u of metaUrls) {
                        try { const r = await fetch(u); if (r.ok) { meta = await r.json(); break; } } catch {}
                      }
                      const list = Array.isArray(meta?.nfts) ? meta.nfts : [];
                      // Берём первые 50 элементов, чтобы не перегружать ownerOf
                      for (let i = 0; i < Math.min(list.length, 50) && ownedIds.length < 20; i++) {
                        const item = list[i];
                        const tUri = item?.tokenURI || item?.tokenUri || '';
                        if (typeof tUri === 'string' && tUri.includes('/')) {
                          const tidStr = tUri.substring(tUri.lastIndexOf('/') + 1).replace(/\.json$/i, '');
                          const tidNum = Number(tidStr);
                          if (!Number.isNaN(tidNum)) {
                            try {
                              const owner = await nft.ownerOf(tidNum);
                              if (owner && owner.toLowerCase() === address.toLowerCase()) {
                                ownedIds.push(tidNum);
                              }
                            } catch {}
                          }
                        }
                      }
                    }
                  } catch {}
                }
                for (const tid of ownedIds) {
                  try {
                    const uri = await nft.tokenURI(tid);
                    const metaUrls = gatewayFallbacks(uri, true);
                    // Быстрый HEAD чтобы не тянуть 404 /0
                    let okUrl = null;
                    for (const u of metaUrls) {
                      try { const r = await fetch(u, { method: 'HEAD' }); if (r.ok) { okUrl = u; break; } } catch {}
                    }
                    // Если HEAD заблокирован на шлюзе — пробуем прямой GET
                    if (!okUrl) {
                      for (const u of metaUrls) {
                        try { const r = await fetch(u); if (r.ok) { okUrl = u; break; } } catch {}
                      }
                    }
                    if (!okUrl) continue;
                    // Тянем JSON
                    let meta = null;
                    try {
                      const r = await fetch(okUrl);
                      if (r.ok) meta = await r.json();
                    } catch {}
                    const media = meta?.image || meta?.animation_url || meta?.image_url;
                    const mediaUrl = media ? toPreferredGateway(media, true) : null;
                    // Даже если mediaUrl не определился (например, метаданные недоступны или без image),
                    // всё равно добавляем NFT — изображение подтянет компонент через on-chain tokenURI.
                    const baseItem = {
                      id: tid,
                      metadata: meta || {},
                      collectionName: 'Factory Collection',
                      tokenType: 'ERC-721',
                      token: { address: addrC, name: 'Factory Collection', type: 'ERC-721' },
                      isFactoryNFT: true
                    };
                    if (mediaUrl) {
                      baseItem.metadata.image = mediaUrl;
                    }
                    added.push(baseItem);
                  } catch {}
                }
              } catch {}
            }
            if (added.length) {
              // merge уникально
              setNfts(prev => {
                const merged = [...prev, ...added];
                return merged.filter((nft, index, self) =>
                  index === self.findIndex((t) => 
                    (String(t.id) === String(nft.id)) && 
                    ((t.token?.address || t.contractAddress || '').toLowerCase() === (nft.token?.address || nft.contractAddress || '').toLowerCase())
                  )
                );
              });
            }
          } catch (e) {
            console.warn('Background factory fallback failed:', e.message);
          }
        })();
        
      } catch (err) {
        console.error('Error fetching NFTs:', err);
        
        // Более информативные сообщения об ошибках
        if (err.message.includes('503')) {
          setError('NFT API server is temporarily unavailable. Please try again in a few minutes.');
        } else if (err.message.includes('Failed to fetch') || err.message.includes('completely unavailable')) {
          setError('NFT API server is currently down. Please try again later.');
        } else if (err.message.includes('Cannot read properties of undefined')) {
          setError('NFT API server is not responding. Please try again in a few minutes.');
        } else {
          setError(`Failed to load NFTs: ${err.message}`);
        }
        
        setNfts([]); // Устанавливаем пустой массив при ошибке
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      fetchNFTs();
    }
  }, [address]);

  const handleSortChange = (value) => {
    setSortBy(value);
  };

  const handleViewChange = (view) => {
    setViewMode(view);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <div className="w-12 h-12 bg-white rounded-full"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-zinc-400">Connect your wallet to view your NFT collection</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-zinc-800 rounded-lg mb-8 w-48"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-zinc-900 rounded-2xl h-80"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
            <div className="w-12 h-12 bg-white rounded-full"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Load NFTs</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
            >
              Try Again
            </button>
            
            <div className="text-xs text-zinc-500">
              <p>If the problem persists, the NFT API server might be temporarily down.</p>
              <p className="mt-1">You can check your NFTs directly on the blockchain explorer.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
          <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto p-6 pb-28">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My NFT Collection</h1>
          <p className="text-zinc-400">
            {filteredNFTs.length} NFT{filteredNFTs.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Search NFTs or collections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Collection Filter */}
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              {collections.map(collection => (
                <option key={collection} value={collection}>
                  {collection === 'all' ? 'All Collections' : collection}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
              <option value="collection">Collection A-Z</option>
            </select>

            {/* View Mode */}
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* NFT Grid */}
        {filteredNFTs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-zinc-800 to-zinc-700 rounded-full flex items-center justify-center">
              <div className="w-12 h-12 bg-zinc-600 rounded-full opacity-50"></div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No NFTs Found</h3>
            <p className="text-zinc-400">
              {searchTerm || selectedCollection !== 'all' 
                ? 'Try adjusting your filters' 
                : 'You don\'t have any NFTs yet'
              }
            </p>
          </div>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
              : 'grid-cols-1'
          }`}>
            {filteredNFTs.map((nft, index) => {
              try {
                return (
                  <NFTCard 
                    key={`${nft.token?.address}-${nft.id}-${index}`} 
                    nft={nft}
                  />
                );
              } catch (err) {
                console.error('Error rendering NFT card:', err, nft);
                return (
                  <div key={`error-${index}`} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-sm">
                    <div className="text-red-500 font-medium">Error rendering NFT</div>
                    <div className="text-zinc-500 text-sm">ID: {nft.id}</div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyNFTs;

// Prefer Lighthouse for factory NFTs; allow other gateways for external NFTs
const toPreferredGateway = (url, isFactory) => {
  if (typeof url !== 'string') return url;
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    return isFactory
      ? `https://gateway.lighthouse.storage/ipfs/${cid}`
      : `https://ipfs.io/ipfs/${cid}`;
  }
  return url;
};

const gatewayFallbacks = (url, isFactory) => {
  if (typeof url !== 'string') return [url];
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    const primary = isFactory
      ? `https://gateway.lighthouse.storage/ipfs/${cid}`
      : `https://ipfs.io/ipfs/${cid}`;
    return [
      primary,
      `https://gateway.lighthouse.storage/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`
    ];
  }
  return [url];
};

const fetchFirstOk = async (urls, options) => {
  for (const u of urls) {
    try {
      const r = await fetch(u, options);
      if (r.ok) return r;
    } catch {}
  }
  throw new Error('All gateways failed');
};
