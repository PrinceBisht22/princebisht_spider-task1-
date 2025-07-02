require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying contracts with:", deployer.address);

  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  console.log("🛡 Verifier deployed at:", verifier.target);

  const SoulboundNFT = await ethers.getContractFactory("SoulboundPaperNFT");
  const soulboundNFT = await SoulboundNFT.deploy([deployer.address]);
  await soulboundNFT.waitForDeployment();
  console.log("🎓 SoulboundPaperNFT deployed at:", soulboundNFT.target);

  const PaperPortal = await ethers.getContractFactory("PaperPortal");
  const paperPortal = await PaperPortal.deploy(verifier.target, soulboundNFT.target);
  await paperPortal.waitForDeployment();
  console.log("📘 PaperPortal deployed at:", paperPortal.target);

  await soulboundNFT.connect(deployer).transferOwnership(paperPortal.target);
  console.log("🔁 Transferred SoulboundNFT ownership to PaperPortal");

  const newOwner = await soulboundNFT.owner();
  console.log("🧾 New SoulboundNFT Owner:", newOwner);
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exitCode = 1;
});