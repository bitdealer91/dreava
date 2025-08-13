import { useEffect, useState, useMemo } from 'react';

export const useAllCollections = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);

  // Enhanced caching for high traffic - 10 minutes cache
  const shouldRefetch = () => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetch;
    return timeSinceLastFetch > 600000; // 10 minutes
  };

  const fetchAllCollections = async (force = false) => {
    // Don't fetch if data is fresh and not forced
    if (!force && !shouldRefetch() && collections.length > 0) {
      console.log('📦 Using cached all collections data');
      return;
    }

    try {
      console.log('🔄 Fetching all collections from API...');

      // Add timeout for API requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
      const response = await fetch('/api/active-collections', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Collections data not available yet. Please wait for the indexer to run.');
        }
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ Received all collections from API:', {
        totalCollections: data.totalCollections,
        validCollections: data.validCollections,
        activeCollections: data.activeCollections,
        lastUpdate: data.lastUpdate,
        collections: data.collections.map(c => ({ 
          address: c.address, 
          name: c.name,
          description: c.description,
          symbol: c.symbol,
          banner: c.banner,
          metadataBanner: c.metadata?.banner,
          cover: c.cover,
          hasBanner: !!(c.banner || c.metadata?.banner),
          hasCover: !!c.cover,
          // 🖼️ Добавляем информацию об NFT для поиска
          nfts: c.nfts || [],
          hasNFTs: !!(c.nfts && c.nfts.length > 0),
          firstNFTImage: c.nfts && c.nfts.length > 0 ? (c.nfts[0].image || c.nfts[0].image_url || c.nfts[0].media_url) : null,
          // 🎯 Дополнительная информация для отладки
          nftsCount: c.nfts?.length || 0,
          firstNFT: c.nfts?.[0] || null
        }))
      });

      setCollections(data.collections || []);
      setLastFetch(Date.now());
      setError(null);
    } catch (err) {
      console.error('❌ Failed to fetch all collections:', err);

      // Handle timeout and rate limiting errors
      if (err.name === 'AbortError') {
        setError('Request timeout. Please check your connection.');
      } else if (err.message.includes('Too many requests')) {
        setError('Server is busy. Please wait a moment and refresh.');
      } else {
        setError(err.message);
      }

      // Don't clear collections on error, use cached data
      if (collections.length === 0) {
        setCollections([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCollections(true); // Force load on mount

    // Update data every 10 minutes
    const interval = setInterval(() => fetchAllCollections(), 600000);

    return () => clearInterval(interval);
  }, []);

  // Memoized collections for optimization
  const memoizedCollections = useMemo(() => collections, [collections]);

  return {
    collections: memoizedCollections,
    loading,
    error,
    refetch: () => fetchAllCollections(true) // Function for forced refresh
  };
}; 