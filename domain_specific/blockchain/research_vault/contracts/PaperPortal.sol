// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./Verifier.sol";
import "./SoulboundPaperNFT.sol";

contract PaperPortal {
    Groth16Verifier public verifier;
    SoulboundPaperNFT public soulboundNFT;

    constructor(address _verifier, address _soulboundNFT) {
        verifier = Groth16Verifier(_verifier);
        soulboundNFT = SoulboundPaperNFT(_soulboundNFT);
    }
    struct Paper {
        string title;
        string author;
        string ipfsHash;
        address uploader;
        uint256 timestamp;
    }

    Paper[] public papers;

    event PaperUploaded(
        string title,
        string author,
        string ipfsHash,
        address uploader,
        uint256 timestamp
    );

    function _storeAndMint(string memory _title, string memory _author, string memory _ipfsHash) internal {
        papers.push(Paper(_title, _author, _ipfsHash, msg.sender, block.timestamp));
        emit PaperUploaded(_title, _author, _ipfsHash, msg.sender, block.timestamp);
        string memory tokenURI = string(abi.encodePacked("ipfs://", _ipfsHash));
        soulboundNFT.mintPaperNFT(msg.sender, _title, _ipfsHash, tokenURI);
    }

    function uploadPaper(string memory _title, string memory _author, string memory _ipfsHash) public {
        _storeAndMint(_title, _author, _ipfsHash);
    }

    function getAllPapers() public view returns (Paper[] memory) {
        return papers;
    }

    function uploadWithProof(
        string memory _title,
        string memory _author,
        string memory _ipfsHash,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[1] memory input
    ) public {
        require(verifier.verifyProof(a, b, c, input), "Invalid ZK proof");
        _storeAndMint(_title, _author, _ipfsHash);
    }
}