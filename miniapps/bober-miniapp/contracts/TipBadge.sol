// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TipBadge is ERC721, Ownable {
    uint256 private _nextId = 1;

    constructor() ERC721("BoberBadge", "BBAD") {}

    // mint a badge to `to` with auto-increment id
    function mintBadge(address to) external onlyOwner returns (uint256) {
        uint256 id = _nextId++;
        _safeMint(to, id);
        return id;
    }

    // allow owner to withdraw collected native tokens (tips)
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // receive function to accept native tips
    receive() external payable {}
}
