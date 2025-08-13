import { useEffect, useState, useMemo } from 'react';

export const useActiveCollections = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);

  // Enhanced caching for high traffic - 10 minutes cache instead of 5
  const shouldRefetch = () => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetch;
    // Cache for 10 minutes to reduce API load and prevent page reloads
    return timeSinceLastFetch > 600000;
  };

  const fetchActiveCollections = async (force = false) => {
    // Don't fetch if data is fresh and not forced
    if (!force && !shouldRefetch() && collections.length > 0) {
      console.log('📦 Using cached collections data');
      return;
    }

      try {
        console.log('🔄 Fetching active collections from API...');

      // Add timeout for API requests during high traffic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const url = force ? `/api/active-collections?ts=${Date.now()}` : '/api/active-collections';
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        signal: controller.signal
        });

      clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Active collections data not available yet. Please wait for the indexer to run.');
          }
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log('✅ Received active collections from API:', {
          totalCollections: data.totalCollections,
          validCollections: data.validCollections,
          activeCollections: data.activeCollections,
          lastUpdate: data.lastUpdate,
          collections: data.collections.map(c => ({ 
            address: c.address, 
            name: c.name,
            banner: c.banner,
            metadataBanner: c.metadata?.banner,
            cover: c.cover,
            hasBanner: !!(c.banner || c.metadata?.banner),
            hasCover: !!c.cover,
            // 🖼️ Добавляем информацию об NFT для поиска
            nfts: c.nfts || [],
            hasNFTs: !!(c.nfts && c.nfts.length > 0),
            firstNFTImage: c.nfts && c.nfts.length > 0 ? (c.nfts[0].image || c.nfts[0].image_url || c.nfts[0].media_url) : null
          }))
        });
        try {
          const { filterOutBlacklisted } = await import('../utils/blacklist.js');
          const filtered = await filterOutBlacklisted(data.collections || []);
          setCollections(filtered);
        } catch {
          setCollections(data.collections || []);
        }
      setLastFetch(Date.now());
        setError(null);
      } catch (err) {
        console.error('❌ Failed to fetch active collections:', err);

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
    fetchActiveCollections(true); // Force load on mount

    // Update data every 10 minutes instead of 5 minutes for better stability
    const interval = setInterval(() => fetchActiveCollections(), 600000);

    return () => clearInterval(interval);
  }, []);

  // Memoized collections for optimization
  const memoizedCollections = useMemo(() => collections, [collections]);

  return {
    collections: memoizedCollections,
    loading,
    error,
    refetch: () => fetchActiveCollections(true) // Function for forced refresh
  };
};
