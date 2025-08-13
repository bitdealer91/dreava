// CreateCollection.jsx (Updated)
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useReownWallet } from '../hooks/useReownWallet';
import { ensureSomniaNetwork, SOMNIA_CHAIN_ID_DEC } from '../utils/network';
import { useNavigate } from 'react-router-dom';
import { X, ChevronDown, ExternalLink, Upload } from 'lucide-react';
import factoryAbi from '../abi/SomniaFactory.json';
import nftAbi from '../abi/SomniaNFT.json';
import { uploadFile, uploadMetadata } from '../utils/storage';
import uploadIcon from '../assets/upload-icon.svg';
import VideoSpinner from './VideoSpinner';
import CancelWarningModal from './CancelWarningModal';

const FACTORY_ADDRESS = '0xb7C9318Ac06AA59fE3cDD8342769361bB0Cc3d09';
const CATEGORY_OPTIONS = ['Art', 'Collectibles', 'Gaming', 'Music', 'Domains', 'Utility', 'Other'];
const COLOR_CLASSES = ['bg-blue-600', 'bg-pink-600', 'bg-green-600', 'bg-purple-600', 'bg-yellow-600', 'bg-red-600'];

const CreateCollection = ({ onSuccess }) => {
  const [form, setForm] = useState({ name: '', description: '', categories: [], royaltyRecipient: '', royaltyPercent: 0 });
  const [coverFile, setCoverFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalText, setModalText] = useState('');
  const [progress, setProgress] = useState(0);
  const [showDoneButton, setShowDoneButton] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', txHash: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  const navigate = useNavigate();
  const { switchNetwork } = useReownWallet();

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const showToast = (message, txHash = '') => {
    setToast({ visible: true, message, txHash });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('📝 Form field changed:', name, value);
    setForm({ ...form, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log('📁 File selected:', file ? { name: file.name, size: file.size, type: file.type } : 'No file');
    
    if (file) {
      // Проверяем размер файла (10MB = 10 * 1024 * 1024 bytes)
      const maxSize = 10 * 1024 * 1024; // 10MB в байтах
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const errorMessage = `File size (${fileSizeMB}MB) exceeds the maximum allowed size of 10MB. Please choose a smaller file.`;
        showToast(`❌ ${errorMessage}`);
        console.error('❌ File too large:', fileSizeMB, 'MB');
        e.target.value = ''; // Очищаем input
        return;
      }
      
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        showToast('❌ Please select an image file (JPG, PNG, GIF, SVG)');
        console.error('❌ Invalid file type:', file.type);
        e.target.value = ''; // Очищаем input
        return;
      }
    }
    
    setCoverFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-pink-500/50', 'bg-pink-500/10');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-pink-500/50', 'bg-pink-500/10');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-pink-500/50', 'bg-pink-500/10');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        showToast('❌ Please drop an image file (JPG, PNG, GIF, SVG)');
        console.error('❌ Invalid file type dropped:', file.type);
        return;
      }
      
      // Проверяем размер файла (10MB = 10 * 1024 * 1024 bytes)
      const maxSize = 10 * 1024 * 1024; // 10MB в байтах
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const errorMessage = `File size (${fileSizeMB}MB) exceeds the maximum allowed size of 10MB. Please choose a smaller file.`;
        showToast(`❌ ${errorMessage}`);
        console.error('❌ File too large dropped:', fileSizeMB, 'MB');
        return;
      }
      
      setCoverFile(file);
    }
  };

  const toggleCategory = (category) => {
    setForm((prev) => {
      const exists = prev.categories.includes(category);
      const updated = exists ? prev.categories.filter((cat) => cat !== category) : [...prev.categories, category];
      return { ...prev, categories: updated };
    });
  };

  const uploadToBackend = async (file) => {
    try {
      console.log('📤 Uploading file:', file.name, file.size, file.type);
      console.log('📤 File object:', file);
      
      const result = await uploadFile(file);
      console.log('✅ File uploaded successfully:', result);
      console.log('✅ Result object:', result);
      
      // Проверяем, что у нас есть правильный URL
      const imageUrl = result.gatewayUrl || result.url;
      console.log('✅ Image URL for collection:', imageUrl);
      console.log('✅ Full result object:', result);
      
      if (!imageUrl) {
        console.error('❌ No image URL found in result:', result);
        throw new Error('Failed to get image URL from upload result');
      }
      
      return imageUrl;
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      throw error;
    }
  };

  const uploadMetadataJSON = async (json) => {
    try {
      console.log('📋 Uploading metadata JSON:', json);
      const result = await uploadMetadata(json);
      console.log('✅ Metadata uploaded successfully:', result);
      return result.url;
    } catch (error) {
      console.error('❌ Error uploading metadata:', error);
      throw error;
    }
  };

  const createCollection = async () => {
    try {
      setIsCreating(true);
      console.log('🔍 Form validation:', {
        name: form.name,
        description: form.description,
        coverFile: coverFile ? coverFile.name : 'No file',
        ethereum: !!window.ethereum
      });
      
      if (!window.ethereum) throw new Error('Wallet not detected');
      if (!form.name || !coverFile || !form.description) throw new Error('Name, description, and cover image required');
      
      // Дополнительная проверка размера файла перед загрузкой
      const maxSize = 10 * 1024 * 1024; // 10MB в байтах
      if (coverFile.size > maxSize) {
        const fileSizeMB = (coverFile.size / (1024 * 1024)).toFixed(1);
        throw new Error(`File size (${fileSizeMB}MB) exceeds the maximum allowed size of 10MB`);
      }
      
      // Проверяем тип файла
      if (!coverFile.type.startsWith('image/')) {
        throw new Error('Invalid file type. Please select an image file.');
      }

      // РАННЯЯ ПРОВЕРКА СЕТИ: до любых загрузок / транзакций
      try {
        const sw = await (async () => { try { return await switchNetwork?.(SOMNIA_CHAIN_ID_DEC); } catch { return { success: false }; } })();
        if (!sw?.success) await ensureSomniaNetwork();
        const providerCheck = new ethers.BrowserProvider(window.ethereum);
        const net = await providerCheck.getNetwork();
        if (Number(net.chainId) !== SOMNIA_CHAIN_ID_DEC) {
          setShowNetworkModal(true);
          setIsCreating(false);
          return;
        }
      } catch (e) {
        setShowNetworkModal(true);
        setIsCreating(false);
        return;
      }

      setShowModal(true);
      setModalText('📤 Uploading cover image to IPFS...');
      setProgress(10);
      const coverUrl = await uploadToBackend(coverFile);
      console.log('🎯 Cover URL for metadata:', coverUrl);

      setModalText('📋 Uploading collection metadata...');
      setProgress(40);
      const metadataJson = {
        name: form.name,
        description: form.description,
        image: coverUrl,
        categories: form.categories,
        royaltyRecipient: form.royaltyRecipient,
        royaltyPercent: form.royaltyPercent,
      };
      console.log('🎯 Metadata JSON to upload:', metadataJson);
      const metadataUrl = await uploadMetadataJSON(metadataJson);

      setModalText('⛓️ Creating collection on blockchain...');
      setProgress(70);
      
      // Ensure correct network before creating collection (wagmi-first)
      try {
        const sw = await (async () => { try { return await switchNetwork?.(SOMNIA_CHAIN_ID_DEC); } catch { return { success: false }; } })();
        if (!sw?.success) await ensureSomniaNetwork();
      } catch (e) {
        showToast('❌ Please switch to Somnia Testnet to create a collection');
        setIsCreating(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Проверяем подключение к RPC
      try {
        const network = await provider.getNetwork();
        console.log('Connected to network:', network);
      } catch (e) {
        console.error('RPC connection error:', e);
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      const factory = new ethers.Contract(
        FACTORY_ADDRESS,
        factoryAbi,
        signer
      );
      
      console.log('Factory address:', factory.target);
      
      const symbol = form.name.substring(0, 3).toUpperCase();
      
      const params = [
        form.name,
        symbol,
        0,
        "",
        "",
        metadataUrl,
        form.royaltyRecipient || ethers.ZeroAddress,
        Math.round(Number(form.royaltyPercent) * 100),
        { value: ethers.parseUnits('0.05', 18) }
      ];
      
      console.log('Creating collection with params:', params);
      
      // Пробуем создать коллекцию с повторными попытками
      let tx = null;
      let retries = 3;
      
      while (retries > 0 && !tx) {
        try {
          tx = await factory.createCollection(...params);
          break;
        } catch (e) {
          console.warn(`Collection creation attempt ${4 - retries} failed:`, e);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем 2 секунды перед следующей попыткой
          } else {
            throw e;
          }
        }
      }
      
      console.log('Transaction sent:', tx.hash);
      
      setModalText('⏳ Waiting for blockchain confirmation...');
      
      // Ждем подтверждения транзакции с повторными попытками
      let receipt = null;
      retries = 3;
      
      while (retries > 0 && !receipt) {
        try {
          receipt = await tx.wait();
          break;
        } catch (e) {
          console.warn(`Transaction confirmation attempt ${4 - retries} failed:`, e);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw e;
          }
        }
      }
      
      console.log('Transaction confirmed:', receipt);
      
      const event = receipt.logs.map(log => {
        try { 
          return factory.interface.parseLog(log); 
        } catch (e) {
          console.warn('Failed to parse log:', e);
          return null;
        }
      }).find(e => e && e.name === 'CollectionCreated');

      if (!event) {
        throw new Error('CollectionCreated event not found in transaction logs');
      }

      const collectionAddress = event.args.collection;
      console.log('Collection created at:', collectionAddress);

      if (collectionAddress) {
        const nftContract = new ethers.Contract(collectionAddress, nftAbi, signer);
        await nftContract.setContractURI(metadataUrl);
      }

      const collectionData = { 
        address: collectionAddress, 
        name: form.name, 
        description: form.description,
        image: coverUrl,
        cover: coverUrl, // Добавляем поле cover для совместимости
        banner: coverUrl, // Добавляем поле banner для совместимости
        metadata: metadataUrl,
        createdAt: new Date().toISOString()
      };
      
      console.log('📦 Collection data created:', collectionData);
      console.log('📦 Cover URL in collection data:', collectionData.cover);

      const saved = JSON.parse(localStorage.getItem('dreava_collections')) || [];
      saved.push(collectionData);
      localStorage.setItem('dreava_collections', JSON.stringify(saved));

      setModalText('✅ Collection created successfully!');
      setProgress(100);
      
      // 🎯 Record quest action for collection creation
      try {
        const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
        const userAddress = await signer.getAddress();
        
        await fetch('/api/quest/record-action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: userAddress,
            actionType: 'collection_created',
            data: {
              collectionAddress: collectionAddress,
              collectionName: form.name,
              txHash: tx.hash,
              metadataUrl: metadataUrl,
              coverUrl: coverUrl
            }
          })
        });
      } catch (questError) {
        console.warn('⚠️ Failed to record quest action:', questError);
      }
      
      // Не показываем кнопки сразу, даем пользователю увидеть успех
      setTimeout(() => {
        setShowDoneButton(true);
      }, 1500);
      
      showToast('✅ Collection created!', tx.hash);
      
      // Сохраняем данные коллекции для передачи в onSuccess
      window.newlyCreatedCollectionData = collectionData;
    } catch (err) {
      console.error('Error creating collection:', err);
      setModalText(`❌ Error: ${err.reason || err.message}`);
      setProgress(0);
      
      // Показываем кнопки при ошибке через небольшую задержку
      setTimeout(() => {
        setShowDoneButton(true);
      }, 1000);
      
      showToast(`❌ Error: ${err.reason || err.message}`);
      // Очищаем временные данные при ошибке
      delete window.newlyCreatedCollectionData;
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto text-white">
      {/* Header */}
      <div className="text-left mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent leading-none mb-4">
          Collection Identity
        </h2>
        <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
          Give your collection a unique identity. Set the foundation for your NFT project with a name, description, and visual identity that represents your vision. Once created, you'll be able to add your amazing NFTs in the next step.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-zinc-700/30 p-8 shadow-2xl">

      {/* Cover Image Upload Section */}
      <div className="mb-8">
        <label className="text-sm font-medium mb-4 block">
          <span className="text-white">Collection Cover Image</span> <span className="text-red-500">*</span>
        </label>
        
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <label 
            htmlFor="cover-upload" 
            className="w-48 h-48 bg-zinc-800/50 border-2 border-dashed border-zinc-600 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden hover:border-pink-500/50 transition-all duration-300 group"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {coverFile ? (
              <div className="relative w-full h-full">
                <img 
                  src={URL.createObjectURL(coverFile)} 
                  alt="preview" 
                  className="w-full h-full object-cover rounded-2xl"
                  onLoad={() => console.log('✅ Preview image loaded successfully')}
                  onError={(e) => {
                    console.error('❌ Preview image failed to load:', e);
                    console.error('❌ Image src:', e.target.src);
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-sm font-medium">Change Image</div>
                    <div className="text-xs text-zinc-300">Click to replace</div>
                  </div>
                </div>
                {/* File size indicator */}
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                  {(coverFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div className="text-center text-zinc-400">
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <div className="text-sm">Drop image here or click to upload</div>
                <div className="text-xs">PNG, JPG, GIF up to 10MB</div>
              </div>
            )}
            <input id="cover-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>

          <div className="flex-1">
            <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/30">
              <h4 className="text-white font-semibold mb-3">Upload Requirements</h4>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Recommended size: 300 × 300px
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  File types: JPG, PNG, SVG or GIF
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Max file size: 10MB
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  This will be your collection's main image
                </li>
              </ul>
              
              <button
                onClick={() => document.getElementById('cover-upload').click()}
                className="mt-4 w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] hover:from-[#0095E6] hover:to-[#E61CC7] text-white font-semibold transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-pink-500/25 relative overflow-hidden group"
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative z-10 flex items-center justify-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Choose Image</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="text-sm font-medium mb-3 block">
            <span className="text-white">Collection Name</span> <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter collection name"
            className="w-full p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 text-white placeholder:text-zinc-500 text-base focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-3 block">
            <span className="text-white">Categories</span>
          </label>
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown((prev) => !prev)}
              className="w-full p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 text-left text-white text-base flex justify-between items-center focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300"
            >
              {form.categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {form.categories.map((cat, index) => (
                    <span
                      key={cat}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`}
                    >
                      {cat}
                      <span 
                        onClick={(e) => { e.stopPropagation(); toggleCategory(cat); }} 
                        className="hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                'Select Categories'
              )}
              <ChevronDown size={16} className="ml-2" />
            </button>
            {showCategoryDropdown && (
              <div className="absolute bg-zinc-800/95 backdrop-blur-sm border border-zinc-700/50 rounded-2xl w-full max-h-40 overflow-y-auto z-20 mt-2 shadow-2xl">
                {CATEGORY_OPTIONS.map((cat) => (
                  <div
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-4 py-3 cursor-pointer hover:bg-zinc-700/50 transition-colors duration-200 ${form.categories.includes(cat) ? 'bg-zinc-700/50' : ''}`}
                  >
                    {cat}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <label className="text-sm font-medium mb-3 block">
          <span className="text-white">Description</span> <span className="text-red-500">*</span>
        </label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Write a short description about this collection"
          className="w-full p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 text-white h-32 placeholder:text-zinc-500 text-base focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300 resize-none"
        />
      </div>

      {/* Cost Information */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl p-6 border border-blue-500/30 mb-8">
        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#46ABEF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Collection Creation Cost
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#46ABEF]/20 p-4 rounded-xl border border-[#46ABEF]/30">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-[#46ABEF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div className="text-white font-medium text-sm">Gas Fee</div>
            </div>
            <div className="text-white font-bold text-lg">~0.01 STT</div>
            <div className="text-white text-xs">Network transaction cost</div>
          </div>
          <div className="bg-[#8223D5]/20 p-4 rounded-xl border border-[#8223D5]/30">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-[#8223D5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div className="text-white font-medium text-sm">Platform Fee</div>
            </div>
            <div className="text-white font-bold text-lg">0.05 STT</div>
            <div className="text-white text-xs">One-time creation fee</div>
          </div>
          <div className="bg-[#D0139A]/20 p-4 rounded-xl border border-[#D0139A]/30">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-[#D0139A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-white font-medium text-sm">Total Cost</div>
            </div>
            <div className="text-white font-bold text-lg">~0.06 STT</div>
            <div className="text-white text-xs">Estimated total</div>
          </div>
        </div>
      </div>

      {/* Royalty Settings Section */}
      <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/30 mb-8">
        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#8223D5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Royalty Settings
        </h4>
        <p className="text-zinc-400 text-sm mb-6">
          Set up royalty payments for your collection. This allows you to earn a percentage of sales when your NFTs are traded.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-end gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block text-white">Royalty Recipient Address</label>
            <input
              type="text"
              name="royaltyRecipient"
              value={form.royaltyRecipient}
              onChange={handleChange}
              placeholder="0x..."
              className="w-full p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 text-white placeholder:text-zinc-500 text-base focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
            />
            <p className="text-xs text-zinc-500 mt-2">Leave empty to use your wallet address</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-white">Royalty Percentage</label>
            <div className="relative w-24 md:w-28">
              <input
                type="number"
                name="royaltyPercent"
                min={0}
                max={100}
                value={form.royaltyPercent}
                onChange={handleChange}
                placeholder="0"
                className="w-full p-4 pr-10 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 text-white placeholder:text-zinc-500 text-base focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">%</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2 whitespace-nowrap">Recommended: 2.5% - 10%</p>
          </div>
        </div>
      </div>

      <button
        onClick={createCollection}
        className="w-full max-w-xs mx-auto mt-8 py-4 px-8 rounded-2xl bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-semibold text-lg transition-all duration-300 hover:from-[#0095E6] hover:to-[#E61CC7] hover:scale-105 shadow-2xl hover:shadow-pink-500/25 relative overflow-hidden group"
      >
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <span className="relative z-10">Create Collection</span>
      </button>
      </div>

      {/* Modern Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[9998] p-4">
                      <div className="bg-black backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full animate-fadeIn border border-zinc-700/50 relative overflow-hidden transform transition-all duration-300 hover:scale-[1.02]" tabIndex={-1} autoFocus>
            
            {/* Content */}
            <div className="relative z-10 p-8">
              {/* Header */}
              <div className="text-center mb-8">
                {progress === 100 ? (
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="mb-4">
                    <VideoSpinner type="processing" size="lg" />
                  </div>
                )}
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent mb-2">
                  {progress === 100 ? 'Collection Created!' : 'Creating Collection...'}
                </h3>
                <p className="text-zinc-400 text-sm">
                  {progress === 100 ? 'Your collection has been successfully created on the blockchain' : 'Please wait while we process your collection'}
                </p>
              </div>

              {/* Progress Section */}
              {progress < 100 && (
                <div className="mb-8">
                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-zinc-800/50 rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-pink-500 relative transition-all duration-700 ease-out"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Progress Text */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{progress}%</div>
                    <p className="text-sm text-zinc-400">{modalText}</p>
                  </div>
                </div>
              )}

              {/* Success Section */}
              {progress === 100 && (
                <div className="mb-8">
                  <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-green-400 font-semibold mb-2">Success!</h4>
                    <p className="text-zinc-300 text-sm">Your collection is now live on the blockchain</p>
                  </div>
                </div>
              )}

              {/* Action Buttons - Only show when process is complete */}
              {showDoneButton && progress === 100 && (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setProgress(0);
                      setShowDoneButton(false);
                      if (onSuccess) {
                        // Передаем данные созданной коллекции
                        const collectionData = window.newlyCreatedCollectionData;
                        onSuccess(collectionData);
                        // Очищаем временные данные
                        delete window.newlyCreatedCollectionData;
                      }
                    }}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-green-500/25 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {onSuccess ? 'Continue to Populate Collection' : 'Continue'}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setProgress(0);
                      setShowDoneButton(false);
                      // Очищаем временные данные
                      delete window.newlyCreatedCollectionData;
                    }}
                    className="w-full py-3 px-6 rounded-2xl bg-zinc-700/50 hover:bg-zinc-600/50 text-white font-semibold transition-all duration-200 hover:scale-105"
                  >
                    Stay Here
                  </button>
                </div>
              )}

              {/* Close button - Show during process with warning, or when complete */}
                              <button
                  type="button"
                  onClick={() => {
                    setShowCancelWarning(true);
                  }}
                  aria-label="Close"
                  className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-pink-500/40 rounded-xl"
                >
                  <X size={24} />
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Wrong Network Modal (стиль сохранён как у основного модала) */}
      {showNetworkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[9999] p-4">
          <div className="bg-black backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full animate-fadeIn border border-zinc-700/50 relative overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
            <div className="relative z-10 p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent mb-2">
                  Wrong Network
                </h3>
                <p className="text-zinc-400 text-sm">
                  Please switch to Somnia Testnet (50312) to create a collection.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={async () => {
                    try {
                      const sw = await (async () => { try { return await switchNetwork?.(SOMNIA_CHAIN_ID_DEC); } catch { return { success: false }; } })();
                      if (!sw?.success) await ensureSomniaNetwork();
                      const p = new ethers.BrowserProvider(window.ethereum);
                      const n = await p.getNetwork();
                      if (Number(n.chainId) === SOMNIA_CHAIN_ID_DEC) {
                        setShowNetworkModal(false);
                        showToast('✅ Switched to Somnia Testnet. Please retry.');
                      } else {
                        showToast('❌ Please switch to Somnia Testnet in your wallet');
                      }
                    } catch {
                      showToast('❌ Please switch to Somnia Testnet in your wallet');
                    }
                  }}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-semibold hover:from-[#0095E6] hover:to-[#E61CC7] transition-all duration-300"
                >
                  Switch to Somnia
                </button>
                <button
                  onClick={() => setShowNetworkModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-zinc-700/50 hover:bg-zinc-600/50 text-white font-semibold transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div className="fixed bottom-20 right-4 bg-zinc-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl max-w-xs animate-fadeIn cursor-pointer hover:opacity-100 opacity-90 z-50 border border-zinc-700/50 hover:border-pink-500/50 transition-all duration-300 hover:scale-105">
          <p className="text-sm mb-1">{toast.message}</p>
          {toast.txHash && (
            <a
              href={`https://shannon-explorer.somnia.network/tx/${toast.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1 text-sm hover:text-pink-400 transition-colors duration-200"
            >
              <ExternalLink size={16} />
              View Transaction
            </a>
          )}
        </div>
      )}
      
      {/* 🔥 НОВОЕ: Красивое предупреждение при отмене */}
      <CancelWarningModal
        isVisible={showCancelWarning}
        onConfirm={() => {
          setShowCancelWarning(false);
          setShowModal(false);
          setProgress(0);
          setShowDoneButton(false);
          // Очищаем временные данные
          delete window.newlyCreatedCollectionData;
        }}
        onCancel={() => setShowCancelWarning(false)}
        title="Cancel Collection Creation"
        message="Are you sure you want to cancel this collection creation? All progress will be lost and you'll need to start over. This action cannot be undone."
      />
    </div>
  );
};

export default CreateCollection;
