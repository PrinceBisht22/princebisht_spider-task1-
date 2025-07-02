require("dotenv").config({ path: "./frontend/.env" });
const { ethers } = require("hardhat");

async function main() {
  console.log("📬 Loaded portal address:", process.env.REACT_APP_PAPER_PORTAL_ADDRESS);

  const portal = await ethers.getContractAt(
    "PaperPortal",
    process.env.REACT_APP_PAPER_PORTAL_ADDRESS
  );

  const tx = await portal.uploadWithProof(
    "zkOwnershipProof",
    "Prince",
    "QmQXw6EkoP9321bSnexbzWVSJwgzXTC7zuGqMovDR9jcSt", // Replace IPFS hash
    [
      "0x28208c2de8ee6e5d3841229fb46b163fb6ac0de15482338e09a367dd36246678",
      "0x0738cad418be8c0737f8cd58b35e7bf7babef1e7d184f80d604f3e75181710b8"
    ],
    [
      [
        "0x08ff58e193835b4e91f7ff01c399f82845269dcbe9ea0eac7e0b390de6e22721",
        "0x0362282d6ae7072cf85df73965f7a49ce58b9e3c457920230615d2c5e3f2925f"
      ],
      [
        "0x147211f5e913de65f7506b6ac5b4432428c76198b31aebe66288ebc15dbd336e",
        "0x124fed5a20b5ec59575a5c07f8411f43f9dbe583487e686dfedb9e360713ee43"
      ]
    ],
    [
      "0x2348f63ddd3465c89fe3931dee1fd64a2843213ca707b7d9cfb177aca3bb6a00",
      "0x20035ef125cbd4a4edc9dfcdead13979694e7e0a304ec37e40145c2e8f5d50f1"
    ],
    ["579"]
  );

  await tx.wait();
  console.log("✅ uploadWithProof succeeded!");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});