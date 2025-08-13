// src/components/ViewCollectionTab.jsx
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getIpfsUrls, fetchWithFallback } from '../utils/ipfs.js';
import { Trash2, Eye, MoreHorizontal, RefreshCw, Upload, Globe, Twitter, ExternalLink, Settings, Play, X } from 'lucide-react';
import BannerCropEditor from './BannerCropEditor';
import nftAbi from '../abi/SomniaNFT.json';
import somniaLogo from '../assets/somnia-logo.svg';
import { uploadFile } from '../utils/storage';
import React from 'react';
import logo from '../assets/logo.svg';

// Global cache for preview data
const previewCache = new Map();
const PREVIEW_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const ViewCollectionTab = ({ collection }) => {
  const [socialLinks, setSocialLinks] = useState({
    website: '',
    twitter: '',
    discord: ''
  });
  const [collectionNFTs, setCollectionNFTs] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [showNFTDetails, setShowNFTDetails] = useState(false);
  const [showSalePreview, setShowSalePreview] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  
  // New states for collection management
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerPosition, setBannerPosition] = useState('center center');
  const [bannerFit, setBannerFit] = useState('contain'); // 'cover' or 'contain'
  const [bannerZoom, setBannerZoom] = useState(1);
  const [showBannerSettings, setShowBannerSettings] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showBannerCropEditor, setShowBannerCropEditor] = useState(false);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Helper function to validate and clean banner URL
  const validateBannerUrl = (url) => {
    if (!url) return '';
    if (typeof url === 'string') return url;
    if (typeof url === 'object') {
      // Try to extract URL from object
      const extractedUrl = url.gatewayUrl || url.url || url.cid || '';
      console.log('🔧 Extracted banner URL from object:', extractedUrl);
      return extractedUrl;
    }
    console.warn('🔧 Invalid banner URL type:', typeof url, url);
    return '';
  };

  // Load collection data including banner and social links
  const loadCollectionData = async () => {
    if (!collection) return;
    
    try {
      // Clean up any corrupted banner data
      const existingBanner = localStorage.getItem(`collection_${collection.address}_banner`);
      if (existingBanner) {
        try {
          const parsed = JSON.parse(existingBanner);
          if (typeof parsed === 'object' && !parsed.gatewayUrl && !parsed.url && !parsed.cid) {
            console.log('🧹 Cleaning up corrupted banner data');
            localStorage.removeItem(`collection_${collection.address}_banner`);
          }
        } catch (e) {
          // If it's not JSON, it's probably fine
        }
      }
      // Load banner
      const savedBanner = localStorage.getItem(`collection_${collection.address}_banner`);
      console.log('🔍 Loading saved banner from localStorage:', savedBanner);
      if (savedBanner) {
        try {
          // Try to parse as JSON in case it was saved as an object
          const parsedBanner = JSON.parse(savedBanner);
          const validatedUrl = validateBannerUrl(parsedBanner);
          setBannerUrl(validatedUrl);
          console.log('✅ Set banner URL from localStorage (parsed):', validatedUrl);
        } catch (e) {
          // If it's not JSON, treat as string
          const validatedUrl = validateBannerUrl(savedBanner);
          setBannerUrl(validatedUrl);
          console.log('✅ Set banner URL from localStorage (string):', validatedUrl);
        }
      }
      
      // Load banner position
      const savedBannerPosition = localStorage.getItem(`collection_${collection.address}_banner_position`);
      console.log('🔍 Loading saved banner position from localStorage:', savedBannerPosition);
      if (savedBannerPosition) {
        setBannerPosition(savedBannerPosition);
        console.log('✅ Set banner position from localStorage:', savedBannerPosition);
      }
      
      // Load banner fit
      const savedBannerFit = localStorage.getItem(`collection_${collection.address}_banner_fit`);
      console.log('🔍 Loading saved banner fit from localStorage:', savedBannerFit);
      if (savedBannerFit) {
        setBannerFit(savedBannerFit);
        console.log('✅ Set banner fit from localStorage:', savedBannerFit);
      }
      
      // Load banner zoom
      const savedBannerZoom = localStorage.getItem(`collection_${collection.address}_banner_zoom`);
      console.log('🔍 Loading saved banner zoom from localStorage:', savedBannerZoom);
      if (savedBannerZoom) {
        setBannerZoom(parseFloat(savedBannerZoom));
        console.log('✅ Set banner zoom from localStorage:', savedBannerZoom);
      }
      
      // Load social links
      const savedSocial = JSON.parse(localStorage.getItem(`collection_${collection.address}_social`) || '{}');
      setSocialLinks(savedSocial);
      
    } catch (error) {
      console.error('Error loading collection data:', error);
    }
  };

  useEffect(() => {
    loadCollectionData();
    loadCollectionNFTs(); // Add this call to load NFTs when collection changes
  }, [collection]);

  const loadCollectionNFTs = async () => {
    if (!collection) {
      console.log('❌ No collection provided to loadCollectionNFTs');
      return;
    }
    
    console.log('🔄 Starting loadCollectionNFTs for collection:', collection.address);
    
    // Check cache first
    const cacheKey = `${collection.address}_preview`;
    const cached = previewCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PREVIEW_CACHE_DURATION) {
      console.log('📦 Using cached preview data');
      setCollectionNFTs(cached.data);
      return;
    }
    
    try {
      setPreviewLoading(true);
      console.log('🔄 Loading collection preview...');
      
      // Try to load from localStorage first (fastest)
      const localStorageKey = `collection_${collection.address}_nfts`;
      console.log('🔍 Looking for NFTs in localStorage with key:', localStorageKey);
      
      const nfts = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
      console.log('📦 Found NFTs in localStorage:', nfts.length, 'NFTs');
      console.log('📋 First few NFTs:', nfts.slice(0, 3));
      
      // Additional debugging - show the raw localStorage data
      const rawData = localStorage.getItem(localStorageKey);
      console.log('🔍 Raw localStorage data:', rawData);
      console.log('🔍 Raw data length:', rawData ? rawData.length : 0);
      
      if (nfts.length > 0) {
        console.log('📦 Found NFTs in localStorage, processing images...');
        console.log('📋 Sample NFT structure:', nfts[0]);
        
        // Process images like in EditNFTs.jsx
        const updatedNFTs = await Promise.all(
          nfts.map(async (nft, index) => {
            console.log(`📝 Processing NFT ${index + 1}/${nfts.length}:`, nft.name, 'Image:', nft.image);
            
            try {
              // If image is IPFS URL, convert it
              if (nft.image?.startsWith('ipfs://')) {
                console.log(`🔄 Converting IPFS image for ${nft.name}`);
                return {
                  ...nft,
                  imageUrl: getIpfsUrls(nft.image)[0],
                  index,
                  name: nft.name || `${collection.name} #${index + 1}`,
                  description: nft.description || `NFT #${index + 1} from ${collection.name}`
                };
              }
              
              // If no image but has tokenURI, try to fetch metadata
              if (!nft.image && nft.tokenURI) {
                console.log(`🔄 Fetching metadata for ${nft.name} from tokenURI`);
                try {
                  const urls = getIpfsUrls(nft.tokenURI);
                  const metadata = await fetchWithFallback(urls);
                  console.log(`✅ Metadata fetched for ${nft.name}:`, metadata.name);
                  return {
                    ...nft,
                    imageUrl: metadata.image ? getIpfsUrls(metadata.image)[0] : (collection.cover || '/default-nft.png'),
                    index,
                    name: nft.name || `${collection.name} #${index + 1}`,
                    description: nft.description || `NFT #${index + 1} from ${collection.name}`
                  };
                } catch (err) {
                  console.error(`❌ Failed to fetch metadata for ${nft.name}:`, err.message);
                  return {
                    ...nft,
                    imageUrl: collection.cover || '/default-nft.png',
                    index,
                    name: nft.name || `${collection.name} #${index + 1}`,
                    description: nft.description || `NFT #${index + 1} from ${collection.name}`
                  };
                }
              }
              
              // If image is already a direct URL (most common case from SingleNFT/MultipleNFT)
              if (nft.image && !nft.image.startsWith('ipfs://')) {
                console.log(`✅ NFT ${nft.name} has direct image URL:`, nft.image);
                return {
                  ...nft,
                  imageUrl: nft.image, // Use the image field directly as imageUrl
                  index,
                  name: nft.name || `${collection.name} #${index + 1}`,
                  description: nft.description || `NFT #${index + 1} from ${collection.name}`
                };
              }
              
              // Fallback to collection cover or default
              console.log(`⚠️ Using fallback image for ${nft.name}`);
              return {
                ...nft,
                imageUrl: collection.cover || '/default-nft.png',
                index,
                name: nft.name || `${collection.name} #${index + 1}`,
                description: nft.description || `NFT #${index + 1} from ${collection.name}`
              };
            } catch (err) {
              console.error(`❌ Error processing NFT ${nft.name}:`, err);
              return {
                ...nft,
                imageUrl: collection.cover || '/default-nft.png',
                index,
                name: nft.name || `${collection.name} #${index + 1}`,
                description: nft.description || `NFT #${index + 1} from ${collection.name}`
              };
            }
          })
        );

        // Load up to 20 NFTs for preview
        const previewNFTs = updatedNFTs.slice(0, 20);
        console.log('🎯 Final preview NFTs:', previewNFTs.length, 'NFTs');
        console.log('📋 Preview NFTs with imageUrl:', previewNFTs.map(nft => ({ name: nft.name, imageUrl: nft.imageUrl })));
        
        // Cache the results
        previewCache.set(cacheKey, {
          data: previewNFTs,
          timestamp: Date.now()
        });
        
        setCollectionNFTs(previewNFTs);
        console.log('✅ Preview loaded successfully:', previewNFTs.length, 'NFTs');
      } else {
        console.log('📭 No NFTs found in localStorage');
        console.log('🔍 Checking if localStorage key exists but is empty...');
        
        // Check if the key exists but is empty or malformed
        const allKeys = Object.keys(localStorage);
        const collectionKeys = allKeys.filter(key => key.includes(collection.address));
        console.log('🔍 All localStorage keys for this collection:', collectionKeys);
        
        // Check if there are any other NFT-related keys
        const nftKeys = allKeys.filter(key => key.includes('nfts'));
        console.log('🔍 All NFT-related keys in localStorage:', nftKeys);
        
        setCollectionNFTs([]);
      }
    } catch (error) {
      console.error('❌ Error loading collection preview:', error);
      showToast('Failed to load collection preview', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (collection) {
      loadCollectionNFTs();
    }
  }, [collection]);

  // Handle banner upload
  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select a valid image file (JPG, PNG, GIF, WebP)', 'error');
      return;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showToast('File size too large. Please select a file smaller than 10MB', 'error');
      return;
    }
    
    try {
      setPreviewLoading(true);
      showToast('Uploading banner...', 'info');
      
      console.log('📤 Uploading banner file:', file.name, file.size, file.type);
      
      const uploadResult = await uploadFile(file);
      console.log('✅ Banner uploaded successfully:', uploadResult);
      console.log('🔗 Upload result type:', typeof uploadResult);
      console.log('🔗 Upload result keys:', Object.keys(uploadResult || {}));
      
      // Extract URL from the response object
      const uploadedUrl = uploadResult.gatewayUrl || uploadResult.url || uploadResult.cid;
      console.log('🔗 Extracted banner URL:', uploadedUrl);
      console.log('🔗 Banner URL type:', typeof uploadedUrl);
      
      if (!uploadedUrl) {
        console.error('❌ No URL in upload response:', uploadResult);
        throw new Error('No URL returned from upload. Please try again.');
      }
      
      const validatedUrl = validateBannerUrl(uploadedUrl);
      setBannerUrl(validatedUrl);
      
      // Save to localStorage
      localStorage.setItem(`collection_${collection.address}_banner`, validatedUrl);
      console.log('💾 Saved banner URL to localStorage:', validatedUrl);
      
      showToast('Banner uploaded successfully!', 'success');
    } catch (error) {
      console.error('❌ Error uploading banner:', error);
      showToast(`Failed to upload banner: ${error.message}`, 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle banner position change
  const handleBannerPositionChange = (position) => {
    setBannerPosition(position);
    localStorage.setItem(`collection_${collection.address}_banner_position`, position);
    console.log('💾 Saved banner position:', position);
  };

  // Handle banner fit change
  const handleBannerFitChange = (fit) => {
    setBannerFit(fit);
    localStorage.setItem(`collection_${collection.address}_banner_fit`, fit);
    console.log('💾 Saved banner fit:', fit);
  };

  // Handle banner zoom change
  const handleBannerZoomChange = (zoom) => {
    setBannerZoom(zoom);
    localStorage.setItem(`collection_${collection.address}_banner_zoom`, zoom.toString());
    console.log('💾 Saved banner zoom:', zoom);
  };

  const handleBannerCropSave = (settings) => {
    setBannerPosition(settings.position);
    setBannerFit(settings.fit);
    setBannerZoom(settings.zoom || 1);
    localStorage.setItem(`collection_${collection.address}_banner_position`, settings.position);
    localStorage.setItem(`collection_${collection.address}_banner_fit`, settings.fit);
    localStorage.setItem(`collection_${collection.address}_banner_zoom`, (settings.zoom || 1).toString());
    setShowBannerCropEditor(false);
    showToast('Banner settings updated', 'success');
  };

  // Handle social links update
  const handleSocialLinkChange = (platform, value) => {
    const updated = { ...socialLinks, [platform]: value };
    setSocialLinks(updated);
    localStorage.setItem(`collection_${collection.address}_social`, JSON.stringify(updated));
  };

  // Validate social links
  const validateSocialLinks = () => {
    const errors = {};
    
    if (socialLinks.twitter && !socialLinks.twitter.includes('twitter.com') && !socialLinks.twitter.includes('x.com')) {
      errors.twitter = 'Please enter a valid Twitter/X URL';
    }
    
    if (socialLinks.discord && !socialLinks.discord.includes('discord.gg')) {
      errors.discord = 'Please enter a valid Discord invite link';
    }
    
    if (socialLinks.website && !socialLinks.website.startsWith('http')) {
      errors.website = 'Please enter a valid website URL';
    }
    
    return errors;
  };

  // Get validated banner URL for display
  const displayBannerUrl = validateBannerUrl(bannerUrl);

  // Sale preview component
  const SalePreview = () => {
    if (!collection) return null;
    
    // Load data the same way as LaunchChecklistButton
    const safeParseJSON = (data, fallback) => {
      try {
        const parsed = JSON.parse(data);
        return parsed !== undefined ? parsed : fallback;
      } catch {
        return fallback;
      }
    };
    
    // Load data from localStorage (same as LaunchChecklistButton)
    const nfts = safeParseJSON(localStorage.getItem(`collection_${collection.address}_nfts`), []);
    const phases = safeParseJSON(localStorage.getItem(`phases_${collection.address}`), {});
    const nftCount = nfts.length;
    
    // Calculate potential revenue (same logic as LaunchChecklistButton)
    const phaseStats = Object.entries(phases).map(([key, phase]) => ({
      name: key,
      price: phase.price || '0',
      allocated: phase.allocated || 0,
      start: phase.start,
      end: phase.end,
      active: phase.active !== false
    }));
    
    const potentialRevenue = phaseStats.reduce((sum, phase) => {
      const price = parseFloat(phase.price) || 0;
      const allocated = parseInt(phase.allocated) || 0;
      return sum + (price * allocated);
    }, 0);
    
    // Calculate stats for preview (before launch)
    const maxSupply = collection.totalSupply || nftCount || 0;
    const totalMinted = 0; // Will be 0 before launch
    const totalRevenue = '0.0'; // Will be 0 before launch
    const contractBalance = 0; // Will be 0 before launch
    
    const stats = {
      totalSupply: maxSupply,
      totalMinted,
      totalRevenue,
      maxSupply,
      contractBalance,
      potentialRevenue: potentialRevenue.toFixed(2)
    };
    
    console.log('📊 Preview stats (before launch):', stats);
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9997] p-4">
                  <div className="bg-zinc-900/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn border border-zinc-700/30" tabIndex={-1} autoFocus>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-700/30">
            <h3 className="text-xl font-bold text-white">Sale Preview</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshStats}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors duration-200 text-sm"
                title="Refresh stats from blockchain"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Stats
              </button>
              <button
                onClick={() => setShowSalePreview(false)}
                className="text-zinc-400 hover:text-white transition-all duration-200 hover:scale-110"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {/* Banner Section */}
            {displayBannerUrl && (
              <div className="w-full h-[300px] rounded-2xl overflow-hidden mb-8 relative">
                <img 
                  src={displayBannerUrl} 
                  alt="Collection banner"
                  className={`w-full h-full object-${bannerFit} transition-all duration-300`}
                  style={{
                    objectPosition: bannerPosition,
                    transform: `scale(${bannerZoom || 1})`,
                    imageRendering: displayBannerUrl?.includes('.gif') ? 'auto' : 'optimizeQuality'
                  }}
                  onError={(e) => {
                    console.error('Failed to load banner in preview:', displayBannerUrl);
                    if (e.target) {
                      e.target.style.display = 'none';
                    }
                  }}
                />
                {/* Banner Overlay with Info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <div className="text-sm opacity-75">Banner: {bannerFit} • {bannerPosition}</div>
                </div>
              </div>
            )}
            
            {/* Collection Info Section */}
            <div className="flex items-start gap-6 mb-8">
              <img 
                src={collection?.cover || collection?.firstNFTImage || logo} 
                alt={collection?.name}
                className="w-24 h-24 rounded-2xl object-cover border border-zinc-600/30"
                onError={(e) => {
                  console.warn('⚠️ Collection cover failed to load:', e.target.src);
                  // Если нет обложки, пробуем показать изображение NFT
                  if (collection?.firstNFTImage && collection.firstNFTImage !== e.target.src) {
                    e.target.src = collection.firstNFTImage;
                  } else {
                    // Если нет изображения NFT, показываем логотип
                    e.target.src = logo;
                  }
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-3xl font-bold text-white">{collection?.name}</h2>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Real Data
                  </span>
                </div>
                <p className="text-zinc-400 text-lg mb-4">{collection?.description || 'No description available'}</p>
                
                {/* Social Links */}
                <div className="flex gap-4 mb-4">
                  {socialLinks.website && (
                    <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      <Globe size={20} />
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      <Twitter size={20} />
                    </a>
                  )}
                  {socialLinks.discord && (
                    <a href={socialLinks.discord} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.019 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                      </svg>
                    </a>
                  )}
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-4 shadow-2xl text-center">
                    <div className="text-xl font-bold text-white">{stats.maxSupply}</div>
                    <div className="text-xs text-zinc-400">Max Supply</div>
                  </div>
                  <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-4 shadow-2xl text-center">
                    <div className="text-xl font-bold text-white">{stats.totalMinted}</div>
                    <div className="text-xs text-zinc-400">Minted</div>
                  </div>
                  <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-4 shadow-2xl text-center">
                    <div className="text-xl font-bold text-white">{stats.totalRevenue} STT</div>
                    <div className="text-xs text-zinc-400">Revenue</div>
                  </div>
                  <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-4 shadow-2xl text-center">
                    <div className="text-xl font-bold text-white">{stats.potentialRevenue} STT</div>
                    <div className="text-xs text-zinc-400">Potential</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mint Section */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-8 shadow-2xl mb-8">
              <h3 className="text-xl font-bold text-white mb-4">Mint Section</h3>
              
              {/* Progress Bar */}
              <div className="w-full h-3 bg-zinc-700 rounded-full mb-6 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-pink-500 relative" style={{ width: `${Math.max(0, Math.min(100, (stats.totalMinted / Math.max(stats.maxSupply, 1)) * 100))}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
              </div>
              
              {/* Mint Info */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.totalMinted}</div>
                    <div className="text-sm text-zinc-400">Minted</div>
                  </div>
                  <div className="text-zinc-400 text-xl">/</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stats.maxSupply}</div>
                    <div className="text-sm text-zinc-400">Total</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-zinc-400 mb-1">Price</div>
                  <div className="flex items-center gap-2 text-xl font-bold text-white">
                    <img src={somniaLogo} alt="STT" className="w-5 h-5" />
                    {(() => {
                      // Find the first active phase with a price (Whitelist → FCFS → Public)
                      const phaseOrder = ['Whitelist', 'FCFS', 'Public'];
                      const now = new Date();
                      
                      for (const phaseKey of phaseOrder) {
                        const phase = phases[phaseKey];
                        if (phase && phase.price && phase.start && phase.end) {
                          const startDate = new Date(phase.start);
                          const endDate = new Date(phase.end);
                          
                          // Check if phase is active or upcoming
                          if (now >= startDate && now <= endDate) {
                            return phase.price; // Active phase
                          } else if (now < startDate) {
                            return phase.price; // Upcoming phase
                          }
                        }
                      }
                      
                      // Fallback to first phase with price
                      const firstPhaseWithPrice = Object.values(phases).find(phase => phase.price);
                      return firstPhaseWithPrice?.price || '0.1';
                    })()} STT
                  </div>
                </div>
              </div>
              
              {/* Mint Button - Removed from preview */}
              <div className="w-full py-4 bg-zinc-800/50 text-zinc-400 font-bold rounded-xl text-center">
                Mint button will appear here after launch
              </div>
            </div>
            
            {/* Sale Phases */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-8 shadow-2xl mb-8">
              <h3 className="text-xl font-bold text-white mb-4">Sale Phases</h3>
              <div className="space-y-3">
                {Object.entries(phases).map(([phaseKey, phaseData]) => {
                  const startDate = new Date(phaseData.start);
                  const endDate = new Date(phaseData.end);
                  const now = new Date();
                  const isActive = now >= startDate && now <= endDate;
                  const isUpcoming = now < startDate;
                  const isEnded = now > endDate;
                  
                  let status = 'Upcoming';
                  let statusColor = 'text-zinc-400';
                  
                  if (isActive) {
                    status = 'Active';
                    statusColor = 'text-green-400';
                  } else if (isEnded) {
                    status = 'Ended';
                    statusColor = 'text-red-400';
                  }
                  
                  return (
                    <div key={phaseKey} className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl">
                      <div>
                        <div className="font-semibold text-white">{phaseKey}</div>
                        <div className="text-sm text-zinc-400">
                          {phaseData.price} STT • {phaseData.allocated} NFTs
                        </div>
                        <div className="text-xs text-zinc-500">
                          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`text-sm ${statusColor}`}>{status}</div>
                    </div>
                  );
                })}
                {Object.keys(phases).length === 0 && (
                  <div className="text-center text-zinc-400 py-4">
                    No phases configured yet
                  </div>
                )}
              </div>
            </div>
            
            {/* NFT Preview Section */}
            <div className="bg-zinc-800/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">NFT Preview</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {collectionNFTs.slice(0, 6).map((nft, index) => (
                  <div key={nft.id || index} className="bg-zinc-900 rounded-xl overflow-hidden">
                    <img
                      src={nft.imageUrl || nft.image || '/default-nft.png'}
                      alt={nft.name}
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        e.target.src = '/default-nft.png';
                      }}
                    />
                    <div className="p-2">
                      <p className="text-xs text-white truncate">{nft.name}</p>
                    </div>
                  </div>
                ))}
                {collectionNFTs.length > 6 && (
                  <div className="bg-zinc-900 rounded-xl flex items-center justify-center h-24">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">+{collectionNFTs.length - 6}</div>
                      <div className="text-xs text-zinc-400">More</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDeleteNFT = (nftToDelete) => {
    const updatedNFTs = collectionNFTs.filter(nft => nft.id !== nftToDelete.id);
    setCollectionNFTs(updatedNFTs);
    
    // Update localStorage
    const allNFTs = JSON.parse(localStorage.getItem(`collection_${collection.address}_nfts`) || '[]');
    const updatedAllNFTs = allNFTs.filter(nft => nft.id !== nftToDelete.id);
    localStorage.setItem(`collection_${collection.address}_nfts`, JSON.stringify(updatedAllNFTs));
    
    // Clear cache
    const cacheKey = `${collection.address}_preview`;
    previewCache.delete(cacheKey);
    
    showToast('NFT deleted successfully', 'success');
  };

  const handleViewNFT = (nft) => {
    setSelectedNFT(nft);
    setShowNFTDetails(true);
  };

  const handleRefresh = () => {
    loadCollectionNFTs();
  };

  // Function to refresh stats from Stats tab
  const refreshStats = async () => {
    if (!collection?.address) return;
    
    try {
      showToast('🔄 Refreshing stats from blockchain...', 'info');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(collection.address, nftAbi, provider);
      
      // Get contract balance
      const contractBalance = await provider.getBalance(collection.address);
      const balanceInSTT = ethers.formatUnits(contractBalance, 18);
      
      // Get contract data
      const [totalSupply, maxSupply] = await Promise.all([
        contract.totalSupply(),
        contract.maxSupply()
      ]);
      
      // Load phases data
      const phases = JSON.parse(localStorage.getItem(`phases_${collection.address}`)) || {};
      const phaseStats = Object.entries(phases).map(([key, phase]) => ({
        name: key,
        price: phase.price || '0',
        allocated: phase.allocated || 0,
        start: phase.start,
        end: phase.end,
        active: phase.active !== false
      }));
      
      // Calculate potential revenue
      const potentialRevenue = phaseStats.reduce((sum, phase) => {
        const price = parseFloat(phase.price) || 0;
        const allocated = parseInt(phase.allocated) || 0;
        return sum + (price * allocated);
      }, 0);
      
      const updatedStats = {
        totalSupply: Number(maxSupply),
        maxSupply: Number(maxSupply),
        totalRevenue: parseFloat(balanceInSTT).toFixed(3),
        potentialRevenue: potentialRevenue.toFixed(2),
        totalMints: Number(totalSupply),
        uniqueHolders: Math.floor(Number(totalSupply) * 0.8),
        averagePrice: Number(totalSupply) > 0 ? (potentialRevenue / Number(totalSupply)).toFixed(2) : '0',
        phases: phaseStats,
        contractBalance: parseFloat(balanceInSTT),
        contractOwner: '',
        canWithdraw: false
      };
      
      // Save updated stats
      localStorage.setItem(`collection_${collection.address}_real_stats`, JSON.stringify(updatedStats));
      
      showToast('✅ Stats updated successfully!', 'success');
      
      // Force re-render of preview if it's open
      if (showSalePreview) {
        setShowSalePreview(false);
        setTimeout(() => setShowSalePreview(true), 100);
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
      showToast('❌ Failed to refresh stats', 'error');
    }
  };

  if (!collection) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-400">No collection selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Collection Header */}
      <div className="bg-zinc-800/50 rounded-xl p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            {/* Cover */}
            <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
              <img 
                src={collection.cover || collection.firstNFTImage || '/default-cover.png'} 
                alt="Cover"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.warn('⚠️ Collection cover failed to load:', e.target.src);
                  // Если нет обложки, пробуем показать изображение NFT
                  if (collection.firstNFTImage && collection.firstNFTImage !== e.target.src) {
                    e.target.src = collection.firstNFTImage;
                  } else {
                    // Если нет изображения NFT, показываем placeholder
                    e.target.src = '/default-cover.png';
                  }
                }}
              />
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">{collection.name}</h3>
              <p className="text-zinc-400 mb-4">{collection.description || 'No description available'}</p>
              <p className="text-sm text-zinc-500 font-mono">{collection.address}</p>
            </div>
          </div>
          
          {/* Preview Sale Button */}
          <button
            onClick={() => setShowSalePreview(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:opacity-90 transition-opacity font-semibold shadow-lg"
          >
            <Eye className="w-5 h-5" />
            Preview Sale
          </button>
        </div>
        
        {/* Banner Upload Section */}
        <div className="bg-zinc-800/50 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Sale Banner</h4>
          <div className="flex items-center gap-6">
            <div 
              className="w-64 h-32 rounded-xl overflow-hidden bg-zinc-900 border-2 border-dashed border-zinc-600 flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-pink-500/50 hover:bg-zinc-800/50 relative"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-pink-500', 'bg-zinc-800/50');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-pink-500', 'bg-zinc-800/50');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-pink-500', 'bg-zinc-800/50');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  handleBannerUpload({ target: { files: [files[0]] } });
                }
              }}
              onClick={() => !previewLoading && document.getElementById('banner-upload').click()}
            >
              {previewLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-2"></div>
                    <p className="text-sm text-white">Uploading...</p>
                  </div>
                </div>
              )}
              {displayBannerUrl ? (
                <img 
                  src={displayBannerUrl} 
                  alt="Banner preview"
                  className={`w-full h-full object-${bannerFit} transition-all duration-300`}
                  style={{
                    objectPosition: bannerPosition,
                    transform: `scale(${bannerZoom})`,
                    imageRendering: displayBannerUrl?.includes('.gif') ? 'auto' : 'optimizeQuality'
                  }}
                  onError={(e) => {
                    console.error('Failed to load banner image:', displayBannerUrl);
                    if (e.target) {
                      e.target.style.display = 'none';
                    }
                    if (e.target && e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'block';
                    }
                  }}
                />
              ) : null}
              {!displayBannerUrl && !previewLoading && (
                <div className="text-center">
                  <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">Upload banner</p>
                  <p className="text-xs text-zinc-500">Recommended: 1200x400px</p>
                  <p className="text-xs text-zinc-500 mt-1">Supports: JPG, PNG, GIF, WebP</p>
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*,.gif,.webp"
                onChange={handleBannerUpload}
                className="hidden"
                id="banner-upload"
                disabled={previewLoading}
              />
              <label
                htmlFor="banner-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity ${
                  previewLoading 
                    ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-500 to-pink-500 text-white cursor-pointer hover:opacity-90'
                }`}
              >
                {previewLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {displayBannerUrl ? 'Change Banner' : 'Upload Banner'}
                  </>
                )}
              </label>
              {displayBannerUrl && (
                <>
                  <button
                    onClick={() => setShowBannerSettings(true)}
                    className="ml-3 px-4 py-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 text-green-400 rounded-lg hover:from-green-500/30 hover:to-blue-500/30 transition-all duration-300"
                  >
                    Quick Settings
                  </button>
                  <button
                    onClick={() => setShowBannerCropEditor(true)}
                    className="ml-3 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-pink-500/20 text-blue-400 rounded-lg hover:from-blue-500/30 hover:to-pink-500/30 transition-all duration-300"
                  >
                    Advanced Settings
                  </button>
                  <button
                    onClick={() => {
                      setBannerUrl('');
                      localStorage.removeItem(`collection_${collection.address}_banner`);
                      localStorage.removeItem(`collection_${collection.address}_banner_position`);
                    }}
                    className="ml-3 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Social Links Section */}
        <div className="bg-zinc-800/50 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Social Links</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Website</label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-zinc-400" />
                <input
                  type="url"
                  placeholder="https://your-website.com"
                  value={socialLinks.website}
                  onChange={(e) => handleSocialLinkChange('website', e.target.value)}
                  className="flex-1 p-2 rounded-lg bg-zinc-900 border border-zinc-600 text-white text-sm focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Twitter/X</label>
              <div className="flex items-center gap-2">
                <Twitter className="w-4 h-4 text-zinc-400" />
                <input
                  type="url"
                  placeholder="https://twitter.com/username"
                  value={socialLinks.twitter}
                  onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                  className="flex-1 p-2 rounded-lg bg-zinc-900 border border-zinc-600 text-white text-sm focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Discord</label>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.019 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                </svg>
                <input
                  type="url"
                  placeholder="https://discord.gg/invite"
                  value={socialLinks.discord}
                  onChange={(e) => handleSocialLinkChange('discord', e.target.value)}
                  className="flex-1 p-2 rounded-lg bg-zinc-900 border border-zinc-600 text-white text-sm focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            These links will be displayed on your collection page. Leave empty to hide the icons.
          </p>
        </div>

        {/* NFT Preview */}
        <div className="bg-zinc-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">NFT Preview</h4>
            <button
              onClick={handleRefresh}
              disabled={previewLoading}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${previewLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {previewLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-zinc-400">Loading NFT preview...</p>
            </div>
          ) : collectionNFTs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {collectionNFTs.slice(0, 5).map((nft, index) => (
                <div
                  key={nft.id || index}
                  className="group relative bg-zinc-900 rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-200"
                  onClick={() => {
                    setSelectedNFT(nft);
                    setShowNFTDetails(true);
                  }}
                >
                  <img
                    src={nft.imageUrl || nft.image || '/default-nft.png'}
                    alt={nft.name}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      e.target.src = '/default-nft.png';
                    }}
                  />
                  <div className="p-3">
                    <h5 className="text-sm font-semibold text-white truncate">{nft.name}</h5>
                    <p className="text-xs text-zinc-400 truncate">{nft.description}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNFT(nft.id);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {collectionNFTs.length > 5 && (
                <button
                  onClick={() => setShowMoreModal(true)}
                  className="aspect-square rounded-xl border-2 border-dashed border-zinc-600/50 hover:border-pink-500/50 transition-all duration-300 flex items-center justify-center text-zinc-400 hover:text-zinc-300 bg-zinc-900/50 backdrop-blur-sm hover:scale-105 group"
                >
                  <div className="text-center group-hover:scale-110 transition-transform duration-300">
                    <div className="text-sm font-semibold">More</div>
                    <div className="text-xs">+{collectionNFTs.length - 5}</div>
                  </div>
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-zinc-400 mb-2">No NFTs found in this collection</p>
              <p className="text-xs text-zinc-500">Upload NFTs in the "Populate Collection" tab</p>
            </div>
          )}
        </div>
      </div>

      {/* Sale Preview Modal */}
      {showSalePreview && (
        <SalePreview />
      )}

      {/* NFT Modal */}
      {showNFTDetails && selectedNFT && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-fadeIn" tabIndex={-1} autoFocus>
            <div className="p-6">
              <div className="flex items-start gap-6">
                <div className="w-64 h-64 rounded-lg overflow-hidden flex-shrink-0">
                  <img 
                    src={selectedNFT.imageUrl} 
                    alt={selectedNFT.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedNFT.name}</h3>
                  <p className="text-zinc-400 mb-4">{selectedNFT.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Token ID:</span>
                      <span className="text-white font-mono">#{selectedNFT.tokenId || selectedNFT.id}</span>
                    </div>
                    
                    {selectedNFT.attributes && selectedNFT.attributes.length > 0 && (
                      <div>
                        <span className="text-zinc-400">Attributes:</span>
                        <div className="mt-2 space-y-1">
                          {selectedNFT.attributes.map((attr, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-zinc-400">{attr.trait_type}:</span>
                              <span className="text-white">{attr.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => setShowNFTDetails(false)}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors duration-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner Settings Modal */}
      {showBannerSettings && displayBannerUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9997] p-4">
          <div className="bg-zinc-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn border border-zinc-700/30" tabIndex={-1} autoFocus>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Banner Display Settings</h3>
                <button
                  onClick={() => setShowBannerSettings(false)}
                  className="text-zinc-400 hover:text-white transition-all duration-200 hover:scale-110"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Preview */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Preview</h4>
                  <div className="w-full h-64 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-600">
                    <img 
                      src={displayBannerUrl} 
                      alt="Banner preview"
                      className={`w-full h-full object-${bannerFit} transition-all duration-300`}
                      style={{
                        objectPosition: bannerPosition,
                        transform: `scale(${bannerZoom})`,
                        imageRendering: displayBannerUrl?.includes('.gif') ? 'auto' : 'optimizeQuality'
                      }}
                    />
                  </div>
                </div>
                
                {/* Settings */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Position Settings</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Display Position</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'top left', label: 'Top Left' },
                          { value: 'top center', label: 'Top Center' },
                          { value: 'top right', label: 'Top Right' },
                          { value: 'center left', label: 'Center Left' },
                          { value: 'center center', label: 'Center Center' },
                          { value: 'center right', label: 'Center Right' },
                          { value: 'bottom left', label: 'Bottom Left' },
                          { value: 'bottom center', label: 'Bottom Center' },
                          { value: 'bottom right', label: 'Bottom Right' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleBannerPositionChange(option.value)}
                            className={`p-3 rounded-lg border transition-all duration-200 ${
                              bannerPosition === option.value
                                ? 'border-pink-500 bg-pink-500/20 text-pink-400'
                                : 'border-zinc-600 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-700/50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Display Fit</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleBannerFitChange('cover')}
                          className={`p-3 rounded-lg border transition-all duration-200 ${
                            bannerFit === 'cover'
                              ? 'border-pink-500 bg-pink-500/20 text-pink-400'
                              : 'border-zinc-600 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-700/50'
                          }`}
                        >
                          Cover (Fill)
                        </button>
                        <button
                          onClick={() => handleBannerFitChange('contain')}
                          className={`p-3 rounded-lg border transition-all duration-200 ${
                            bannerFit === 'contain'
                              ? 'border-pink-500 bg-pink-500/20 text-pink-400'
                              : 'border-zinc-600 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-700/50'
                          }`}
                        >
                          Contain (Full)
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Zoom Level</label>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={bannerZoom}
                          onChange={(e) => handleBannerZoomChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-zinc-400">
                          <span>50%</span>
                          <span>{Math.round(bannerZoom * 100)}%</span>
                          <span>200%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Current Settings</label>
                      <div className="space-y-2">
                        <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-600">
                          <div className="text-xs text-zinc-400 mb-1">Position</div>
                          <code className="text-pink-400 font-mono">{bannerPosition}</code>
                        </div>
                        <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-600">
                          <div className="text-xs text-zinc-400 mb-1">Fit</div>
                          <code className="text-pink-400 font-mono capitalize">{bannerFit}</code>
                        </div>
                        <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-600">
                          <div className="text-xs text-zinc-400 mb-1">Zoom</div>
                          <code className="text-pink-400 font-mono">{Math.round(bannerZoom * 100)}%</code>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 space-y-3">
                      <button
                        onClick={() => {
                          setShowBannerSettings(false);
                          setShowBannerCropEditor(true);
                        }}
                        className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:opacity-90 transition-opacity font-semibold"
                      >
                        Advanced Crop Editor
                      </button>
                      <button
                        onClick={() => setShowBannerSettings(false)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity font-semibold"
                      >
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner Crop Editor */}
      {showBannerCropEditor && displayBannerUrl && (
        <BannerCropEditor
          imageUrl={displayBannerUrl}
          onSave={handleBannerCropSave}
          onCancel={() => setShowBannerCropEditor(false)}
          initialPosition={bannerPosition}
          initialFit={bannerFit}
        />
      )}

      {/* More NFTs Modal */}
      {showMoreModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[9997] p-4">
          <div className="bg-zinc-900/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-5xl w-full max-h-[85vh] animate-fadeIn border border-zinc-700/30" tabIndex={-1} autoFocus>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Collection Gallery</h3>
                <button
                  onClick={() => setShowMoreModal(false)}
                  className="text-zinc-400 hover:text-white transition-all duration-200 hover:scale-110"
                >
                  <X size={28} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-[65vh] overflow-y-auto">
                {collectionNFTs.map((nft, index) => (
                  <button
                    key={nft.id || index}
                    onClick={() => {
                      setSelectedNFT(nft);
                      setShowMoreModal(false);
                      setShowNFTDetails(true);
                    }}
                    className="group"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden border border-zinc-700/30 group-hover:border-pink-500/50 transition-all duration-300 hover:scale-105 bg-zinc-900/50 backdrop-blur-sm shadow-lg">
                      <img 
                        src={nft.imageUrl || nft.image || '/default-nft.png'} 
                        alt={nft.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = '/default-nft.png';
                        }}
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <div className="mt-3 text-center">
                      <div className="text-sm text-white font-medium truncate">{nft.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.visible && (
        <div className={`fixed bottom-24 right-4 p-4 rounded-lg shadow-lg max-w-xs animate-fadeIn cursor-pointer hover:opacity-100 opacity-90 z-[10000] ${
          toast.type === 'error' ? 'bg-red-800 text-white' : 
          toast.type === 'info' ? 'bg-blue-800 text-white' : 
          'bg-zinc-800 text-white'
        }`}>
          <p className="text-sm">{toast.message}</p>
        </div>
      )}
    </div>
  );
};

export default ViewCollectionTab; 