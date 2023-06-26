// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

contract MiPrimerNft is ERC721, Pausable, AccessControl, ERC721Burnable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://QmWU4yb225aTpyWkBQKAffjLaPhFKyWYiiPKbUvJPx6eou/";
    }

    function pause() public {
        _pause();
    }

    function unpause() public {
        _unpause();
    }

    function safeMint(address to, uint256 tokenId) public onlyRole(MINTER_ROLE) {
        // Se hacen dos validaciones
        // 1 - Dicho id no haya sido acuñado antes
       // require(!_exists(tokenId), "ERC721: token already minted");

        // 2 - Id se encuentre en el rango inclusivo de 1 a 30
        //      * Mensaje de error: "Public Sale: id must be between 1 and 30"
        require(tokenId <= 30 && tokenId > 0, "NFT: Token id out of range");

         _safeMint(to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(bytes4 interfaceId) 
    public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
