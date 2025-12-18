// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // Mint 1,000,000 tokens to deployer
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // Free money for testing!
    function faucet() external {
        _mint(msg.sender, 1000 * 10 ** decimals());
    }
    
    // Override to return 6 decimals like real USDC
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}