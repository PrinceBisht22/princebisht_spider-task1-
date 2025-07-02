import React, { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { groth16 } from "snarkjs";
import "./App.css";
import paperAbi from "./contract/abi.json";
import soulboundAbi from "./contract/soulboundAbi.json";
import { PAPER_PORTAL_ADDRESS, SBT_ADDRESS } from "./contract/config.js";

function App() {
  const [account, setAccount] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [papers, setPapers] = useState([]);
  const [myNFTs, setMyNFTs] = useState([]);
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("🦊 Please install MetaMask");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
    } catch (err) {
      console.error("MetaMask connection failed:", err);
    }
  };

  const uploadToIPFS = async (file) => {
    if (!process.env.REACT_APP_PINATA_JWT) {
      alert("Missing Pinata JWT in .env");
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("pinataMetadata", JSON.stringify({ name: file.name }));
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 0 }));

    try {
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_PINATA_JWT}`,
        },
        body: formData,
      });

      const data = await res.json();
      return data.IpfsHash;
    } catch (err) {
      console.error("❌ Upload error:", err);
      return null;
    }
  };

  // ZK-based upload using snarkjs
  const uploadWithZKProof = async () => {
    if (!title || !author || !pdfFile || !account) {
      alert("⚠️ Fill all fields & connect wallet.");
      return;
    }

    if (pdfFile.type !== "application/pdf") {
      alert("❌ Only PDF files are allowed.");
      return;
    }

    setLoading(true);
    const ipfsHash = await uploadToIPFS(pdfFile);
    if (!ipfsHash) {
      alert("❌ Failed to upload PDF to IPFS.");
      setLoading(false);
      return;
    }

    try {
      const paperHash = 123;
      const userSecret = 456;
      const hashCommitment = paperHash + userSecret;

      const input = {
        paperHash: paperHash.toString(),
        userSecret: userSecret.toString(),
        hashCommitment: hashCommitment.toString()
      };

      console.log("🧪 ZK input:", input);

      const { proof, publicSignals } = await groth16.fullProve(
        input,
        "/zk/ownershipProof.wasm",
        "/zk/ownershipProof_0001.zkey"
      );

      console.log("📦 Proof:", proof);
      console.log("📡 Public signals:", publicSignals);

      // Debug logs before contract call
      console.log("💡 Submitting to contract with values:");
      console.log("🅰️ a:", proof.pi_a);
      console.log("🅱️ b:", proof.pi_b);
      console.log("🌐 c:", proof.pi_c);
      console.log("📣 public signals:", publicSignals);

      // Guard clause for proof data
      if (!proof?.pi_a || !proof?.pi_b || !proof?.pi_c || !publicSignals?.length) {
        throw new Error("🚨 Proof data incomplete. Aborting transaction.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const paperContract = new ethers.Contract(PAPER_PORTAL_ADDRESS, paperAbi, signer);
      const a = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
      const b = [
        [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
        [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]
      ];
      const c = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
      const inputSignals = [BigInt(publicSignals[0])]; // only one public signal expected

      const tx = await paperContract.uploadWithProof(
        title,
        author,
        ipfsHash,
        a,
        b,
        c,
        inputSignals
      );

      // NFT minting is now handled by the backend/contract. No need to mint here.

      await tx.wait();
      alert("✅ Paper uploaded with ZK proof!");
      setTitle("");
      setAuthor("");
      setPdfFile(null);
      await fetchPapers();
      await fetchMyNFTs();
    } catch (err) {
      console.error("❌ ZK Upload failed:", err);
      alert("❌ Something went wrong during ZK upload.");
    } finally {
      setLoading(false);
    }
  };

  const uploadPaper = async () => {
    if (!title || !author || !pdfFile || !account) {
      alert("⚠️ Fill all fields & connect wallet.");
      return;
    }

    if (pdfFile.type !== "application/pdf") {
      alert("❌ Only PDF files are allowed.");
      return;
    }

    setLoading(true);
    const ipfsHash = await uploadToIPFS(pdfFile);
    if (!ipfsHash) {
      alert("❌ Failed to upload PDF to IPFS.");
      setLoading(false);
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const paperContract = new ethers.Contract(PAPER_PORTAL_ADDRESS, paperAbi, signer);
      const tokenURI = `ipfs://${ipfsHash}`;
      const tx = await paperContract.uploadPaper(title, author, ipfsHash);

      await tx.wait();
      const sbtContract = new ethers.Contract(SBT_ADDRESS, soulboundAbi, signer);
      await sbtContract.mintPaperNFT(account, title, ipfsHash, `ipfs://${ipfsHash}`);

      alert("✅ Paper uploaded & NFT minted!");
      setTitle("");
      setAuthor("");
      setPdfFile(null);
      await fetchPapers();
      await fetchMyNFTs();
    } catch (err) {
      console.error("❌ Error uploading or minting:", err?.reason || err?.message || err);
      alert("❌ Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPapers = useCallback(async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(PAPER_PORTAL_ADDRESS, paperAbi, provider);
      const papers = await contract.getAllPapers();
      setPapers(papers);
    } catch (err) {
      console.error("❌ Error fetching papers:", err);
    }
  }, []);

  const fetchMyNFTs = useCallback(async () => {
    console.log("🔄 Fetching user NFTs...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const contract = new ethers.Contract(SBT_ADDRESS, soulboundAbi, provider);
      const tokenIds = await contract.getAllTokenIds();

      console.log("🔍 Connected wallet address:", address);
      console.log("📦 All Token IDs from contract:", tokenIds);

      if (!tokenIds || tokenIds.length === 0) {
        console.warn("⚠️ No token IDs found in contract.");
        setMyNFTs([]);
        return;
      }

      const myTokens = [];
      for (let id of tokenIds) {
        try {
          const owner = await contract.ownerOf(id);
          console.log(`🔍 Token ID ${id} owned by ${owner}`);
          if (owner.toLowerCase() === address.toLowerCase()) {
            const metadata = await contract.getPaperMetadata(id);
            console.log(`🧾 Full metadata for token ${id}:`, metadata);
            console.log(`✅ Metadata for token ${id}:`, metadata);
            if (metadata && metadata.ipfsHash) {
              // Decode title if needed
              let decodedTitle = typeof metadata.title === "string"
                ? metadata.title
                : ethers.decodeBytes32String(metadata.title);
              const tokenURI = await contract.tokenURI(id);
              const ipfsHash = tokenURI?.split("ipfs://")[1];
              const ipfsURL = ipfsHash ? `https://ipfs.io/ipfs/${ipfsHash}` : "";
              myTokens.push({
                id: id.toString(),
                title: decodedTitle,
                ipfsHash: ipfsURL,
                author: metadata.author,
                timestamp: metadata.timestamp
              });
            }
          } else {
            console.log(`⛔ Token ${id} not owned by current user`);
          }
        } catch (err) {
          console.error("⚠️ Error fetching token metadata or owner:", err);
        }
      }

      if (myTokens.length === 0) {
        console.warn("ℹ️ No NFTs belong to this wallet.");
      }

      setMyNFTs(myTokens);
    } catch (err) {
      console.error("❌ Error fetching NFTs:", err?.reason || err?.message || err);
    }
  }, []);

  useEffect(() => {
    fetchPapers();
    if (account) fetchMyNFTs();
  }, [fetchPapers, fetchMyNFTs, account]);

  return (
    <div className="App">
      <h1>📄 Research Paper Uploader</h1>
      <button onClick={connectWallet}>
        {account ? `✅ ${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
      </button>
      {account && (
        <div className="badge-box">
          <strong>Reputation: </strong>
          {papers.length >= 10
            ? "🏅 Expert"
            : papers.length >= 5
            ? "🥈 Intermediate"
            : papers.length >= 1
            ? "🥉 Beginner"
            : "❌ No uploads yet"}
        </div>
      )}

      <div className="form">
        <input
          type="text"
          placeholder="Paper Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="Author Name"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files[0])}
        />
        <button onClick={uploadPaper} disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
        <button onClick={uploadWithZKProof} disabled={loading}>
          {loading ? "Uploading ZK..." : "Upload with ZK Proof"}
        </button>
      </div>

      <h2>📚 Uploaded Papers</h2>
      {papers.length === 0 ? (
        <p>No papers uploaded yet.</p>
      ) : (
        papers.map((paper, idx) => (
          <div key={idx} className="paper">
            <h3>{paper.title}</h3>
            <p>👨‍💻 {paper.author}</p>
        <p>
          <a
            href={`https://ipfs.io/ipfs/${paper.ipfsHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            📎 View PDF
          </a>
        </p>
            <small>Uploader: {paper.uploader}</small>
            <br />
            <small>{new Date(Number(paper.timestamp) * 1000).toLocaleString()}</small>
          </div>
        ))
      )}

      <h2>🎓 My Soulbound NFTs</h2>
      {myNFTs.length === 0 ? (
        <p>No NFTs found.</p>
      ) : (
        myNFTs.map((nft, idx) => (
          nft.ipfsHash ? (
            <div key={idx} className="nft-card">
              <h3>{nft.title && nft.title.trim() !== "" ? nft.title : "📄 Untitled Paper"}</h3>
              <p>
                📎 <a href={nft.ipfsHash} target="_blank" rel="noopener noreferrer">View PDF</a>
              </p>
              <p>🕒 {nft.timestamp ? new Date(Number(nft.timestamp) * 1000).toLocaleString() : "Unknown date"}</p>
            </div>
          ) : null
        ))
      )}
    </div>
  );
}

export default App;