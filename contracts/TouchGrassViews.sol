// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title ITouchGrass
 * @notice Interface for reading from main TouchGrass contract
 */
interface ITouchGrass {
    // Structs
    struct TokenConfig {
        bool isSupported;
        address tokenAddress;
        address priceFeed;
        uint8 decimals;
        uint256 priceStalenessTolerance;
        bool useFallbackPrice;
        uint256 fallbackPrice;
    }

    // State getters
    function tokenConfigs(
        bytes32
    )
        external
        view
        returns (
            bool isSupported,
            address tokenAddress,
            address priceFeed,
            uint8 decimals,
            uint256 priceStalenessTolerance,
            bool useFallbackPrice,
            uint256 fallbackPrice
        );

    function supportedTokenIds(uint256) external view returns (bytes32);

    function tokenSymbols(bytes32) external view returns (string memory);

    function totalLockedByToken(bytes32) external view returns (uint256);

    function totalPendingWithdrawals(bytes32) external view returns (uint256);

    function getTokenPrice(string calldata) external view returns (uint256);

    function charityWallet() external view returns (address);

    function treasuryWallet() external view returns (address);

    function challenges(
        uint256
    )
        external
        view
        returns (
            address staker,
            uint8 penaltyPercent,
            uint8 penaltyType,
            bool isSuccess,
            bool isWithdrawn,
            uint8 lockMultiplierSnapshot,
            uint32 gracePeriodSnapshot,
            bytes32 tokenId,
            uint256 stakeAmount,
            uint256 duration,
            uint256 startTime
        );
}

/**
 * @title TouchGrassViews
 * @notice Separate contract for large view functions
 * @dev Reduces main contract bytecode by extracting rarely-used view functions
 */
