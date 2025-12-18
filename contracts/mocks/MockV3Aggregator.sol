// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockV3Aggregator
 * @notice Mock Chainlink price feed for testing
 */
contract MockV3Aggregator {
    uint8 public decimals;
    int256 public answer;
    uint256 public updatedAt;
    uint80 public roundId;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        answer = _initialAnswer;
        updatedAt = block.timestamp;
        roundId = 1;
    }

    /**
     * @notice Update the price answer
     * @param _answer New price answer
     */
    function updateAnswer(int256 _answer) external {
        answer = _answer;
        updatedAt = block.timestamp;
        roundId++;
    }

    /**
     * @notice Set the price as stale (7 days old)
     */
    function setStalePrice() external {
        updatedAt = block.timestamp - 7 days;
    }

    /**
     * @notice Set a specific timestamp
     * @param _timestamp The timestamp to set
     */
    function setUpdatedAt(uint256 _timestamp) external {
        updatedAt = _timestamp;
    }

    /**
     * @notice Set invalid price (zero or negative)
     * @param _invalidPrice The invalid price to set
     */
    function setInvalidPrice(int256 _invalidPrice) external {
        answer = _invalidPrice;
        updatedAt = block.timestamp;
    }

    /**
     * @notice Chainlink latestRoundData interface
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId_,
            int256 answer_,
            uint256 startedAt_,
            uint256 updatedAt_,
            uint80 answeredInRound_
        )
    {
        return (roundId, answer, 0, updatedAt, roundId);
    }
}
