// CollectionMetadataEditor.jsx (aligned with CreateCollection flow)
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { X } from 'lucide-react';
import { getIpfsUrls, fetchWithFallback } from '../utils/ipfs';
import React from 'react';
import logo from '../assets/logo.svg';

const CollectionMetadataEditor = ({ collection }) => {
  const [description, setDescription] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [royaltyPercent, setRoyaltyPercent] = useState(0);
  const [royaltyRecipient, setRoyaltyRecipient] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalText, setModalText] = useState('');
  const [progress, setProgress] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const loadCollectionMetadata = async () => {
      setDescription(collection.description || '');
      setExternalLink(collection.external_link || '');
      setRoyaltyPercent(collection.royaltyPercent || 0);
      setRoyaltyRecipient(collection.royaltyRecipient || '');

      let imageSet = false;
      if (collection.image && collection.image.trim() !== '') {
        setCoverPreview(getIpfsUrls(collection.image)[0]);
        imageSet = true;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const nft = new ethers.Contract(
          collection.address,
          ['function contractURI() public view returns (string)'],
          provider
        );
        const contractURI = await nft.contractURI();
        if (!contractURI) return;

        const httpUri = getIpfsUrls(contractURI)[0];
        const res = await fetch(httpUri);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const metadata = await res.json();

        if (!collection.description && metadata.description) setDescription(metadata.description);
        if (!collection.external_link && metadata.external_link) setExternalLink(metadata.external_link);
        if (!collection.royaltyPercent && metadata.royaltyPercent) setRoyaltyPercent(metadata.royaltyPercent);
        if (!collection.royaltyRecipient && metadata.royaltyRecipient) setRoyaltyRecipient(metadata.royaltyRecipient);

        // Если coverPreview ещё не установлен, ставим из contractURI
        if (!imageSet && metadata.image) {
          setCoverPreview(getIpfsUrls(metadata.image)[0]);
        }
      } catch (err) {
        console.warn('Could not load image or metadata from contractURI:', err);
      }
    };

    loadCollectionMetadata();
  }, [collection]);

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const uploadToBackend = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
            const res = await fetch('/api/pin-file', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data.ipfsUri;
  };

  const handleSaveMetadata = async () => {
    try {
      setLoading(true);
      setShowModal(true);
      setModalText('Uploading cover image...');
      setProgress(20);

      let imageUri = '';
      if (coverFile) {
        imageUri = await uploadToBackend(coverFile);
      } else if (coverPreview) {
        imageUri = coverPreview;
      } else if (collection.image) {
        imageUri = collection.image;
      } else {
        imageUri = '';
      }

      setModalText('Uploading metadata...');
      setProgress(50);

      const metadata = {
        name: collection.name,
        description,
        image: imageUri,
        external_link: externalLink,
        royaltyRecipient,
        royaltyPercent,
      };

              const res = await fetch('/api/pin-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const ipfsUri = data.ipfsUri;

      setModalText('Signing transaction...');
      setProgress(75);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const nftContract = new ethers.Contract(collection.address, [
        'function setContractURI(string uri) external',
      ], signer);

      const tx = await nftContract.setContractURI(ipfsUri);
      await tx.wait();

      // Обновляем image в localStorage, чтобы не было путаницы с cover
      const saved = JSON.parse(localStorage.getItem('dreava_collections')) || [];
      const updated = saved.map(col =>
        col.address === collection.address
          ? { ...col, image: imageUri }
          : col
      );
      localStorage.setItem('dreava_collections', JSON.stringify(updated));

      setModalText('✅ Metadata updated successfully!');
      setProgress(100);
    } catch (err) {
      console.error('Error updating metadata:', err);
      setModalText(`❌ Error: ${err.message}`);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full mx-auto text-white pt-[8px] font-sans">
      <h2 className="text-[24px] font-bold bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent leading-none mb-[6px]">
        Edit Collection Metadata
      </h2>

      <div className="mb-[20px] flex gap-[24px] items-start">
        <div className="flex flex-col">
          <label className="text-[13px] font-medium mb-[6px] text-white">Cover Image</label>
          <label
            htmlFor="cover-upload"
            className="w-[160px] h-[144px] bg-zinc-900 border border-zinc-600 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer overflow-hidden"
          >
            {coverPreview ? (
              <img src={coverPreview || collection.firstNFTImage || logo} alt="preview" className="w-full h-full object-cover" onError={(e) => { 
                console.warn('⚠️ Cover preview failed to load:', e.target.src);
                // Если нет обложки, пробуем показать изображение NFT
                if (collection.firstNFTImage && collection.firstNFTImage !== e.target.src) {
                  e.target.src = collection.firstNFTImage;
                } else {
                  // Если нет изображения NFT, показываем логотип
                  e.target.src = logo;
                }
              }} />
            ) : (
              <img src="/src/assets/upload-icon.svg" alt="icon" className="w-8 h-8 opacity-70" />
            )}
            <input
              id="cover-upload"
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex-1">
          <label className="text-[13px] font-medium mb-[4px] block text-white">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-600 text-white h-[144px] placeholder:text-zinc-500 text-sm"
          />
        </div>
      </div>

      <label className="text-[13px] font-medium mb-[4px] block text-white">Website</label>
      <input
        type="text"
        value={externalLink}
        onChange={(e) => setExternalLink(e.target.value)}
        placeholder="https://yourwebsite.com"
        className="w-full p-3 mb-[16px] rounded-xl bg-zinc-800 border border-zinc-600 text-white placeholder:text-zinc-500 text-sm"
      />

      <label className="text-[13px] font-medium mb-[4px] block text-white">Royalty Recipient</label>
      <input
        type="text"
        value={royaltyRecipient}
        onChange={(e) => setRoyaltyRecipient(e.target.value)}
        className="w-full p-3 mb-[12px] rounded-xl bg-zinc-800 border border-zinc-600 text-white text-sm"
      />

      <label className="text-[13px] font-medium mb-[4px] block text-white">Royalty Percent (%)</label>
      <input
        type="number"
        min={0}
        max={100}
        value={royaltyPercent}
        onChange={(e) => setRoyaltyPercent(parseFloat(e.target.value))}
        className="w-full p-3 mb-[20px] rounded-xl bg-zinc-800 border border-zinc-600 text-white text-sm"
      />

      <button
        onClick={handleSaveMetadata}
        disabled={loading}
        className="w-full py-[12px] mb-[24px] rounded-xl bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-semibold text-sm transition-transform active:scale-95 shadow-md"
      >
        {loading ? 'Saving...' : 'Save Metadata'}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[9997]">
                      <div className="bg-zinc-900 p-6 rounded-xl shadow-lg max-w-lg w-full text-center relative animate-fadeIn" tabIndex={-1} autoFocus>
            <button
              className="absolute top-2 right-2 text-zinc-400 hover:text-red-400"
              onClick={() => setShowModal(false)}
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
              Update Progress
            </h3>
            <div className="w-full bg-zinc-700 rounded-full h-5 mb-4 relative">
              <div
                className="bg-gradient-to-r from-blue-500 to-pink-500 h-5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
              <span className="absolute inset-0 flex justify-center items-center text-sm text-white font-semibold">
                {progress}%
              </span>
            </div>
            <p className="text-sm text-white mb-2">{modalText}</p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionMetadataEditor;
