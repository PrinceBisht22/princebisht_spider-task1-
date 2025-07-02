require("dotenv").config({ path: "./frontend/.env" });
const { ethers } = require("hardhat");

async function main() {
  const portal = await ethers.getContractAt(
    "PaperPortal",
    process.env.REACT_APP_PAPER_PORTAL_ADDRESS
  );

  const papers = await portal.getAllPapers();

  if (!papers.length) {
    console.log("❌ No papers found on-chain.");
    return;
  }

  console.log("🧾 Uploaded Papers:");
  papers.forEach((paper, i) => {
    console.log(`\n📄 Paper #${i + 1}`);
    console.log(`• Title     : ${paper.title}`);
    console.log(`• Author    : ${paper.author}`);
    console.log(`• IPFS Link : https://ipfs.io/ipfs/${paper.ipfsHash}`);
    console.log(`• Uploader  : ${paper.uploader}`);
    console.log(`• Timestamp : ${new Date(Number(paper.timestamp) * 1000).toLocaleString()}`);
  });
}

main().catch((err) => {
  console.error("❌ Error fetching papers:", err);
});