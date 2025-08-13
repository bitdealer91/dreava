import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';
import { ArrowRight, Image, Package, Loader2 } from 'lucide-react';
import logo from '../assets/logo.svg';
import LazyImage from './LazyImage';

// Умная функция для обработки изображений NFT с правильным gateway
const getNFTImageUrl = (nft) => {
  console.log('🔍 getNFTImageUrl called for NFT:', nft.metadata?.name || nft.id, nft.collectionName);
  
  // 🎯 ПРИОРИТЕТ 1: Готовые HTTP URL изображений (уже сконвертированные индексером)
  let imageUrl = nft.image || nft.image_url || nft.media_url || '';
  
  // 🎯 ПРИОРИТЕТ 2: Если изображение уже HTTP URL (не IPFS), используем его
  if (imageUrl && !imageUrl.startsWith('ipfs://') && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
    console.log('✅ Using pre-converted HTTP image URL:', imageUrl);
    return imageUrl;
  }
  
  // 🎯 ПРИОРИТЕТ 3: Из metadata (если есть)
  if (!imageUrl && nft.metadata) {
    imageUrl = nft.metadata.image || nft.metadata.image_url || nft.metadata.media_url || '';
    console.log('📋 Using metadata image:', imageUrl);
  }
  
  // 🎯 ПРИОРИТЕТ 4: Если это IPFS URL, конвертируем в правильный gateway
  if (imageUrl && imageUrl.startsWith('ipfs://')) {
    const cid = imageUrl.replace('ipfs://', '');
    
    // Определяем тип коллекции по названию
    const isLighthouseCollection = 
      nft.collectionName?.toLowerCase().includes('somnia') ||
      nft.collectionName?.toLowerCase().includes('dreava') ||
      nft.collectionName?.toLowerCase().includes('dreava.art');
    
    if (isLighthouseCollection) {
      // Для наших коллекций используем Lighthouse (работает)
      imageUrl = `https://gateway.lighthouse.storage/ipfs/${cid}`;
      console.log('🏭 Converting to Lighthouse gateway for collection:', nft.collectionName);
    } else {
      // Для внешних коллекций используем Cloudflare (быстрый)
      imageUrl = `https://cloudflare-ipfs.com/ipfs/${cid}`;
      console.log('🌐 Converting to Cloudflare gateway for external collection:', nft.collectionName);
    }
  }
  
  console.log('✅ Final image URL:', imageUrl);
  return imageUrl;
};

// Функция для получения fallback изображения (обложка коллекции или изображение NFT)
const getFallbackImage = (nft) => {
  // Debug: логируем доступные коллекции
  if (window.allCollections) {
    console.log('🔍 Available collections in window.allCollections:', {
      total: window.allCollections.length,
      sample: window.allCollections.slice(0, 3).map(col => ({
        name: col.name,
        nfts: col.nfts?.length || 0,
        firstNFTImage: col.nfts?.[0]?.image
      }))
    });
  }
  
  // Ищем коллекцию в allCollections по названию
  const collection = window.allCollections?.find(col => 
    col.name === nft.collectionName ||
    col.name?.toLowerCase().includes(nft.collectionName?.toLowerCase()) ||
    nft.collectionName?.toLowerCase().includes(col.name?.toLowerCase())
  );
  
  if (collection) {
    console.log('🔍 Found collection for fallback:', {
      name: collection.name,
      nfts: collection.nfts?.length || 0,
      firstNFT: collection.nfts?.[0]
    });
    
    // 🎯 ПРИОРИТЕТ 1: Если в коллекции есть NFT с изображениями, используем первое
    if (collection.nfts && collection.nfts.length > 0) {
      const firstNFT = collection.nfts[0];
      const nftImage = firstNFT.image || firstNFT.image_url || firstNFT.media_url;
      
      if (nftImage && !nftImage.startsWith('ipfs://')) {
        console.log('🖼️ Using first NFT image from collection as fallback:', collection.name, nftImage);
        return nftImage;
      }
      
      // Если изображение IPFS, конвертируем его
      if (nftImage && nftImage.startsWith('ipfs://')) {
        const cid = nftImage.replace('ipfs://', '');
        const convertedUrl = `https://gateway.lighthouse.storage/ipfs/${cid}`;
        console.log('🖼️ Converting IPFS NFT image for fallback:', collection.name, convertedUrl);
        return convertedUrl;
      }
    }
    
    // 🎯 ПРИОРИТЕТ 2: Приоритет: cover -> banner -> metadataBanner
    const fallbackUrl = collection.cover || collection.banner || collection.metadataBanner;
    if (fallbackUrl) {
      console.log('🖼️ Using collection fallback image:', collection.name, fallbackUrl);
      return fallbackUrl;
    }
  }
  
  // Если не нашли коллекцию, возвращаем placeholder
  console.log('⚠️ No fallback image found, using placeholder');
  return null;
};

