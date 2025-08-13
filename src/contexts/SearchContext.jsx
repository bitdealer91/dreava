import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useReownWallet } from '../hooks/useReownWallet';
import { useAllCollections } from '../hooks/useAllCollections';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    priceRange: 'all',
    supplyRange: 'all',
    status: 'all'
  });
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState({
    collections: [],
    nfts: [],
    isLoading: false
  });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [userNFTs, setUserNFTs] = useState([]);
  
  const { address, isConnected } = useReownWallet();
  const { collections: allCollections } = useAllCollections();

  // Debug: логируем структуру allCollections
  useEffect(() => {
    if (allCollections && allCollections.length > 0) {
      console.log('🔍 SearchContext received allCollections:', {
        total: allCollections.length,
        sample: allCollections.slice(0, 3).map(col => ({
          name: col.name,
          nfts: col.nfts?.length || 0,
          firstNFTImage: col.nfts?.[0]?.image,
          firstNFT: col.nfts?.[0]
        }))
      });
    }
  }, [allCollections]);

  // Функция поиска по коллекциям
  const searchCollections = useCallback((collections, term) => {
    if (!term || !collections) return [];
    
    const searchLower = term.toLowerCase();
    const results = collections.filter(collection => 
      collection.name?.toLowerCase().includes(searchLower) ||
      collection.description?.toLowerCase().includes(searchLower) ||
      collection.symbol?.toLowerCase().includes(searchLower)
    );
    
    // Debug: логируем результаты поиска коллекций
    if (results.length > 0) {
      console.log('🔍 SearchCollections results:', {
        term,
        total: results.length,
        sample: results.slice(0, 3).map(col => ({
          name: col.name,
          nfts: col.nfts?.length || 0,
          firstNFTImage: col.nfts?.[0]?.image,
          firstNFT: col.nfts?.[0]
        }))
      });
    }
    
    return results;
  }, []);

  // Функция поиска по NFT
  const searchNFTs = useCallback((nfts, term) => {
    if (!term || !nfts) return [];
    
    const searchLower = term.toLowerCase();
    const results = nfts.filter(nft => 
      nft.metadata?.name?.toLowerCase().includes(searchLower) ||
      nft.metadata?.description?.toLowerCase().includes(searchLower) ||
      nft.collectionName?.toLowerCase().includes(searchLower) ||
      nft.id?.toString().includes(searchLower) ||
      nft.token?.name?.toLowerCase().includes(searchLower) ||
      nft.token?.symbol?.toLowerCase().includes(searchLower)
    );
    
    // Debug: логируем результаты поиска NFT
    if (results.length > 0) {
      console.log('🔍 SearchNFTs results:', {
        term,
        total: results.length,
        sample: results.slice(0, 3).map(nft => ({
          id: nft.id,
          name: nft.metadata?.name,
          collectionName: nft.collectionName,
          directImage: nft.image,
          metadataImage: nft.metadata?.image
        }))
      });
    }
    
    return results;
  }, []);

  // Получение NFT пользователя из API (как в MyNFTs)
  const fetchUserNFTs = useCallback(async () => {
    if (!isConnected || !address) return [];
    
    try {
      console.log('🔍 Fetching user NFTs for search from API...');
      
      // Используем тот же API endpoint, что и MyNFTs
      const response = await fetch(
        `https://somnia.w3us.site/api/v2/addresses/${address}/nft/collections?type=ERC-721%2CERC-404%2CERC-1155`
      );
      
      if (!response.ok) {
        console.warn('API response not ok:', response.status);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        console.warn('Invalid API response format');
        return [];
      }
      
      // Flatten all NFT instances from all collections (как в MyNFTs)
      let allNFTs = data.items.flatMap(collection => {
        if (!collection.token_instances || !Array.isArray(collection.token_instances)) {
          return [];
        }
        
        return collection.token_instances.map(nft => ({
          ...nft,
          id: nft.id,
          collectionName: collection.token?.name || 'Unknown',
          collectionSymbol: collection.token?.symbol || '',
          tokenType: collection.token?.type || 'ERC-721',
          token: collection.token || {},
          isFactoryNFT: collection.token?.address?.toLowerCase() === '0xb7C9318Ac06AA59fE3cDD8342769361bB0Cc3d09'.toLowerCase()
        }));
      });
      
      // Debug: логируем полученные NFT
      if (allNFTs.length > 0) {
        console.log('🔍 fetchUserNFTs received NFTs:', {
          total: allNFTs.length,
          sample: allNFTs.slice(0, 3).map(nft => ({
            id: nft.id,
            name: nft.metadata?.name,
            collectionName: nft.collectionName,
            directImage: nft.image,
            metadataImage: nft.metadata?.image
          }))
        });
      }

      // Fallback: если API collection items не имеют token_instances
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
                isFactoryNFT: t.token?.address?.toLowerCase() === '0xb7C9318Ac06AA59fE3cDD8342769361bB0Cc3d09'.toLowerCase()
              }));
            }
          }
        } catch (e) {
          console.warn('Fallback token fetch failed:', e.message);
        }
      }

      const uniqueNFTs = allNFTs.filter((nft, index, self) =>
        index === self.findIndex(t => t.id === nft.id && t.token?.address === nft.token?.address)
      );

      console.log('✅ Fetched user NFTs for search:', uniqueNFTs.length);
      return uniqueNFTs;
      
    } catch (error) {
      console.warn('Error fetching user NFTs for search:', error);
      return [];
    }
  }, [isConnected, address]);

  // Загружаем NFT пользователя для поиска, когда кошелек подключен
  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      try {
        if (isConnected && address) {
          const nfts = await fetchUserNFTs();
          if (!isCancelled) {
            setUserNFTs(Array.isArray(nfts) ? nfts : []);
          }
        } else {
          setUserNFTs([]);
        }
      } catch (e) {
        console.warn('Failed to load user NFTs for search:', e?.message || e);
        if (!isCancelled) setUserNFTs([]);
      }
    };
    load();
    return () => {
      isCancelled = true;
    };
  }, [isConnected, address, fetchUserNFTs]);

  // Основная функция поиска
  const performSearch = useCallback(async (term) => {
    if (!term || term.trim().length < 2) {
      setSearchResults({
        collections: [],
        nfts: [],
        isLoading: false
      });
      return;
    }

    setSearchResults(prev => ({ ...prev, isLoading: true }));

    try {
      // Поиск по коллекциям
      const collectionResults = searchCollections(allCollections, term);
      
      // Поиск по NFT пользователя
      const nftResults = searchNFTs(userNFTs, term);
      
      // Debug: логируем результаты поиска
      console.log('🔍 performSearch results:', {
        term,
        collections: {
          total: collectionResults.length,
          sample: collectionResults.slice(0, 3).map(col => ({
            name: col.name,
            nfts: col.nfts?.length || 0,
            firstNFTImage: col.nfts?.[0]?.image
          }))
        },
        nfts: {
          total: nftResults.length,
          sample: nftResults.slice(0, 3).map(nft => ({
            id: nft.id,
            name: nft.metadata?.name,
            collectionName: nft.collectionName
          }))
        }
      });

      setSearchResults({
        collections: collectionResults,
        nfts: nftResults,
        isLoading: false
      });
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({
        collections: [],
        nfts: [],
        isLoading: false
      });
    }
  }, [allCollections, userNFTs, searchCollections, searchNFTs]);

  // Обновление поиска
  const updateSearch = useCallback((term) => {
    setSearchTerm(term);
    
    if (term && term.trim().length >= 2) {
      console.log('🔍 updateSearch called with term:', term);
      performSearch(term);
      setShowSearchResults(true);
    } else {
      setSearchResults({
        collections: [],
        nfts: [],
        isLoading: false
      });
    }
  }, [performSearch]);

  // Обработка фокуса на поиске
  const handleSearchFocus = useCallback(() => {
    console.log('🔍 handleSearchFocus called, searchTerm:', searchTerm);
    if (searchTerm && searchTerm.trim().length >= 2) {
      setShowSearchResults(true);
    }
  }, [searchTerm]);

  // Обработка потери фокуса на поиске
  const handleSearchBlur = useCallback(() => {
    console.log('🔍 handleSearchBlur called');
    // Небольшая задержка, чтобы пользователь мог кликнуть на результат
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  }, []);

  // Обработка клика на "View all" для коллекций
  const handleViewAllCollections = useCallback(() => {
    console.log('🔍 handleViewAllCollections called, collections:', searchResults.collections.length);
    // Здесь можно добавить логику для показа всех результатов
    setShowSearchResults(false);
  }, [searchResults.collections.length]);

  // Обработка клика на "View all" для NFT
  const handleViewAllNFTs = useCallback(() => {
    console.log('🔍 handleViewAllNFTs called, nfts:', searchResults.nfts.length);
    // Здесь можно добавить логику для показа всех результатов
    setShowSearchResults(false);
  }, [searchResults.nfts.length]);

  // Обработка клика на коллекцию
  const handleCollectionClick = useCallback((collection) => {
    console.log('🔍 handleCollectionClick called for collection:', {
      name: collection.name,
      address: collection.address,
      nfts: collection.nfts?.length || 0,
      firstNFTImage: collection.nfts?.[0]?.image
    });
    // Здесь можно добавить логику для перехода к коллекции
    setShowSearchResults(false);
  }, []);

  // Обработка клика на NFT
  const handleNFTClick = useCallback((nft) => {
    console.log('🔍 handleNFTClick called for NFT:', {
      id: nft.id,
      name: nft.metadata?.name,
      collectionName: nft.collectionName,
      directImage: nft.image,
      metadataImage: nft.metadata?.image
    });
    // Здесь можно добавить логику для перехода к NFT
    setShowSearchResults(false);
  }, []);

  // Обновление фильтров
  const updateFilters = useCallback((newFilters) => {
    console.log('🔍 updateFilters called with:', newFilters);
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Сброс фильтров
  const resetFilters = useCallback(() => {
    console.log('🔍 resetFilters called');
    setFilters({
      priceRange: 'all',
      supplyRange: 'all',
      status: 'all'
    });
  }, []);

  // Очистка поиска
  const clearSearch = useCallback(() => {
    console.log('🔍 clearSearch called');
    setSearchTerm('');
    setSearchResults({
      collections: [],
      nfts: [],
      isLoading: false
    });
    setShowSearchResults(false);
    setIsSearchActive(false);
  }, []);

  // Скрытие результатов поиска
  const hideSearchResults = useCallback(() => {
    setShowSearchResults(false);
  }, []);

  // Переключение поиска
  const toggleSearch = useCallback(() => {
    console.log('🔍 toggleSearch called, current state:', { isSearchActive, showSearchResults });
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      setShowSearchResults(false);
    }
  }, [isSearchActive]);

  // Автоматическое обновление результатов при изменении коллекций
  useEffect(() => {
    if (searchTerm.length >= 2) {
      updateSearch(searchTerm);
    }
  }, [allCollections, searchTerm, updateSearch]);

  // Получение отфильтрованных результатов
  const getFilteredResults = useCallback(() => {
    console.log('🔍 getFilteredResults called with filters:', filters);
    
    let filteredCollections = searchResults.collections;
    let filteredNFTs = searchResults.nfts;

    // Применяем фильтры по цене
    if (filters.priceRange !== 'all') {
      // Логика фильтрации по цене
      console.log('🔍 Applying price filter:', filters.priceRange);
    }

    // Применяем фильтры по supply
    if (filters.supplyRange !== 'all') {
      // Логика фильтрации по supply
      console.log('🔍 Applying supply filter:', filters.supplyRange);
    }

    // Применяем фильтры по статусу
    if (filters.status !== 'all') {
      // Логика фильтрации по статусу
      console.log('🔍 Applying status filter:', filters.status);
    }

    return {
      collections: filteredCollections,
      nfts: filteredNFTs
    };
  }, [searchResults, filters]);

  // Получение статистики поиска
  const getSearchStats = useCallback(() => {
    console.log('🔍 getSearchStats called');
    
    const totalResults = searchResults.collections.length + searchResults.nfts.length;
    const hasResults = totalResults > 0;
    
    console.log('🔍 Search stats:', {
      totalResults,
      hasResults,
      collections: searchResults.collections.length,
      nfts: searchResults.nfts.length,
      isLoading: searchResults.isLoading
    });
    
    return {
      totalResults,
      hasResults,
      collections: searchResults.collections.length,
      nfts: searchResults.nfts.length,
      isLoading: searchResults.isLoading
    };
  }, [searchResults]);

  // Получение предложений для поиска
  const getSearchSuggestions = useCallback((partialTerm) => {
    if (!partialTerm || partialTerm.length < 1) return [];
    
    console.log('🔍 getSearchSuggestions called with:', partialTerm);
    
    const suggestions = [];
    
    // Предложения из коллекций
    if (allCollections) {
      const collectionSuggestions = allCollections
        .filter(col => col.name?.toLowerCase().includes(partialTerm.toLowerCase()))
        .slice(0, 3)
        .map(col => ({
          type: 'collection',
          name: col.name,
          description: col.description,
          image: col.nfts?.[0]?.image || col.cover
        }));
      
      suggestions.push(...collectionSuggestions);
      console.log('🔍 Collection suggestions:', collectionSuggestions);
    }
    
    // Предложения из NFT пользователя
    if (userNFTs) {
      const nftSuggestions = userNFTs
        .filter(nft => nft.metadata?.name?.toLowerCase().includes(partialTerm.toLowerCase()))
        .slice(0, 2)
        .map(nft => ({
          type: 'nft',
          name: nft.metadata?.name,
          description: nft.collectionName,
          image: nft.image || nft.metadata?.image
        }));
      
      suggestions.push(...nftSuggestions);
      console.log('🔍 NFT suggestions:', nftSuggestions);
    }
    
    console.log('🔍 Total suggestions:', suggestions.length);
    return suggestions;
  }, [allCollections, userNFTs]);

  // Получение истории поиска
  const getSearchHistory = useCallback(() => {
    console.log('🔍 getSearchHistory called');
    
    // Здесь можно добавить логику для получения истории поиска из localStorage
    const searchHistory = [];
    
    console.log('🔍 Search history:', searchHistory);
    return searchHistory;
  }, []);

  // Добавление недавнего поиска
  const addRecentSearch = useCallback((term) => {
    console.log('🔍 addRecentSearch called with:', term);
    
    // Здесь можно добавить логику для сохранения недавних поисков в localStorage
    console.log('🔍 Adding recent search:', term);
  }, []);

  // Очистка недавних поисков
  const clearRecentSearches = useCallback(() => {
    console.log('🔍 clearRecentSearches called');
    
    // Здесь можно добавить логику для очистки недавних поисков из localStorage
    console.log('🔍 Clearing recent searches');
  }, []);

  const value = {
    searchTerm,
    filters,
    isSearchActive,
    searchResults,
    showSearchResults,
    updateSearch,
    updateFilters,
    clearSearch,
    hideSearchResults
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}; 