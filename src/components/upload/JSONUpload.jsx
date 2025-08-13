// src/components/upload/JSONUpload.jsx
import { useState } from 'react';
import { ethers } from 'ethers';
import somniaNftAbi from '../../abi/SomniaNFT.json';

const JSONUpload = () => {
  const [jsonFile, setJsonFile] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [status, setStatus] = useState('');

  const handleJsonUpload = async (e) => {
    const file = e.target.files[0];
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

  return (
    <div className="space-y-6">
      <input
        type="file"
        accept="application/json"
        onChange={handleJsonUpload}
        className="block text-sm text-zinc-400"
      />

      {nfts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-300">Detected {nfts.length} NFTs from JSON</p>
          <button
            onClick={mintAllFromJson}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] text-white font-semibold text-sm shadow-md active:scale-95 transition"
          >
            Mint All from JSON
          </button>
        </div>
      )}

      {status && <p className="text-sm text-center text-zinc-400 mt-2">{status}</p>}
    </div>
  );
};

export default JSONUpload;
