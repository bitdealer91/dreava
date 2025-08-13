import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import CollectionMetadataEditor from '../components/CollectionMetadataEditor';
import LaunchChecklistButton from '../components/LaunchChecklistButton';
import Banner from '../components/Banner';
import { getIpfsUrls } from '../utils/ipfs';

const ManageCollection = () => {
  const { address } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  useEffect(() => {
    const loadCollectionData = async () => {
      const saved = JSON.parse(localStorage.getItem('dreava_collections')) || [];
      const found = saved.find(col => col.address === address);
      if (found) {
        setCollection(found);
        if (found.banner) {
          setBannerPreview(found.banner);
        }

        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(address, [
            'function contractURI() public view returns (string)',
          ], provider);

          const contractUri = await contract.contractURI();
          if (contractUri && contractUri.startsWith('ipfs://')) {
            const urls = getIpfsUrls(contractUri);
            const res = await fetch(urls[0]);
            const metadata = await res.json();

            setCollection(prev => ({
              ...prev,
              description: metadata.description || '',
              seller_fee_basis_points: metadata.seller_fee_basis_points || 0,
              fee_recipient: metadata.fee_recipient || '',
              banner: prev.banner || '',
            }));
          }
        } catch (err) {
          console.error('Failed to fetch contract metadata:', err);
        }
      }
    };

    loadCollectionData();
  }, [address]);

  const updateCollectionBanner = (newBannerUrl) => {
    const saved = JSON.parse(localStorage.getItem('dreava_collections')) || [];
    const updated = saved.map(col =>
      col.address === address ? { ...col, banner: newBannerUrl } : col
    );
    localStorage.setItem('dreava_collections', JSON.stringify(updated));
    setCollection(prev => ({ ...prev, banner: newBannerUrl }));
  };

  // 🔄 Обновлённая функция
  const handleBannerUpload = async (file) => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

              const res = await fetch('/api/pin-file', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();

      if (data.gatewayUrl) {
        setBannerPreview(data.gatewayUrl);
        updateCollectionBanner(data.gatewayUrl);
      } else {
        throw new Error('No URL returned from server');
      }
    } catch (err) {
      console.error('Banner upload error:', err);
      alert('Failed to upload banner. Please try again.');
    }
  };

  const handleRemoveBanner = () => {
    if (window.confirm('Are you sure you want to delete the banner?')) {
      setBannerPreview(null);
      updateCollectionBanner(null);
    }
  };

  const goToEditNFTs = () => navigate(`/edit-nfts/${address}`);
  const goToEditPhases = () => navigate(`/edit-phases/${address}`);
  const goToManageWLs = () => navigate(`/manage-wls/${address}`);

  const fetchWithFallback = async (urls) => {
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) return await res.json();
      } catch {}
    }
    throw new Error('All IPFS gateways failed');
  };

  if (!collection) {
    return <div className="text-center text-zinc-400 mt-20">Collection not found.</div>;
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-12 text-white font-sans">
      <Banner
        imageUrl={bannerPreview}
        onUpload={handleBannerUpload}
        onRemove={handleRemoveBanner}
      />

      <div className="flex items-center gap-4 mb-6">
        <img 
          src={collection.cover || collection.firstNFTImage || '/default-cover.png'} 
          alt={collection.name}
          className="w-16 h-16 rounded-xl object-cover border border-zinc-600/30"
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
        <div>
          <h1 className="text-2xl font-bold text-white">{collection.name}</h1>
          <p className="text-zinc-400">{collection.address}</p>
        </div>
      </div>

      <CollectionMetadataEditor collection={collection} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <button
          onClick={goToEditPhases}
          className="w-full py-3 rounded-lg bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 transition"
        >
          Edit Phases
        </button>
        <button
          onClick={goToManageWLs}
          className="w-full py-3 rounded-lg bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 transition"
        >
          Manage WLs
        </button>
        <button
          onClick={goToEditNFTs}
          className="w-full py-3 rounded-lg bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 transition"
        >
          View NFTs
        </button>
        <LaunchChecklistButton collection={collection} />
      </div>
    </main>
  );
};

export default ManageCollection;
