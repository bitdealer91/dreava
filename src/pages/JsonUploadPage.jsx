// src/pages/JsonUploadPage.jsx
import { useState } from 'react';
import { ethers } from 'ethers';
import somniaNftAbi from '../abi/SomniaNFT.json';
import dragIcon from '../assets/dragNdrop.svg';
import uploadJsonBtn from '../assets/UploadJson.svg';

const JsonUploadPage = () => {
  const [jsonFile, setJsonFile] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [status, setStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleJsonUpload = async (file) => {
    if (!file) return;
    setJsonFile(file);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Invalid JSON: expected an array of NFT metadata');
      setNfts(data);
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to parse JSON');
    }
  };

  const mintAllFromJson = async () => {
    try {
      if (!window.ethereum) throw new Error('Wallet not detected');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      for (const nftData of nfts) {
        setStatus(`Uploading metadata: ${nftData.name || 'Untitled'}`);

        const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
          },
          body: JSON.stringify(nftData),
        });

        const { IpfsHash } = await res.json();
        const tokenURI = `ipfs://${IpfsHash}`;

        const contract = new ethers.Contract(nftData.contractAddress, somniaNftAbi, signer);
        const tx = await contract.mintPublic(await signer.getAddress(), tokenURI);
        await tx.wait();
      }

      setStatus('✅ All NFTs minted');
    } catch (err) {
      console.error(err);
      setStatus(`❌ Error: ${err.message}`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      handleJsonUpload(file);
    }
  };

  return (
          <div className="w-[780px] mx-auto text-white font-sans">
      <div className="border border-zinc-700 bg-zinc-900 rounded-2xl p-8">
        <h2 className="text-[28px] font-bold bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent leading-none mb-[6px]">
          Pro Upload (JSON)
        </h2>
        <p className="text-zinc-400 mb-[16px] text-sm leading-snug">
          Upload your structured NFT metadata using a JSON file for advanced batch minting.
        </p>

        {!jsonFile && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border border-dashed rounded-xl p-8 text-center mb-8 transition-colors duration-150 ${
              isDragging ? 'border-pink-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-900'
            }`}
          >
            <img src={dragIcon} alt="Upload Icon" className="mx-auto mb-6 w-10 h-10" />
            <p className="text-sm font-medium mb-1 text-white">Drag & drop your JSON file here</p>
            <p className="text-xs text-zinc-500 mb-4">or use the button below to upload</p>
            <ul className="text-xs text-left mx-auto max-w-md text-zinc-500 space-y-1 mb-6">
              <li>• Format: <code>.json</code></li>
              <li>• Must be an array of metadata objects</li>
              <li>• Recommended: IPFS image links</li>
              <li>• Max file size: 5MB</li>
              <li>• Each object must include a <code>contractAddress</code></li>
            </ul>
            <label className="inline-block cursor-pointer">
              <img src={uploadJsonBtn} alt="Upload JSON" className="w-[160px]" />
              <input type="file" accept="application/json" onChange={(e) => handleJsonUpload(e.target.files[0])} className="hidden" />
            </label>
          </div>
        )}

        {nfts.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">Detected {nfts.length} NFTs from JSON</p>
            <button
              onClick={mintAllFromJson}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-semibold text-sm shadow-md active:scale-95 transition"
            >
              Mint All from JSON
            </button>
          </div>
        )}

        {status && <p className="text-sm text-center text-zinc-400 mt-6">{status}</p>}
      </div>
    </div>
  );
};

export default JsonUploadPage;
