import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import contractABI from './abi.json';

const CONTRACT_ADDRESS = 'e.......';
const PINATA_API_KEY = 'e.......';
const PINATA_SECRET_API_KEY = 'e........';

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [status, setStatus] = useState('');
  const [account, setAccount] = useState(null);
  const [tokenId, setTokenId] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [allNFTs, setAllNFTs] = useState([]);
  const [myUploads, setMyUploads] = useState([]);
  const [badge, setBadge] = useState('');

  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } else {
      alert('Please install MetaMask');
    }
  };

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (account) {
      fetchAllNFTs();
    }
  }, [account]);

  const handleUpload = async () => {
    if (!pdfFile || !title || !authorName || !account) {
      setStatus('❗ Please fill in all fields and connect your wallet');
      return;
    }

    setStatus('⏳ Uploading to IPFS...');

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('pinataMetadata', JSON.stringify({ name: title }));

      const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        maxContentLength: 'Infinity',
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      });

      const ipfsHash = res.data.IpfsHash;
      const fileURI = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      setStatus('✅ File uploaded to IPFS. Minting NFT...');

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      const tx = await contract.mintPaperNFT(title, ipfsHash, fileURI);
      const receipt = await tx.wait();
      const mintedTokenId = receipt.events[0].args.tokenId.toNumber();

      setTokenId(mintedTokenId);
      setStatus(`✅ NFT minted! Token ID: ${mintedTokenId}`);
      localStorage.setItem(`author_${mintedTokenId}`, authorName);

      fetchAllNFTs();
    } catch (err) {
      console.error(err);
      setStatus('❌ Upload or minting failed');
    }
  };

  const fetchMetadata = async () => {
    if (!tokenId) return;

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
      const paperMeta = await contract.getPaperMetadata(tokenId);
      setMetadata(paperMeta);
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to fetch metadata');
    }
  };

  const getBadge = (uploadCount) => {
    if (uploadCount >= 6) return '🏆 Pro';
    if (uploadCount >= 3) return '🏅 Intermediate';
    if (uploadCount >= 1) return '⭐ Beginner';
    return '';
  };

  const fetchAllNFTs = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      const tokenIds = await contract.getAllTokenIds();
      const all = [];
      const mine = [];

      for (let i = 0; i < tokenIds.length; i++) {
        const id = tokenIds[i].toNumber();
        const meta = await contract.getPaperMetadata(id);
        const owner = await contract.ownerOf(id);
        const author = localStorage.getItem(`author_${id}`) || meta.author;

        const nft = {
          tokenId: id,
          ...meta,
          author,
          owner,
        };

        all.push(nft);
        if (account && owner.toLowerCase() === account.toLowerCase()) {
          mine.push(nft);
        }
      }

      setAllNFTs(all);
      setMyUploads(mine);
      setBadge(getBadge(mine.length));
    } catch (error) {
      console.error('Failed to fetch NFTs:', error);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📄 Mint Research Paper NFT</h2>
      <p><strong>Wallet:</strong> {account || 'Not connected'}</p>
      {badge && <p><strong>Badge:</strong> {badge}</p>}

      <input
        type="text"
        placeholder="Author Name"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
      />
      <br /><br />

      <input
        type="text"
        placeholder="Paper Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <br /><br />

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setPdfFile(e.target.files[0])}
      />
      <br /><br />

      <button onClick={handleUpload}>🚀 Upload & Mint NFT</button>
      <p>{status}</p>

      {tokenId !== null && metadata && (
        <div style={{ marginTop: 30 }}>
          <h3>🎉 NFT Minted</h3>
          <p><strong>Token ID:</strong> {tokenId}</p>
          <button onClick={fetchMetadata}>📖 Fetch Metadata</button>
          <div style={{ marginTop: 10 }}>
            <p><strong>Title:</strong> {metadata.title}</p>
            <p><strong>Author:</strong> {localStorage.getItem(`author_${tokenId}`) || metadata.author}</p>
            <p><strong>IPFS:</strong> <a href={`https://gateway.pinata.cloud/ipfs/${metadata.ipfsHash}`} target="_blank" rel="noreferrer">View PDF</a></p>
            <p><strong>Timestamp:</strong> {new Date(metadata.timestamp * 1000).toLocaleString()}</p>
          </div>
        </div>
      )}

      <hr style={{ margin: '40px 0' }} />
      <h3>🌐 All Minted Research NFTs</h3>
      {allNFTs.length === 0 ? (
        <p>No NFTs found.</p>
      ) : (
        allNFTs.map((nft, index) => (
          <div key={index} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
            <p><strong>Token ID:</strong> {nft.tokenId}</p>
            <p><strong>Title:</strong> {nft.title}</p>
            <p><strong>Author:</strong> {nft.author}</p>
            <p><strong>Uploader:</strong> {nft.owner}</p>
            <p><strong>IPFS:</strong> <a href={`https://gateway.pinata.cloud/ipfs/${nft.ipfsHash}`} target="_blank" rel="noreferrer">View PDF</a></p>
            <p><strong>Timestamp:</strong> {new Date(nft.timestamp * 1000).toLocaleString()}</p>
          </div>
        ))
      )}

      <hr style={{ margin: '40px 0' }} />
      <h3>🧾 My Uploads</h3>
      {myUploads.length === 0 ? (
        <p>You haven't uploaded any NFTs yet.</p>
      ) : (
        myUploads.map((nft, index) => (
          <div key={index} style={{ border: '1px solid #4caf50', padding: 10, marginBottom: 10 }}>
            <p><strong>Token ID:</strong> {nft.tokenId}</p>
            <p><strong>Title:</strong> {nft.title}</p>
            <p><strong>Author:</strong> {nft.author}</p>
            <p><strong>IPFS:</strong> <a href={`https://gateway.pinata.cloud/ipfs/${nft.ipfsHash}`} target="_blank" rel="noreferrer">View PDF</a></p>
            <p><strong>Timestamp:</strong> {new Date(nft.timestamp * 1000).toLocaleString()}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default App;
