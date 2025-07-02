import axios from "axios";

const PINATA_JWT = process.env.REACT_APP_PINATA_JWT;

export const uploadFileToIPFS = async (file) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await axios.post(url, formData, {
      maxContentLength: "Infinity",
      headers: {
        "Content-Type": `multipart/form-data`,
        Authorization: PINATA_JWT,
      },
    });

    return res.data.IpfsHash;
  } catch (error) {
    console.error("❌ IPFS upload error:", error);
    throw new Error("Failed to upload file to IPFS");
  }
};