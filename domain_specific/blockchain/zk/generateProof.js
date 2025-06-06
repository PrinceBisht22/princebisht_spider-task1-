const path = require("path");
const { Identity } = require("@semaphore-protocol/identity");
const { Group } = require("@semaphore-protocol/group");
const { generateProof, verifyProof } = require("@semaphore-protocol/proof");

async function main() {
  // 1. Create identity (random or with secret)
  const identity = new Identity("my-secret");
  console.log("✅ Identity Commitment:", identity.commitment.toString());

  // 2. Create group with empty members array (constructor expects iterable)
  const group = new Group([]);
  group.addMember(identity.commitment);

  console.log("ℹ️ Group root:", group.root.toString());
  console.log("ℹ️ Group depth:", group.depth);

  // 3. Prepare proof parameters
  const signal = "Hello, Semaphore!";
  const externalNullifier = "12345"; // can be string or bigint

  // 4. File paths for wasm and zkey (make sure these files exist at these paths)
  const wasmFilePath = path.join(__dirname, "semaphore.wasm");
  const zkeyFilePath = path.join(__dirname, "semaphore.zkey");

  // 5. Prepare plain group object (must be plain object with primitives)
  const groupObj = {
    root: group.root,
    depth: group.depth,
    members: group.members,
  };

  try {
    // 6. Generate proof
    const { proof, publicSignals } = await generateProof(
      identity,
      groupObj,
      externalNullifier,
      signal,
      {
        wasmFilePath,
        zkeyFilePath,
      }
    );

    console.log("✅ Proof generated:");
    console.log(proof);
    console.log("✅ Public signals:");
    console.log(publicSignals);

    // 7. Verify proof
    const isValid = await verifyProof(proof, group.depth);
    console.log("✅ Proof is valid?", isValid);
  } catch (error) {
    console.error("❌ Error generating or verifying proof:", error);
  }
}

main();