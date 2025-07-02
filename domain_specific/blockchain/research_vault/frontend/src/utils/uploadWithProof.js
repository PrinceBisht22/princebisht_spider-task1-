import { ethers } from "ethers";
import PaperPortalABI from "../abis/PaperPortal.json";
import { PAPER_PORTAL_ADDRESS } from "../config";

export async function uploadWithProof({
  title,
  author,
  ipfsHash,
  proof,
  publicSignals,
}) {
  if (!window.ethereum) throw new Error("🦊 Please install Metamask");

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const contract = new ethers.Contract(
    PAPER_PORTAL_ADDRESS,
    PaperPortalABI.abi,
    signer
  );

  // snarkjs proof parsing
  const a = proof.pi_a.slice(0, 2);
  const b = [proof.pi_b[0].reverse(), proof.pi_b[1].reverse()];
  const c = proof.pi_c.slice(0, 2);
  const input = publicSignals; // should be an array of strings like ["579"]

  const tx = await contract.uploadWithProof(
    title,
    author,
    ipfsHash,
    a,
    b,
    c,
    input
  );

  await tx.wait();
  console.log("✅ ZK Proof uploaded with paper!");
}