contract TouchGrassViews {
    // Reference to main contract
    ITouchGrass public immutable touchGrass;

    uint256 private constant PRICE_PRECISION = 1e18;

    // Structs for return data
    struct TokenRecoveryInfo {
        string symbol;
        address tokenAddr;
        uint256 balance;
        uint256 locked;
        uint256 pending;
        uint256 recoverable;
    }

    struct ProtectionSummary {
        uint256 totalContractValueUSD;
        uint256 totalLockedUSD;
        uint256 totalPendingUSD;
        uint256 totalProtectedUSD;
        uint256 totalRecoverableUSD;
    }

    error InvalidCount();
    error CountTooLarge();
    error TokenNotSupported();

    constructor(address _touchGrass) {
        touchGrass = ITouchGrass(_touchGrass);
    }

    /**
     * @notice Get recovery status for all supported tokens
     */
    function getAllRecoveryStatus(
        uint256 _startIndex,
        uint256 _count
    )
        external
        view
        returns (
            string[] memory symbols,
            address[] memory addresses,
            uint256[] memory contractBalances,
            uint256[] memory lockedAmounts,
            uint256[] memory pendingAmounts,
            uint256[] memory recoverableAmounts,
            uint256 totalTokens
        )
    {
        if (_count == 0) revert InvalidCount();
        if (_count > 100) revert CountTooLarge();

        // Count tokens manually
        uint256 length = 0;
        try touchGrass.supportedTokenIds(0) returns (bytes32) {
            while (true) {
                try touchGrass.supportedTokenIds(length) returns (bytes32) {
                    length++;
                } catch {
                    break;
                }
            }
        } catch {
            // No tokens
        }

        // Add 1 for ETH
        totalTokens = length + 1;

        if (_startIndex >= totalTokens) {
            return (
                new string[](0),
                new address[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                totalTokens
            );
        }

        uint256 endIndex = _startIndex + _count;
        if (endIndex > totalTokens) {
            endIndex = totalTokens;
        }

        uint256 resultLength = endIndex - _startIndex;

        symbols = new string[](resultLength);
        addresses = new address[](resultLength);
        contractBalances = new uint256[](resultLength);
        lockedAmounts = new uint256[](resultLength);
        pendingAmounts = new uint256[](resultLength);
        recoverableAmounts = new uint256[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            uint256 globalIndex = _startIndex + i;

            if (globalIndex == 0) {
                // ETH
                bytes32 ethId = keccak256(abi.encode("ETH"));
                symbols[i] = "ETH";
                addresses[i] = address(0);
                contractBalances[i] = address(touchGrass).balance;
                lockedAmounts[i] = touchGrass.totalLockedByToken(ethId);
                pendingAmounts[i] = touchGrass.totalPendingWithdrawals(ethId);
                uint256 protected = lockedAmounts[i] + pendingAmounts[i];
                recoverableAmounts[i] = contractBalances[i] > protected
                    ? contractBalances[i] - protected
                    : 0;
            } else {
                bytes32 tokenId = touchGrass.supportedTokenIds(globalIndex - 1);
                (, address tokenAddr, , , , , ) = touchGrass.tokenConfigs(
                    tokenId
                );

                symbols[i] = touchGrass.tokenSymbols(tokenId);
                addresses[i] = tokenAddr;

                if (tokenAddr != address(0)) {
                    contractBalances[i] = IERC20(tokenAddr).balanceOf(
                        address(touchGrass)
                    );
                }

                lockedAmounts[i] = touchGrass.totalLockedByToken(tokenId);
                pendingAmounts[i] = touchGrass.totalPendingWithdrawals(tokenId);
                uint256 protected = lockedAmounts[i] + pendingAmounts[i];
                recoverableAmounts[i] = contractBalances[i] > protected
                    ? contractBalances[i] - protected
                    : 0;
            }
        }
    }

    /**
     * @notice Check if any funds are recoverable
     */
    function hasRecoverableFunds()
        external
        view
        returns (bool canRecover, uint256 totalRecoverableUSD)
    {
        // Check ETH
        bytes32 ethTokenId = keccak256(abi.encode("ETH"));
        uint256 ethBalance = address(touchGrass).balance;
        uint256 ethLocked = touchGrass.totalLockedByToken(ethTokenId);
        uint256 ethPending = touchGrass.totalPendingWithdrawals(ethTokenId);
        uint256 ethProtected = ethLocked + ethPending;

        if (ethBalance > ethProtected) {
            canRecover = true;
            try touchGrass.getTokenPrice("ETH") returns (uint256 ethPrice) {
                totalRecoverableUSD =
                    ((ethBalance - ethProtected) * ethPrice) /
                    PRICE_PRECISION;
            } catch {}
        }
    }

    /**
     * @notice Get global protection summary across all tokens
     */
    function getGlobalProtectionSummary()
        external
        view
        returns (ProtectionSummary memory summary)
    {
        // ETH calculation
        bytes32 ethTokenId = keccak256(abi.encode("ETH"));
        uint256 ethBalance = address(touchGrass).balance;
        uint256 ethLocked = touchGrass.totalLockedByToken(ethTokenId);
        uint256 ethPending = touchGrass.totalPendingWithdrawals(ethTokenId);

        try touchGrass.getTokenPrice("ETH") returns (uint256 ethPrice) {
            summary.totalContractValueUSD =
                (ethBalance * ethPrice) /
                PRICE_PRECISION;
            summary.totalLockedUSD = (ethLocked * ethPrice) / PRICE_PRECISION;
            summary.totalPendingUSD = (ethPending * ethPrice) / PRICE_PRECISION;
        } catch {}

        summary.totalProtectedUSD =
            summary.totalLockedUSD +
            summary.totalPendingUSD;

        if (summary.totalContractValueUSD > summary.totalProtectedUSD) {
            summary.totalRecoverableUSD =
                summary.totalContractValueUSD -
                summary.totalProtectedUSD;
        }
    }

    /**
     * @notice Get detailed protection breakdown for a specific token
     */
    function getTokenProtectionBreakdown(
        string calldata _symbol
    )
        external
        view
        returns (
            uint256 contractBalance,
            uint256 lockedInChallenges,
            uint256 pendingAmount,
            uint256 protectedTotal,
            uint256 recoverable
        )
    {
        bytes32 tokenId = keccak256(abi.encode(_symbol));
        (bool isSupported, address tokenAddress, , , , , ) = touchGrass
            .tokenConfigs(tokenId);

        if (!isSupported) revert TokenNotSupported();

        if (tokenAddress == address(0)) {
            contractBalance = address(touchGrass).balance;
        } else {
            contractBalance = IERC20(tokenAddress).balanceOf(
                address(touchGrass)
            );
        }

        lockedInChallenges = touchGrass.totalLockedByToken(tokenId);
        pendingAmount = touchGrass.totalPendingWithdrawals(tokenId);
        protectedTotal = lockedInChallenges + pendingAmount;

        if (contractBalance > protectedTotal) {
            recoverable = contractBalance - protectedTotal;
        }
    }
}
