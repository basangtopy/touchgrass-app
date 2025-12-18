// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PricingLibrary
 * @notice Pure calculation functions for price and amount conversions
 * @dev Internal library functions are inlined at compile time for gas efficiency
 */
library PricingLibrary {
    /// @notice Standard precision for USD values (18 decimals)
    uint256 internal constant PRICE_PRECISION = 1e18;

    /**
     * @notice Convert USDC amount (6 decimals) to 18 decimal representation
     * @param usdcAmount Amount in USDC (6 decimals)
     * @return Amount in 18 decimals
     */
    function convertUSDCTo18Decimals(
        uint256 usdcAmount
    ) internal pure returns (uint256) {
        return usdcAmount * 1e12;
    }

    /**
     * @notice Convert 18-decimal amount to a token's native decimal representation
     * @param amount18 Amount with 18 decimals
     * @param tokenDecimals Target token's decimals
     * @return Amount in token's native decimals
     */
    function convertToTokenDecimals(
        uint256 amount18,
        uint8 tokenDecimals
    ) internal pure returns (uint256) {
        if (tokenDecimals < 18) {
            return amount18 / (10 ** (18 - tokenDecimals));
        } else {
            return amount18 * (10 ** (tokenDecimals - 18));
        }
    }

    /**
     * @notice Normalize Chainlink price to 18 decimals
     * @param answer Raw price from Chainlink (variable decimals)
     * @param feedDecimals Decimals of the price feed
     * @return price Normalized price with 18 decimals
     */
    function normalizePrice(
        int256 answer,
        uint8 feedDecimals
    ) internal pure returns (uint256 price) {
        if (feedDecimals < 18) {
            price = uint256(answer) * (10 ** (18 - feedDecimals));
        } else {
            price = uint256(answer) / (10 ** (feedDecimals - 18));
        }
    }

    /**
     * @notice Calculate token amount from USD value
     * @param usdAmount6Decimals USD amount in 6 decimals (USDC format)
     * @param tokenPriceUSD18 Token price in USD with 18 decimals
     * @param tokenDecimals Target token's decimals
     * @return Token amount in token's native decimals
     */
    function calculateTokenAmount(
        uint256 usdAmount6Decimals,
        uint256 tokenPriceUSD18,
        uint8 tokenDecimals
    ) internal pure returns (uint256) {
        // Convert USD amount to 18 decimals
        uint256 usdAmount18 = usdAmount6Decimals * 1e12;

        // Calculate amount in 18 decimals: (usdValue * precision) / tokenPrice
        uint256 amountIn18Decimals = (usdAmount18 * PRICE_PRECISION) /
            tokenPriceUSD18;

        // Convert to token's native decimals
        return convertToTokenDecimals(amountIn18Decimals, tokenDecimals);
    }

    /**
     * @notice Calculate USD value from token amount
     * @param tokenAmount Amount in token's native decimals
     * @param tokenPriceUSD18 Token price in USD with 18 decimals
     * @param tokenDecimals Token's decimals
     * @return usdValue USD value with 18 decimals
     */
    function calculateUSDValue(
        uint256 tokenAmount,
        uint256 tokenPriceUSD18,
        uint8 tokenDecimals
    ) internal pure returns (uint256 usdValue) {
        // Convert token amount to 18 decimals
        uint256 amountIn18Decimals;
        if (tokenDecimals < 18) {
            amountIn18Decimals = tokenAmount * (10 ** (18 - tokenDecimals));
        } else {
            amountIn18Decimals = tokenAmount / (10 ** (tokenDecimals - 18));
        }

        // Calculate USD value: (amount * tokenPrice) / precision
        usdValue = (amountIn18Decimals * tokenPriceUSD18) / PRICE_PRECISION;
    }
}