// Функция для получения fallback URLs если основной не загрузился
const getFallbackUrls = (originalUrl) => {
  if (!originalUrl || !originalUrl.startsWith('ipfs://')) {
    return [originalUrl];
  }
  
  const cid = originalUrl.replace('ipfs://', '');
  return [
    `https://gateway.lighthouse.storage/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`
  ];
};



const SearchResults = () => {
  const { searchResults, showSearchResults, hideSearchResults, searchTerm } = useSearch();
  const navigate = useNavigate();

  // ВСЕ хуки ДОЛЖНЫ быть в начале компонента!
  const handleCollectionClick = useCallback((collection) => {
    hideSearchResults();
    // Навигация к странице коллекции по адресу контракта
    navigate(`/launchpad/collection/${collection.address}`);
    console.log('Collection clicked:', collection);
  }, [hideSearchResults, navigate]);

  const handleNFTClick = useCallback((nft) => {
    hideSearchResults();
    // Передаем параметры для поиска конкретного NFT в MyNFTs
    const searchParams = new URLSearchParams();
    if (nft.id) searchParams.set('nftId', nft.id);
    if (nft.token?.address) searchParams.set('contract', nft.token.address);
    if (nft.metadata?.name) searchParams.set('nftName', nft.metadata.name);
    if (nft.collectionName) searchParams.set('collection', nft.collectionName);
    
    // Навигация с параметрами поиска
    navigate(`/my-nfts?${searchParams.toString()}`);
    console.log('NFT clicked with search params:', nft, searchParams.toString());
  }, [hideSearchResults, navigate]);

  const handleViewAllCollections = useCallback(() => {
    hideSearchResults();
    navigate('/');
  }, [hideSearchResults, navigate]);

  const handleViewAllNFTs = useCallback(() => {
    hideSearchResults();
    navigate('/my-nfts');
  }, [hideSearchResults, navigate]);

  const totalResults = useMemo(() => 
    searchResults.collections.length + searchResults.nfts.length, 
    [searchResults.collections.length, searchResults.nfts.length]
  );

  // Мемоизируем отфильтрованные результаты
  const displayedCollections = useMemo(() => 
    searchResults.collections.slice(0, 3), 
    [searchResults.collections]
  );

  const displayedNFTs = useMemo(() => 
    searchResults.nfts.slice(0, 3), 
    [searchResults.nfts]
  );

  // Ранний return ПОСЛЕ всех хуков
  if (!showSearchResults || !searchTerm) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/30 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
      {searchResults.isLoading ? (
        <div className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400 mb-2" />
          <p className="text-zinc-400">Searching...</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="p-6 text-center">
          <Package className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
          <p className="text-zinc-400">No results found for "{searchTerm}"</p>
        </div>
      ) : (
        <div className="p-4">
          {/* Collections Section */}
          {searchResults.collections.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Collections ({searchResults.collections.length})
                </h3>
                <button
                  onClick={handleViewAllCollections}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View all
                </button>
              </div>
                             <div className="space-y-2">
                 {displayedCollections.map((collection, index) => {
                   // Debug: логируем структуру коллекции для понимания
                   if (index === 0) {
                     console.log('🔍 First collection in search results:', {
                       name: collection.name,
                       cover: collection.cover,
                       banner: collection.banner,
                       metadataBanner: collection.metadataBanner,
                       nfts: collection.nfts,
                       nftsCount: collection.nfts?.length || 0,
                       firstNFTImage: collection.nfts?.[0]?.image,
                       firstNFT: collection.nfts?.[0],
                       fullCollection: collection
                     });
                   }
                   
                   return (
                     <div
                       key={`collection-${index}`}
                       onClick={() => handleCollectionClick(collection)}
                       className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
                     >
                     <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {(() => {
                          // Выбираем корректный URL для изображения коллекции
                          const rawUrl = collection.cover || collection.banner || collection.metadataBanner || collection.metadata?.image || collection.metadata?.banner;
                          const src = rawUrl;
                          return rawUrl ? (
                            <LazyImage
                              src={src}
                           alt={collection.name}
                           className="w-full h-full object-cover"
                           priority={index < 2} // Приоритет для первых 2 изображений
                           sizes="40px"
                           onError={(e) => {
                             console.warn('⚠️ Collection image failed to load:', e.target.src);
                             e.target.style.display = 'none';
                             e.target.nextSibling.style.display = 'flex';
                           }}
                            />
                          ) : null;
                        })()}
                        {(!collection.cover && !collection.banner && !collection.metadataBanner && !(collection.nfts && collection.nfts.length > 0)) ? null : null}
                        {(!collection.cover && !collection.banner && !collection.metadataBanner) && (collection.nfts && collection.nfts.length > 0) ? (
                         // 🖼️ Если нет обложки коллекции, показываем изображение первого NFT
                         <LazyImage
                           src={collection.nfts[0].image}
                           alt={`${collection.name} NFT`}
                           className="w-full h-full object-cover"
                           priority={index < 2}
                           sizes="40px"
                           onError={(e) => {
                             console.warn('⚠️ Collection NFT image failed to load:', e.target.src);
                             e.target.style.display = 'none';
                             e.target.nextSibling.style.display = 'flex';
                           }}
                         />
                        ) : null}
                       <div className="w-full h-full flex items-center justify-center" style={{ display: (collection.cover || collection.banner || collection.metadataBanner || (collection.nfts && collection.nfts.length > 0)) ? 'none' : 'flex' }}>
                         <Image className="w-5 h-5 text-zinc-400" />
                       </div>
                     </div>
                     <div className="flex-1 min-w-0">
                       <h4 className="text-sm font-medium text-white truncate">
                         {collection.name}
                       </h4>
                       <p className="text-xs text-zinc-400 truncate">
                         {collection.description || 'No description'}
                       </p>
                     </div>
                     <ArrowRight className="w-4 h-4 text-zinc-400" />
                   </div>
                 );
               })}
               </div>
            </div>
          )}

          {/* NFTs Section */}
          {searchResults.nfts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  My NFTs ({searchResults.nfts.length})
                </h3>
                <button
                  onClick={handleViewAllNFTs}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {displayedNFTs.map((nft, index) => {
                  // Debug: логируем структуру NFT для понимания
                  if (index === 0) {
                    console.log('🔍 First NFT in search results:', {
                      id: nft.id,
                      directImage: nft.image,
                      metadataImage: nft.metadata?.image,
                      contractAddress: nft.contractAddress || nft.token?.address,
                      isFactoryNFT: nft.isFactoryNFT,
                      collectionName: nft.collectionName,
                      fullNft: nft
                    });
                  }
                  
                  // Используем умную функцию для получения изображения
                  let imageUrl = getNFTImageUrl(nft);
                  
                  // Если нет изображения NFT, используем fallback (обложка коллекции или изображение NFT из коллекции)
                  if (!imageUrl) {
                    imageUrl = getFallbackImage(nft);
                    console.log('🔄 Using fallback image for NFT:', nft.metadata?.name || nft.id);
                  }
                  
                  // 🎯 ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Если NFT из коллекции, используем изображение из коллекции
                  if (!imageUrl && nft.collectionName) {
                    const collection = window.allCollections?.find(col => 
                      col.name === nft.collectionName ||
                      col.name?.toLowerCase().includes(nft.collectionName?.toLowerCase()) ||
                      nft.collectionName?.toLowerCase().includes(col.name?.toLowerCase())
                    );
                    
                    if (collection && collection.nfts && collection.nfts.length > 0) {
                      const firstNFT = collection.nfts[0];
                      const nftImage = firstNFT.image || firstNFT.image_url || firstNFT.media_url;
                      
                      if (nftImage) {
                        if (nftImage.startsWith('ipfs://')) {
                          // Конвертируем IPFS URL
                          const cid = nftImage.replace('ipfs://', '');
                          imageUrl = `https://gateway.lighthouse.storage/ipfs/${cid}`;
                        } else {
                          imageUrl = nftImage;
                        }
                        console.log('🖼️ Using collection NFT image as fallback:', collection.name, imageUrl);
                      }
                    }
                  }
                  
                  return (
                    <div
                      key={`nft-${nft.token?.address}-${nft.id}-${index}`}
                      onClick={() => handleNFTClick(nft)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {imageUrl ? (
                          <LazyImage
                            src={imageUrl}
                            alt={nft.metadata?.name || `NFT #${nft.id}`}
                            className="w-full h-full object-cover"
                            priority={index < 2} // Приоритет для первых 2 изображений
                            sizes="40px"
                            onError={(e) => {
                              console.warn('⚠️ NFT image failed to load:', e.target.src);
                              console.log('🔍 NFT data for debugging:', {
                                nft: nft.id,
                                directImage: nft.image,
                                metadataImage: nft.metadata?.image,
                                resolvedUrl: imageUrl
                              });
                              
                              // Пробуем использовать fallback изображение
                              const fallbackUrl = getFallbackImage(nft);
                              if (fallbackUrl && fallbackUrl !== imageUrl) {
                                console.log('🔄 Retrying with fallback image:', fallbackUrl);
                                e.target.src = fallbackUrl;
                              } else {
                                // Если нет fallback, показываем placeholder
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div className="w-full h-full flex items-center justify-center" style={{ display: imageUrl ? 'none' : 'flex' }}>
                          <img src={logo} alt="Logo" className="w-5 h-5 opacity-50" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">
                          {nft.metadata?.name || `NFT #${nft.id}`}
                        </h4>
                        <p className="text-xs text-zinc-400 truncate">
                          {nft.collectionName}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-zinc-700/30">
            <p className="text-xs text-zinc-500 text-center">
              Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchTerm}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;

// Умная функция для конвертации IPFS URLs с выбором gateway
const convertIPFSUrl = (url, isLighthouseCollection = false) => {
  if (url && url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    
    if (isLighthouseCollection) {
      // Для наших коллекций используем Lighthouse
      return `https://gateway.lighthouse.storage/ipfs/${cid}`;
    } else {
      // Для внешних используем Cloudflare
      return `https://cloudflare-ipfs.com/ipfs/${cid}`;
    }
  }
  return url;
};