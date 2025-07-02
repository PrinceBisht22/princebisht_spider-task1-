// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SoulboundPaperNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    struct PaperMetadata {
        string title;
        string ipfsHash;
        address author;
        uint256 timestamp;
    }

    mapping(uint256 => PaperMetadata) private _paperMetadata;
    mapping(uint256 => string) private _tokenURIs;
    uint256[] private allTokenIds;

    constructor() ERC721("SoulboundNFT", "SBT") Ownable() {}

    function mintPaperNFT(
        address to,
        string memory title,
        string memory ipfsHash,
        string memory uri
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;

        _paperMetadata[tokenId] = PaperMetadata({
            title: title,
            ipfsHash: ipfsHash,
            author: to,
            timestamp: block.timestamp
        });

        allTokenIds.push(tokenId);
        return tokenId;
    }

    function mint(address to, string memory title, string memory ipfsHash, string memory uri) public onlyOwner returns (uint256) {
        return mintPaperNFT(to, title, ipfsHash, uri);
    }

    function getPaperMetadata(uint256 tokenId) public view returns (PaperMetadata memory) {
        require(_exists(tokenId), "Token does not exist");
        return _paperMetadata[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    function getAllTokenIds() public view returns (uint256[] memory) {
        return allTokenIds;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        require(from == address(0) || to == address(0), "Soulbound: Transfer not allowed");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function burn(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Only owner can burn");
        _burn(tokenId);
        delete _tokenURIs[tokenId];
        delete _paperMetadata[tokenId];
    }
}