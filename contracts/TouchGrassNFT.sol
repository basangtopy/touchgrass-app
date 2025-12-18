// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ITouchGrass {
    struct Challenge {
        address staker; // Slot 0: User who created the challenge
        uint8 penaltyPercent; // Slot 0: Percentage (0-100) to penalize on failure
        uint8 penaltyType; // Slot 0: Type of penalty execution
        bool isSuccess; // Slot 0: True if verification succeeded
        bool isWithdrawn; // Slot 0: True if funds have been claimed/swept
        uint8 lockMultiplierSnapshot; // Slot 0: Lock multiplier setting at creation time
        uint32 gracePeriodSnapshot; // Slot 0: Grace period setting at creation time
        bytes32 tokenId; // Slot 1: Hash of the token symbol
        uint256 stakeAmount; // Slot 2: Amount staked (in token decimals)
        uint256 duration; // Slot 3: Duration of the challenge in seconds
        uint256 startTime; // Slot 4: Timestamp when challenge was created
    }

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

contract TouchGrassNFT is ERC721URIStorage, Ownable {
    ITouchGrass public touchGrassContract;
    uint256 public nextTokenId;
    mapping(uint256 => bool) public hasMinted; // ChallengeID -> Minted Status

    constructor(
        address _touchGrassAddress
    ) ERC721("TouchGrass Victory Badge", "TGVB") Ownable(msg.sender) {
        touchGrassContract = ITouchGrass(_touchGrassAddress);
    }

    function mintBadge(uint256 _challengeId) external {
        // 1. Verify Challenge Data from Main Contract
        (
            address staker,
            ,
            ,
            bool isSuccess,
            ,
            ,
            ,
            ,
            ,
            ,
            uint256 startTime
        ) = touchGrassContract.challenges(_challengeId);

        // 2. Security Checks
        require(msg.sender == staker, "Not the challenge owner");
        require(isSuccess, "Challenge not completed successfully");
        require(!hasMinted[_challengeId], "Already minted for this challenge");

        // 3. Mint
        uint256 tokenId = nextTokenId++;
        hasMinted[_challengeId] = true;

        _safeMint(msg.sender, tokenId);

        // Set a static metadata URI for MVP (You can make this dynamic later)
        _setTokenURI(
            tokenId,
            "ipfs://bafkreiadsx7e3q53af7yzwj4kxgyl5zysyao5lk6sq64jljlghxps6qv2e"
        );
    }

    function setTokenURI(
        uint256 tokenId,
        string memory _tokenURI
    ) external onlyOwner {
        _setTokenURI(tokenId, _tokenURI);
    }
}
