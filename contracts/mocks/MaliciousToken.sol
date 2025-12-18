// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MaliciousToken
 * @notice ERC20 token that attempts reentrancy attacks during transfers
 * @dev Used for testing reentrancy protection
 */
contract MaliciousToken is ERC20 {
    address public target;
    bool public attackOnTransfer;
    bool public attackOnTransferFrom;
    uint256 public attackCount;

    constructor() ERC20("Malicious Token", "MAL") {
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /**
     * @notice Set the target contract to attack
     * @param _target Address of the target contract
     */
    function setTarget(address _target) external {
        target = _target;
    }

    /**
     * @notice Enable attack mode on transfer
     */
    function enableAttackOnTransfer() external {
        attackOnTransfer = true;
    }

    /**
     * @notice Enable attack mode on transferFrom
     */
    function enableAttackOnTransferFrom() external {
        attackOnTransferFrom = true;
    }

    /**
     * @notice Disable all attacks
     */
    function disableAttacks() external {
        attackOnTransfer = false;
        attackOnTransferFrom = false;
    }

    /**
     * @notice Mint tokens for testing
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Override transfer to attempt reentrancy
     */
    function transfer(
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (attackOnTransfer && to == target && attackCount == 0) {
            attackCount++;
            // Attempt reentrancy by calling claimPendingWithdrawal
            try ITarget(target).claimPendingWithdrawal("MAL") {} catch {}
        }
        return super.transfer(to, amount);
    }

    /**
     * @notice Override transferFrom to attempt reentrancy
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (attackOnTransferFrom && to == target && attackCount == 0) {
            attackCount++;
            // Attempt reentrancy
            try ITarget(target).claimPendingWithdrawal("MAL") {} catch {}
        }
        return super.transferFrom(from, to, amount);
    }

    /**
     * @notice Reset attack count for multiple test runs
     */
    function resetAttackCount() external {
        attackCount = 0;
    }
}

interface ITarget {
    function claimPendingWithdrawal(string calldata _symbol) external;
}
