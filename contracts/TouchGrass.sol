// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./libraries/PricingLibrary.sol";

contract TouchGrass is ReentrancyGuard, Ownable2Step, Pausable {
    using SafeERC20 for IERC20;

    // ===== ENUMS =====
    /// @notice Defines the destination or mechanism for penalties
    enum PenaltyType {
        CHARITY,
        DEV,
        LOCK,
        BURN
    }

    // ===== STRUCTS =====

    /**
     * @notice Configuration for each supported token
     * @param isSupported Whether token is accepted
     * @param tokenAddress Address of the ERC20 token (address(0) for ETH)
     * @param priceFeed Chainlink price feed for TOKEN/USD
     * @param decimals Token decimals
     * @param priceStalenessTolerance Max age of price data
     * @param useFallbackPrice Whether to use manual fallback price
     * @param fallbackPrice Manual price in case oracle fails (18 decimals)
     */
    struct TokenConfig {
        bool isSupported;
        address tokenAddress;
        address priceFeed; // Chainlink TOKEN/USD price feed
        uint8 decimals;
        uint256 priceStalenessTolerance;
        bool useFallbackPrice;
        uint256 fallbackPrice; // Fallback price with 18 decimals (e.g., 2000e18 = $2000)
    }

    /// @notice Core challenge state data
    /// @dev Uses struct packing to minimize storage slots. Slots are optimized for gas efficiency.
    struct Challenge {
        address staker; // Slot 0: User who created the challenge
        uint8 penaltyPercent; // Slot 0: Percentage (0-100) to penalize on failure
        PenaltyType penaltyType; // Slot 0: Type of penalty execution
        bool isSuccess; // Slot 0: True if verification succeeded
        bool isWithdrawn; // Slot 0: True if funds have been claimed/swept
        uint8 lockMultiplierSnapshot; // Slot 0: Lock multiplier setting at creation time
        uint32 gracePeriodSnapshot; // Slot 0: Grace period setting at creation time
        bytes32 tokenId; // Slot 1: Hash of the token symbol
        uint256 stakeAmount; // Slot 2: Amount staked (in token decimals)
        uint256 duration; // Slot 3: Duration of the challenge in seconds
        uint256 startTime; // Slot 4: Timestamp when challenge was created
    }

    /// @notice Tracks scheduled fee updates for time-lock governance
    struct PendingFeeUpdate {
        uint256 newFee; // The new fee amount (in USDC units, 6 decimals)
        uint256 effectiveTime; // Earliest timestamp this update can be executed
        bool isPending; // Whether an update is currently scheduled
    }

    /// @notice Return data for batch token recovery operations
    struct RecoveryResult {
        string symbol; // Token symbol
        bool success; // Whether the recovery transfer succeeded
        uint256 amount; // Amount recovered
        string errorReason; // Reason for failure if success is false
    }

    /// @dev Parameters for creating a challenge (reduces stack in createChallenge)
    struct CreateChallengeParams {
        bytes32 tokenId;
        uint256 requiredFee;
        uint256 minStake;
        address tokenAddress;
        uint8 tokenDecimals;
    }

    /// @dev Result data for global protection summary calculations
    struct ProtectionCalcResult {
        uint256 contractValueUSD;
        uint256 lockedUSD;
        uint256 pendingUSD;
    }

    /// @dev ETH recovery info for getAllRecoveryStatus
    struct ETHRecoveryInfo {
        uint256 balance;
        uint256 locked;
        uint256 pending;
        uint256 recoverable;
    }

    // ===== STATE VARIABLES =====

    // ===== Security State Variables =====

    /// @notice Tracks the timestamp when ownership transfer was initiated
    uint256 public ownershipTransferInitiatedAt;

    address private _pendingOwnerWithDelay;

    /// @notice Mapping of trusted multi-sig wallets exempt from contract checks
    mapping(address => bool) public trustedMultiSigs;

    /// @notice Flag indicating if ownership renunciation is pending
    bool public ownershipRenunciationInitiated;

    /// @notice Timestamp when ownership renunciation was initiated
    uint256 public ownershipRenunciationInitiatedAt;

    /// @notice Addresses trusted to receive ETH via unlimited gas transfer (e.g., Treasury/Charity)
    mapping(address => bool) public trustedRecipients;

    // == Core Addresses ==
    /// @notice Authorized address to verify challenge success
    address public verifier;

    /// @notice Wallet address receiving charity donations/penalties
    address public charityWallet;

    /// @notice Wallet address receiving app fees and dev donations
    address public treasuryWallet;

    // == Pricing ==
    /// @notice Application fee in USDC (6 decimals), e.g., 500000 = 0.50 USDC
    uint256 public usdcFee;

    /// @notice Minimum stake required in USDC value (6 decimals)
    uint256 public usdcMinStake;

    /// @notice Struct holding pending fee update data
    PendingFeeUpdate public pendingUSDCFeeUpdate;

    // == Time Parameters ==
    /// @notice Minimum allowed duration for a challenge
    uint256 public MIN_DURATION;

    /// @notice Maximum allowed duration for a challenge
    uint256 public MAX_DURATION;

    /// @notice Time window after expiration before Admin can sweep failed challenges
    uint256 public GRACE_PERIOD;

    /// @notice Multiplier applied to duration for LOCK penalty type
    uint256 public LOCK_MULTIPLIER;

    /// @notice Minimum penalty percentage allowed for new challenges
    uint8 public MIN_PENALTY_PERCENTAGE;

    // == Token management ==
    /// @notice Configuration data for each token ID
    mapping(bytes32 => TokenConfig) public tokenConfigs;

    /// @notice Array of all supported token IDs (for iteration)
    bytes32[] public supportedTokenIds;

    /// @notice Mapping from token ID to human-readable symbol
    mapping(bytes32 => string) public tokenSymbols;

    // == Withdrawals & Accountings ==

    // Explicit check for reentrancy in _transfer
    bool private _transferring;

    /// @notice Tracks pending withdrawals for users who failed to receive transfers
    /// @dev Maps tokenId => user address => pending amount
    mapping(bytes32 => mapping(address => uint256)) public pendingWithdrawals;

    /// @notice Total pending withdrawals per token (prevents recovery of these funds)
    mapping(bytes32 => uint256) public totalPendingWithdrawals;

    /// @notice Total staked amount currently locked in active challenges per token
    mapping(bytes32 => uint256) public totalLockedByToken;

    /// @notice Registry of all challenges by ID
    mapping(uint256 => Challenge) public challenges;

    /// @notice Counter for challenge IDs
    uint256 public challengeCount;

    // ===== Security Events =====
    event OwnershipTransferScheduled(
        address indexed currentOwner,
        address indexed pendingOwner,
        uint256 effectiveTime
    );
    event OwnershipTransferCancelled(address indexed cancelledPendingOwner);

    event OwnershipRenunciationScheduled(
        address indexed owner,
        uint256 effectiveTime
    );
    event OwnershipRenunciationCancelled(address indexed owner);
    event OwnershipRenounced(address indexed previousOwner);

    // ===== Operational Events =====
    event ChallengeCreated(
        uint256 indexed id,
        address indexed staker,
        uint256 amount
    );
    event ChallengeSuccess(uint256 indexed id);
    event Withdrawn(uint256 indexed id, address indexed staker, uint256 amount);
    event PenaltyExecuted(
        uint256 indexed id,
        uint256 penaltyAmount,
        address destination
    );
    event VoluntaryDonation(
        uint256 indexed id,
        address indexed donor,
        uint256 amount,
        address target
    );

    // ===== Admin Functions Events
    event VerifierUpdated(
        address indexed oldVerifier,
        address indexed newVerifier
    );
    event CharityWalletUpdated(
        address indexed oldCharityWallet,
        address indexed newCharityWallet
    );
    event TreasuryWalletUpdated(
        address indexed oldTreasuryWallet,
        address indexed newTreasuryWallet
    );
    event MinDurationUpdated(uint256 indexed newMinDuration);
    event MaxDurationUpdated(uint256 indexed newMaxDuration);
    event GracePeriodUpdated(uint256 indexed newGracePeriod);
    event LockMultiplierUpdated(uint256 indexed newLockMultiplier);
    event MinPenaltyPercentageUpdated(uint8 indexed newMinPenaltyPercentage);
    event USDCFeeUpdateScheduled(uint256 newFee, uint256 effectiveTime);
    event USDCFeeUpdated(uint256 oldFee, uint256 newFee);
    event USDCFeeUpdateCancelled();
    event BaseUSDCMinStakeUpdated(uint256 oldMinStake, uint256 newMinStake);
    event TokenAdded(
        bytes32 indexed tokenId,
        string symbol,
        address indexed tokenAddress,
        address indexed priceFeed
    );
    event TokenRemoved(bytes32 indexed tokenId, string symbol);
    event TokenPriceFeedUpdated(
        bytes32 indexed tokenId,
        address oldFeed,
        address newFeed
    );
    event FallbackPriceEnabled(bytes32 indexed tokenId, uint256 price);
    event FallbackPriceDisabled(bytes32 indexed tokenId);

    // ===== Token Recovery Events =====
    event ETHRecovered(address indexed recipient, uint256 amount);
    event ERC20Recovered(
        address indexed token,
        address indexed recipient,
        uint256 amount,
        string tokenSymbol
    );
    event RecoveryAttempt(
        address indexed token,
        uint256 contractBalance,
        uint256 lockedAmount,
        uint256 recoverable
    );

    // ===== Whitelisting Events =====
    event MultiSigWhitelisted(address indexed multiSig);
    event MultiSigRemovedFromWhitelist(address indexed multiSig);

    // ===== Trusted Recipient Events
    event TrustedRecipientAdded(address indexed recipient);
    event TrustedRecipientRemoved(address indexed recipient);

    // ===== Pull Withdrawal Events =====
    event TransferFailed(
        address indexed user,
        bytes32 indexed tokenId,
        uint256 amount
    );
    event WithdrawalClaimed(
        address indexed user,
        bytes32 indexed tokenId,
        uint256 amount
    );

    // ===== Security Errors =====
    error TransferToZeroAddress();
    error TransferToCurrentOwner();
    error TransferToContract();
    error TransferDelayNotMet();
    error NoTransferPending();
    error OnlyPendingOwner();
    error OwnershipRenunciationNotInitiated();
    error RenunciationDelayNotMet();
    error OwnershipRenunciationInProgress();

    // ===== Operational Errors =====
    error DuplicateAddresses();
    error VerifierCannotBeOwner();
    error TokenNotSupported();
    error InvalidTokenConfig();
    error InvalidStake();
    error StakeBelowMinimum();
    error InsufficientPayment();
    error InvalidPenaltyPercent();
    error PenaltyPercentLessThanMinimum();
    error InsufficientEth();
    error InvalidDuration();
    error BurnPercentLessThan100();
    error FeeTransferFailed();
    error Unauthorized();
    error ChallengeAlreadySuccess();
    error ChallengeAlreadyWithdrawn();
    error TimeExpired();
    error TimestampOverflow();
    error ChallengeActive();
    error ChallengeSuccessful();
    error InvalidAddress();
    error StalePrice();
    error InvalidPriceData();
    error PriceOracleNotSet();
    error ChallengeNotExpired();
    error CannotSweepLock();
    error CannotSweepPartialPenalty();
    error DurationTooLarge();
    error FundsLocked();
    error EthTransferFailed();
    error InvalidVoluntaryDonationPercent();
    error InvalidVoluntaryDonationTarget();
    error MinPenaltyPercentageMustBeGreaterThan5();
    error GracePeriodCannotBeLessThanADay();
    error GracePeriodTooLarge();
    error LockMultiplierCausesOverflow();
    error LockMultiplierTooLow();
    error LockMultiplierTooHigh();
    error MaxDurationCausesOverflow();
    error MinDurationAboveMax();
    error MaxDurationAboveAbsolute();
    error MinDurationBelowAbsolute();
    error DurationCausesTimestampOverflow();
    error MinPenaltyPercentageHigherThan50();
    error USDCFeeOverflow();
    error USDCFeeZero();
    error USDCFeeTooLow();
    error GracePeriodActive();
    error GracePeriodTooLong();
    error GracePeriodCausesOverflow();
    error InsufficientFee();
    error CannotRecoverStakedTokens();
    error TokenTransferFailed();
    error InvalidPayment();
    error InvalidInput();
    error FeeChangeTooLarge();
    error TokenAlreadySupported();
    error InvalidCount();
    error CountTooLarge();
    error TokenNotFound();
    error NoPendingUpdate();
    error UpdateNotReady();

    // ===== Token Recovery Errors =====
    error NoTokensToRecover();
    error RecoveryFailed();
    error CannotRecoverLockedFunds();

    // ===== Pull Withdrawal Errors =====
    error NoPendingWithdrawal();
    error WithdrawalClaimFailed();

    error ReentrantTransfer();

    // ===== CONSTANTS =====

    // ===== Security Constants =====
    uint256 public constant OWNERSHIP_TRANSFER_DELAY = 48 hours;
    uint256 public constant OWNERSHIP_RENUNCIATION_DELAY = 7 days;

    uint256 public constant FEE_UPDATE_DELAY = 24 hours; // Users have 24h notice
    uint256 public constant MIN_USDC_FEE = 0.1 * 10 ** 6; // 0.1 USDC minimum
    uint256 public constant MAX_FEE_CHANGE_PERCENT = 500; // Max 5x change per update
    uint256 private constant GAS_STIPEND = 2300; // Enough for simple receives
    uint256 private constant PRICE_PRECISION = 1e18;
    uint256 public constant MAX_LOCK_MULTIPLIER = 15; // Max 15x lock extension
    uint256 public constant MIN_LOCK_MULTIPLIER = 3; // Min 3x lock extension
    uint256 public constant ABSOLUTE_MIN_DURATION = 1 minutes;
    uint256 public constant ABSOLUTE_MAX_DURATION = 730 days; // 2 years
    uint256 public constant MAX_GRACE_PERIOD = 30 days;
    uint8 public constant ABSOLUTE_MIN_PENALTY = 5;
    uint8 public constant ABSOLUTE_MAX_MIN_PENALTY = 50; // Min penalty can't require more than 50%
    uint256 constant VERIFICATION_BUFFER = 15 minutes;

    // ===== MODIFIERS =====
    /// @notice Restricts function access to the designated verifier address
    modifier onlyVerifier() {
        if (msg.sender != verifier) revert Unauthorized();
        _;
    }

    // ===== CONSTRUCTOR =====
    /// @notice Initializes the contract with core addresses and default config
    /// @param _verifierAddress Address authorized to verify challenges
    /// @param _charityAddress Address to receive charity funds
    /// @param _treasuryAddress Address to receive fees
    /// @param _USDCFee Initial fee in USDC (6 decimals)
    /// @param _USDCMinStake Initial minimum stake in USDC (6 decimals)
    constructor(
        address _verifierAddress,
        address _charityAddress,
        address _treasuryAddress,
        uint256 _USDCFee,
        uint256 _USDCMinStake
    ) Ownable(msg.sender) {
        if (
            _verifierAddress == address(0) ||
            _charityAddress == address(0) ||
            _treasuryAddress == address(0)
        ) revert InvalidAddress();

        if (
            _verifierAddress == _charityAddress ||
            _verifierAddress == _treasuryAddress ||
            _charityAddress == _treasuryAddress
        ) {
            revert DuplicateAddresses();
        }

        if (_verifierAddress == msg.sender) revert VerifierCannotBeOwner();

        verifier = _verifierAddress;
        charityWallet = _charityAddress;
        treasuryWallet = _treasuryAddress;

        trustedRecipients[_treasuryAddress] = true;
        trustedRecipients[_charityAddress] = true;

        usdcFee = _USDCFee; //Defualt USDC fee (0.5 USDC)
        usdcMinStake = _USDCMinStake; //Default Min Stake (1 USDC)

        MIN_DURATION = 1 * 1 minutes; //Default Minimum Challenge Duration
        MAX_DURATION = 365 * 1 days; //Default Maximux Challenge Duration
        GRACE_PERIOD = 7 * 1 days; //Default Grace Period
        LOCK_MULTIPLIER = 5; //Default Lock Multiplier
        MIN_PENALTY_PERCENTAGE = 20; //Default Minimum Penalty Percentage
    }

    // ===== OPERATIONAL FUNCTIONS =====

    // ===== Create Challenge =====

    /**
     * @dev Helper function to validate and prepare challenge parameters
     * @param _symbol Token symbol
     * @param _stakeAmount Amount to stake
     * @return params Bundled challenge parameters
     */
    function _validateChallengeParams(
        string calldata _symbol,
        uint256 _stakeAmount
    ) private view returns (CreateChallengeParams memory params) {
        params.tokenId = keccak256(abi.encode(_symbol));
        TokenConfig memory config = tokenConfigs[params.tokenId];

        if (!config.isSupported) revert TokenNotSupported();

        params.requiredFee = calculateTokenFee(_symbol);
        params.minStake = calculateMinStake(_symbol);
        params.tokenAddress = config.tokenAddress;
        params.tokenDecimals = config.decimals;

        if (_stakeAmount == 0) revert InvalidStake();
        if (_stakeAmount < params.minStake) revert StakeBelowMinimum();

        return params;
    }

    /**
     * @dev Helper function to handle ETH payment for challenge creation
     * @param params Challenge parameters
     * @param _stakeAmount Amount being staked
     */
    function _handleETHPayment(
        CreateChallengeParams memory params,
        uint256 _stakeAmount
    ) private {
        uint256 totalRequired = _stakeAmount + params.requiredFee;
        if (msg.value < totalRequired) revert InsufficientEth();

        // Send fee to treasury
        if (params.requiredFee > 0) {
            (bool feeSent, ) = payable(treasuryWallet).call{
                value: params.requiredFee
            }("");
            if (!feeSent) revert FeeTransferFailed();
        }

        // Refund excess
        if (msg.value > totalRequired) {
            uint256 excess = msg.value - totalRequired;
            (bool refunded, ) = payable(msg.sender).call{value: excess}("");

            // Don't revert if refund fails
            if (!refunded) {
                // Store for pull-based withdrawal
                pendingWithdrawals[params.tokenId][msg.sender] += excess;
                totalPendingWithdrawals[params.tokenId] += excess;
                emit TransferFailed(msg.sender, params.tokenId, excess);
            }
        }

        totalLockedByToken[params.tokenId] += _stakeAmount;
    }

    /**
     * @dev Helper function to handle ERC20 payment for challenge creation
     * @param params Challenge parameters
     * @param _stakeAmount Amount being staked
     */
    function _handleERC20Payment(
        CreateChallengeParams memory params,
        uint256 _stakeAmount
    ) private {
        if (msg.value > 0) revert InvalidPayment();

        IERC20 token = IERC20(params.tokenAddress);

        token.safeTransferFrom(msg.sender, treasuryWallet, params.requiredFee);
        token.safeTransferFrom(msg.sender, address(this), _stakeAmount);

        totalLockedByToken[params.tokenId] += _stakeAmount;
    }

    /**
     * @dev Helper function to store challenge data
     * @param params Challenge parameters
     * @param _stakeAmount Stake amount
     * @param _durationSeconds Duration in seconds
     * @param _penaltyType Penalty type
     * @param _penaltyPercent Penalty percentage
     */
    function _storeChallenge(
        CreateChallengeParams memory params,
        uint256 _stakeAmount,
        uint256 _durationSeconds,
        PenaltyType _penaltyType,
        uint8 _penaltyPercent
    ) private {
        // Validate gracePeriodSnapshot fits in uint32
        if (GRACE_PERIOD > type(uint32).max) revert GracePeriodTooLarge();

        challenges[challengeCount] = Challenge({
            staker: msg.sender,
            penaltyPercent: _penaltyPercent,
            penaltyType: _penaltyType,
            isSuccess: false,
            isWithdrawn: false,
            lockMultiplierSnapshot: uint8(LOCK_MULTIPLIER),
            gracePeriodSnapshot: uint32(GRACE_PERIOD),
            tokenId: params.tokenId,
            stakeAmount: _stakeAmount,
            duration: _durationSeconds,
            startTime: block.timestamp
        });

        emit ChallengeCreated(challengeCount, msg.sender, _stakeAmount);
        challengeCount++;
    }

    /**
     * @notice Create a challenge with dynamic pricing
     * @param _symbol Token symbol (e.g., "ETH", "USDC", "DAI")
     * @param _stakeAmount Amount to stake in token's native decimals
     * @param _durationSeconds Challenge duration in seconds
     * @param _penaltyType Type of penalty
     * @param _penaltyPercent Penalty percentage (0-100)
     */
    function createChallenge(
        string calldata _symbol,
        uint256 _stakeAmount,
        uint256 _durationSeconds,
        PenaltyType _penaltyType,
        uint8 _penaltyPercent
    ) external payable nonReentrant whenNotPaused {
        if (bytes(_symbol).length == 0) revert InvalidInput();

        // Validate and get params in separate stack frame
        CreateChallengeParams memory params = _validateChallengeParams(
            _symbol,
            _stakeAmount
        );

        // Validate penalty settings
        if (_penaltyType == PenaltyType.BURN && _penaltyPercent < 100)
            revert BurnPercentLessThan100();

        if (_durationSeconds < MIN_DURATION || _durationSeconds > MAX_DURATION)
            revert InvalidDuration();

        if (_penaltyPercent > 100) revert InvalidPenaltyPercent();

        if (_penaltyPercent < MIN_PENALTY_PERCENTAGE)
            revert PenaltyPercentLessThanMinimum();

        // Handle payment in separate stack frame
        if (params.tokenAddress == address(0)) {
            _handleETHPayment(params, _stakeAmount);
        } else {
            _handleERC20Payment(params, _stakeAmount);
        }

        // Store challenge in separate stack frame
        _storeChallenge(
            params,
            _stakeAmount,
            _durationSeconds,
            _penaltyType,
            _penaltyPercent
        );
    }

    /**
     * @notice Verifies a challenge as successful
     * @dev Only callable by the Verifier address. Must be called before expiration + buffer.
     * @param _id The ID of the challenge to verify
     */
    function verifySuccess(uint256 _id) external nonReentrant onlyVerifier {
        Challenge storage c = challenges[_id];
        if (c.isSuccess) revert ChallengeAlreadySuccess();
        if (c.isWithdrawn) revert ChallengeAlreadyWithdrawn();

        if (block.timestamp > c.startTime + c.duration + VERIFICATION_BUFFER)
            revert TimeExpired();

        c.isSuccess = true;
        emit ChallengeSuccess(_id);
    }

    /**
     * @notice Withdraw funds for a completed or expired challenge
     * @dev Handles both success (full payout - donation) and failure (penalty execution).
     * @param _id The challenge ID
     * @param _donationPercent Optional voluntary donation % (0-100) on success
     * @param _donationTarget Target for voluntary donation (CHARITY or DEV)
     */
    function withdraw(
        uint256 _id,
        uint256 _donationPercent,
        PenaltyType _donationTarget
    ) external nonReentrant {
        Challenge storage c = challenges[_id];
        if (msg.sender != c.staker) revert Unauthorized();
        if (c.isWithdrawn) revert ChallengeAlreadyWithdrawn();

        bool isExpired = block.timestamp > (c.startTime + c.duration);

        if (c.isSuccess) {
            _handleWithdrawSuccess(c, _id, _donationPercent, _donationTarget);
        } else if (isExpired) {
            _handleWithdrawFailure(c, _id);
        } else {
            revert ChallengeActive();
        }
    }

    /**
     * @notice Admin function to force-execute a penalty on a failed challenge
     * @dev Only callable after duration + grace period has passed. Cannot sweep LOCK penalties.
     * @param _id The challenge ID to sweep
     */
    function sweepPenalty(uint256 _id) external nonReentrant {
        Challenge storage c = challenges[_id];
        if (c.isWithdrawn) revert ChallengeAlreadyWithdrawn();
        if (c.isSuccess) revert ChallengeSuccessful();
        if (block.timestamp <= c.startTime + c.duration)
            revert ChallengeNotExpired();

        if (c.penaltyType == PenaltyType.LOCK) revert CannotSweepLock(); // STRICT CHECK: Ensure Lock penalties are NEVER swept

        if (msg.sender != c.staker && msg.sender != owner())
            revert Unauthorized();

        if (
            msg.sender != c.staker &&
            (block.timestamp < c.startTime + c.duration + c.gracePeriodSnapshot)
        ) revert GracePeriodActive();

        _executePenaltyAndWithdraw(c, _id);
    }

    /**
     * @notice Internal handler for successful challenge withdrawals
     * @dev Calculates payouts, handles voluntary donations, and transfers funds.
     * @param c The storage pointer to the challenge
     * @param _id The challenge ID
     * @param _donationPercent Voluntary donation percentage
     * @param _donationTarget Voluntary donation destination
     */
    function _handleWithdrawSuccess(
        Challenge storage c,
        uint256 _id,
        uint256 _donationPercent,
        PenaltyType _donationTarget
    ) internal {
        c.isWithdrawn = true;

        // Decrease locked amounts
        totalLockedByToken[c.tokenId] -= c.stakeAmount;

        uint256 totalPayout = c.stakeAmount;
        uint256 donationAmt = 0;

        if (_donationPercent > 0) {
            if (_donationPercent > 100)
                revert InvalidVoluntaryDonationPercent();
            if (
                _donationTarget != PenaltyType.DEV &&
                _donationTarget != PenaltyType.CHARITY
            ) revert InvalidVoluntaryDonationTarget();

            donationAmt = (totalPayout * _donationPercent) / 100;
            address target = (_donationTarget == PenaltyType.DEV)
                ? treasuryWallet
                : charityWallet;

            if (donationAmt > 0) {
                _transfer(c.tokenId, target, donationAmt);
                emit VoluntaryDonation(_id, msg.sender, donationAmt, target);
            }
        }

        uint256 userPayout = totalPayout - donationAmt;
        if (userPayout > 0) {
            _transfer(c.tokenId, msg.sender, userPayout);
        }
        emit Withdrawn(_id, msg.sender, userPayout);
    }

    /**
     * @notice Internal handler for failed challenge withdrawals
     * @dev Applies penalties. Enforces time-locks for LOCK penalty type.
     * @param c The storage pointer to the challenge
     * @param _id The challenge ID
     */
    function _handleWithdrawFailure(Challenge storage c, uint256 _id) internal {
        if (c.penaltyType == PenaltyType.LOCK) {
            // Lazy Evaluation of Lock Time: Duration * LOCK MULTIPLIER
            uint256 additionalLockTime;
            unchecked {
                additionalLockTime = c.duration * c.lockMultiplierSnapshot;

                if (additionalLockTime / c.lockMultiplierSnapshot != c.duration)
                    revert TimestampOverflow();
            }

            uint256 unlockTime;
            unchecked {
                unlockTime = c.startTime + c.duration + additionalLockTime;
            }
            if (unlockTime < c.startTime) revert TimestampOverflow();
            if (block.timestamp < unlockTime) revert FundsLocked();

            c.isWithdrawn = true;

            // Decrease locked amounts
            totalLockedByToken[c.tokenId] -= c.stakeAmount;

            _transfer(c.tokenId, msg.sender, c.stakeAmount);
            emit Withdrawn(_id, msg.sender, c.stakeAmount);
        } else {
            _executePenaltyAndWithdraw(c, _id);
        }
    }

    /**
     * @notice Executes the penalty transfer and returns the remainder to the user
     * @dev Handles BURN, DEV, and CHARITY penalty types.
     * @param c The storage pointer to the challenge
     * @param _id The challenge ID
     */
    function _executePenaltyAndWithdraw(
        Challenge storage c,
        uint256 _id
    ) internal {
        c.isWithdrawn = true;

        // Decrease locked amounts
        totalLockedByToken[c.tokenId] -= c.stakeAmount;

        // Safe math guaranteed by createChallenge requirement (penaltyPercent <= 100)
        uint256 penaltyAmt = (c.stakeAmount * c.penaltyPercent) / 100;
        uint256 payout = c.stakeAmount - penaltyAmt;

        address target;
        if (c.penaltyType == PenaltyType.BURN) {
            target = address(0x000000000000000000000000000000000000dEaD);
        } else if (c.penaltyType == PenaltyType.DEV) {
            target = treasuryWallet;
        } else {
            target = charityWallet;
        }

        if (penaltyAmt > 0) {
            _transfer(c.tokenId, target, penaltyAmt);
            emit PenaltyExecuted(_id, penaltyAmt, target);
        }

        if (payout > 0) {
            _transfer(c.tokenId, c.staker, payout); // Payout remaining funds to the staker
        }

        emit Withdrawn(_id, c.staker, payout); // Event always emits the user's portion (even if 0) for indexing
    }

    /**
     * @notice Internal safe transfer function with fallback
     * @dev Handles ETH and ERC20. If ETH transfer fails (due to gas limits),
     * funds are added to `pendingWithdrawals` to prevent loss.
     * @param _tokenId The token ID (hash of symbol)
     * @param _to The recipient address
     * @param _amount The amount to transfer
     */
    function _transfer(
        bytes32 _tokenId,
        address _to,
        uint256 _amount
    ) internal {
        if (_transferring) revert ReentrantTransfer();
        _transferring = true;

        TokenConfig memory config = tokenConfigs[_tokenId];

        if (config.tokenAddress == address(0)) {
            //ETH
            if (trustedRecipients[_to]) {
                // Safe to use unlimited gas for trusted recipients
                (bool sent, ) = payable(_to).call{value: _amount}("");
                if (!sent) {
                    _transferring = false;
                    revert EthTransferFailed();
                }
            } else {
                // Use gas limit for untrusted recipients (users)
                (bool sent, ) = payable(_to).call{
                    value: _amount,
                    gas: GAS_STIPEND
                }("");

                if (!sent) {
                    // Store failed transfer for pull-based withdrawal
                    pendingWithdrawals[_tokenId][_to] += _amount;
                    totalPendingWithdrawals[_tokenId] += _amount;

                    emit TransferFailed(_to, _tokenId, _amount);
                    _transferring = false;
                    return;
                }
            }
        } else {
            // ERC20
            IERC20(config.tokenAddress).safeTransfer(_to, _amount);
        }

        _transferring = false;
    }

    // ===== PULL-BASED WITHDRAWAL FUNCTION =====
    /**
     * @notice Allows users to claim their pending withdrawals from failed transfers
     * @param _symbol Token symbol to withdraw
     * @dev This function allows users to pull their funds if the push transfer failed
     */
    function claimPendingWithdrawal(
        string calldata _symbol
    ) external nonReentrant {
        bytes32 tokenId = keccak256(abi.encode(_symbol));
        uint256 pendingAmount = pendingWithdrawals[tokenId][msg.sender];

        if (pendingAmount == 0) revert NoPendingWithdrawal();

        // Clear the pending withdrawal BEFORE transfer (CEI pattern)
        pendingWithdrawals[tokenId][msg.sender] = 0;
        totalPendingWithdrawals[tokenId] -= pendingAmount;

        TokenConfig memory config = tokenConfigs[tokenId];

        if (config.tokenAddress == address(0)) {
            // ETH withdrawal - use call with more gas since user is initiating
            (bool sent, ) = payable(msg.sender).call{value: pendingAmount}("");
            if (!sent) {
                // If still fails, restore the pending withdrawal
                pendingWithdrawals[tokenId][msg.sender] = pendingAmount;
                totalPendingWithdrawals[tokenId] += pendingAmount;
                revert WithdrawalClaimFailed();
            }
        } else {
            // ERC20 withdrawal
            IERC20(config.tokenAddress).safeTransfer(msg.sender, pendingAmount);
        }

        emit WithdrawalClaimed(msg.sender, tokenId, pendingAmount);
    }

    /**
     * @notice Get pending withdrawal amount for a user and token
     * @param _symbol Token symbol
     * @param _user User address
     * @return amount Pending withdrawal amount
     */
    function getPendingWithdrawal(
        string calldata _symbol,
        address _user
    ) external view returns (uint256 amount) {
        bytes32 tokenId = keccak256(abi.encode(_symbol));
        return pendingWithdrawals[tokenId][_user];
    }

    /**
     * @notice Get all pending withdrawals for a user across all tokens
     * @param _user User address
     * @return symbols Token symbols
     * @return amounts Pending amounts
     */
    function getAllPendingWithdrawals(
        address _user,
        uint256 _startIndex,
        uint256 _count
    )
        external
        view
        returns (
            string[] memory symbols,
            uint256[] memory amounts,
            uint256 totalTokens
        )
    {
        if (_count == 0) revert InvalidCount();
        if (_count > 100) revert CountTooLarge();

        uint256 length = supportedTokenIds.length;
        totalTokens = length;

        if (_startIndex >= length) {
            return (new string[](0), new uint256[](0), totalTokens);
        }

        uint256 endIndex = _startIndex + _count;
        if (endIndex > length) {
            endIndex = length;
        }

        uint256 resultLength = endIndex - _startIndex;
        symbols = new string[](resultLength);
        amounts = new uint256[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            bytes32 tokenId = supportedTokenIds[_startIndex + i];
            symbols[i] = tokenSymbols[tokenId];
            amounts[i] = pendingWithdrawals[tokenId][_user];
        }

        return (symbols, amounts, totalTokens);
    }

    /**
     * @notice Get total pending withdrawals for a token (admin view)
     * @param _symbol Token symbol
     * @return total Total pending withdrawals for this token
     */
    function getTotalPendingWithdrawals(
        string calldata _symbol
    ) external view returns (uint256 total) {
        bytes32 tokenId = keccak256(abi.encode(_symbol));
        return totalPendingWithdrawals[tokenId];
    }

    // ===== TOKEN MANAGEMENT =====
    // Add mapping to track index
    mapping(bytes32 => uint256) private tokenIdToIndex;
    mapping(bytes32 => bool) private tokenIdExists;

    /**
     * @notice Add support for a new token with Chainlink price feed
     * @param _symbol Token symbol (e.g., "ETH", "DAI")
     * @param _tokenAddress Token contract address (address(0) for native ETH)
     * @param _priceFeed Chainlink price feed address for TOKEN/USD
     * @param _decimals Token decimals
     * @param _priceStalenessTolerance Max acceptable price age (e.g., 1 hours)
     */
    function addToken(
        string calldata _symbol,
        address _tokenAddress,
        address _priceFeed,
        uint8 _decimals,
        uint256 _priceStalenessTolerance
    ) external onlyOwner {
        bytes32 tokenId = keccak256(abi.encode(_symbol));

        if (tokenConfigs[tokenId].isSupported) revert TokenAlreadySupported();
        if (_priceFeed == address(0)) revert InvalidAddress();
        if (_priceStalenessTolerance == 0) revert InvalidTokenConfig();

        // Validate price feed works
        _validatePriceFeed(_priceFeed);

        tokenConfigs[tokenId] = TokenConfig({
            isSupported: true,
            tokenAddress: _tokenAddress,
            priceFeed: _priceFeed,
            decimals: _decimals,
            priceStalenessTolerance: _priceStalenessTolerance,
            useFallbackPrice: false,
            fallbackPrice: 0
        });

        supportedTokenIds.push(tokenId);
        uint256 newIndex = supportedTokenIds.length - 1;
        tokenIdToIndex[tokenId] = newIndex;
        tokenIdExists[tokenId] = true;
        tokenSymbols[tokenId] = _symbol;

        emit TokenAdded(tokenId, _symbol, _tokenAddress, _priceFeed);
    }

    /**
     * @notice Remove token support (only if no funds locked)
     * @param _symbol Token symbol to remove
     */
    function removeToken(string calldata _symbol) external onlyOwner {
        bytes32 tokenId = keccak256(abi.encode(_symbol));

        if (!tokenIdExists[tokenId]) revert TokenNotFound();
        if (!tokenConfigs[tokenId].isSupported) revert TokenNotSupported();
        if (totalLockedByToken[tokenId] > 0) revert FundsLocked();
        if (totalPendingWithdrawals[tokenId] > 0) revert FundsLocked();

        tokenConfigs[tokenId].isSupported = false;

        uint256 indexToRemove = tokenIdToIndex[tokenId];
        uint256 lastIndex = supportedTokenIds.length - 1;

        if (indexToRemove != lastIndex) {
            bytes32 lastTokenId = supportedTokenIds[lastIndex];
            supportedTokenIds[indexToRemove] = lastTokenId;
            tokenIdToIndex[lastTokenId] = indexToRemove;
        }

        supportedTokenIds.pop();
        delete tokenIdToIndex[tokenId];
        delete tokenIdExists[tokenId];

        emit TokenRemoved(tokenId, _symbol);
    }

    /**
     * @notice Update price feed for a token
     * @param _symbol Token symbol
     * @param _newPriceFeed New Chainlink price feed address
     */
    function updatePriceFeed(
        string calldata _symbol,
        address _newPriceFeed
    ) external onlyOwner {
        bytes32 tokenId = keccak256(abi.encode(_symbol));

        if (!tokenConfigs[tokenId].isSupported) revert TokenNotSupported();
        if (_newPriceFeed == address(0)) revert InvalidAddress();

        _validatePriceFeed(_newPriceFeed);

        address oldFeed = tokenConfigs[tokenId].priceFeed;
        tokenConfigs[tokenId].priceFeed = _newPriceFeed;

        emit TokenPriceFeedUpdated(tokenId, oldFeed, _newPriceFeed);
    }

    /**
     * @notice Enable fallback price for a token (emergency)
     * @param _symbol Token symbol
     * @param _fallbackPrice Fallback price with 18 decimals (e.g., 2000e18 = $2000)
     */
    function enableFallbackPrice(
        string calldata _symbol,
        uint256 _fallbackPrice
    ) external onlyOwner {
        bytes32 tokenId = keccak256(abi.encode(_symbol));

        if (!tokenConfigs[tokenId].isSupported) revert TokenNotSupported();
        if (_fallbackPrice == 0) revert InvalidPriceData();

        tokenConfigs[tokenId].useFallbackPrice = true;
        tokenConfigs[tokenId].fallbackPrice = _fallbackPrice;

        emit FallbackPriceEnabled(tokenId, _fallbackPrice);
    }

    /**
     * @notice Disable fallback price and use oracle
     * @param _symbol Token symbol
     */
    function disableFallbackPrice(string calldata _symbol) external onlyOwner {
        bytes32 tokenId = keccak256(abi.encode(_symbol));

        if (!tokenConfigs[tokenId].isSupported) revert TokenNotSupported();

        tokenConfigs[tokenId].useFallbackPrice = false;
        emit FallbackPriceDisabled(tokenId);
    }

    /**
     * @notice Validates a Chainlink price feed
     * @dev Checks for positive price answer and successful call.
     * @param _priceFeed The address of the AggregatorV3Interface
     */
    function _validatePriceFeed(address _priceFeed) internal view {
        AggregatorV3Interface feed = AggregatorV3Interface(_priceFeed);
        try feed.latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256,
            uint80
        ) {
            if (answer <= 0) revert InvalidPriceData();
        } catch {
            revert InvalidPriceData();
        }
    }

    /// @notice Get all supported token symbols
    function getAllSupportedTokens() external view returns (string[] memory) {
        string[] memory symbols = new string[](supportedTokenIds.length);
        for (uint256 i = 0; i < supportedTokenIds.length; i++) {
            symbols[i] = tokenSymbols[supportedTokenIds[i]];
        }
        return symbols;
    }

    // ===== PRICE CALCULATION FUNCTIONS =====

    /**
     * @notice Get current USD price for a token
     * @param _symbol Token symbol
     * @return price Token price in USD with 18 decimals
     */
    function getTokenPrice(
        string calldata _symbol
    ) public view returns (uint256 price) {
        bytes32 tokenId = keccak256(abi.encode(_symbol));
        TokenConfig memory config = tokenConfigs[tokenId];

        if (!config.isSupported) revert TokenNotSupported();

        // Use fallback if enabled
        if (config.useFallbackPrice) {
            return config.fallbackPrice;
        }

        // Get price from Chainlink
        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            config.priceFeed
        );

        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        // Validate price data
        if (answer <= 0) revert InvalidPriceData();
        if (updatedAt == 0) revert InvalidPriceData();
        if (answeredInRound < roundId) revert StalePrice();
        if (block.timestamp - updatedAt > config.priceStalenessTolerance)
            revert StalePrice();

        // Convert to 18 decimals
        uint8 feedDecimals = priceFeed.decimals();
        if (feedDecimals < 18) {
            price = uint256(answer) * (10 ** (18 - feedDecimals));
        } else {
            price = uint256(answer) / (10 ** (feedDecimals - 18));
        }

        return price;
    }

    /**
     * @notice Calculate token fee based on USDC fee and current price
     * @param _symbol Token symbol
     * @return fee Fee amount in token's native decimals
     */
    function calculateTokenFee(
        string calldata _symbol
    ) public view returns (uint256 fee) {
        bytes32 tokenId = keccak256(abi.encode(_symbol));
        TokenConfig memory config = tokenConfigs[tokenId];

        if (!config.isSupported) revert TokenNotSupported();

        // Get token price in USD (18 decimals)
        uint256 tokenPriceUSD = getTokenPrice(_symbol);

        // Use library for calculation
        fee = PricingLibrary.calculateTokenAmount(
            usdcFee,
            tokenPriceUSD,
            config.decimals
        );

        return fee;
    }

    /**
     * @notice Calculate minimum stake based on USDC minStake and current price
     * @param _symbol Token symbol
     * @return minStake Minimum stake in token's native decimals
     */
    function calculateMinStake(
        string calldata _symbol
    ) public view returns (uint256 minStake) {
        bytes32 tokenId = keccak256(abi.encode(_symbol));
        TokenConfig memory config = tokenConfigs[tokenId];

        if (!config.isSupported) revert TokenNotSupported();

        uint256 tokenPriceUSD = getTokenPrice(_symbol);

        // Use library for calculation
        minStake = PricingLibrary.calculateTokenAmount(
            usdcMinStake,
            tokenPriceUSD,
            config.decimals
        );

        return minStake;
    }

    /**
     * @notice Calculate total required payment for creating a challenge
     * @param _symbol Token symbol
     * @param _stakeAmount Desired stake amount
     * @return totalRequired Total amount needed (stake + fee)
     * @return fee Fee amount
     * @return minStake Minimum stake requirement
     */
    function calculateRequiredPayment(
        string calldata _symbol,
        uint256 _stakeAmount
    )
        external
        view
        returns (uint256 totalRequired, uint256 fee, uint256 minStake)
    {
        fee = calculateTokenFee(_symbol);
        minStake = calculateMinStake(_symbol);
        totalRequired = _stakeAmount + fee;

        return (totalRequired, fee, minStake);
    }

    // Helper for getAllTokenPricing to save stack space
    function _getSingleTokenPricing(
        bytes32 tokenId
    ) private view returns (uint256 price, uint256 fee, uint256 minStake) {
        string memory symbol = tokenSymbols[tokenId];
        // We use static calls here to avoid try/catch stack depth in the loop
        try this.getTokenPrice(symbol) returns (uint256 p) {
            price = p;
            fee = this.calculateTokenFee(symbol);
            minStake = this.calculateMinStake(symbol);
        } catch {
            price = 0;
            fee = 0;
            minStake = 0;
        }
    }

    // Helper to process the token pricing loop in a separate stack frame
    function _processPricingLoop(
        uint256 start,
        uint256 end
    )
        private
        view
        returns (
            string[] memory tokens,
            uint256[] memory prices,
            uint256[] memory fees,
            uint256[] memory minStakes
        )
    {
        uint256 len = end - start;
        tokens = new string[](len);
        prices = new uint256[](len);
        fees = new uint256[](len);
        minStakes = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            bytes32 tokenId = supportedTokenIds[start + i];
            tokens[i] = tokenSymbols[tokenId];
            // Uses the single-item helper we added earlier
            (prices[i], fees[i], minStakes[i]) = _getSingleTokenPricing(
                tokenId
            );
        }
    }

    /**
     * @notice Get pricing info for all supported tokens
     * @return tokens Array of token symbols
     * @return prices Array of prices (18 decimals)
     * @return fees Array of fees (native decimals)
     * @return minStakes Array of minimum stakes (native decimals)
     */
    function getAllTokenPricing(
        uint256 _startIndex,
        uint256 _count
    )
        external
        view
        returns (
            string[] memory tokens,
            uint256[] memory prices,
            uint256[] memory fees,
            uint256[] memory minStakes,
            uint256 totalTokens
        )
    {
        if (_count == 0) revert InvalidCount();
        if (_count > 100) revert CountTooLarge();

        uint256 length = supportedTokenIds.length;
        totalTokens = length;

        if (_startIndex >= length) {
            return (
                new string[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                totalTokens
            );
        }

        uint256 endIndex = _startIndex + _count;
        if (endIndex > length) {
            endIndex = length;
        }

        // Delegate loop to helper to clear stack
        (tokens, prices, fees, minStakes) = _processPricingLoop(
            _startIndex,
            endIndex
        );

        return (tokens, prices, fees, minStakes, totalTokens);
    }

    // ===== Admin Functions =====
    /**
     * @notice Updates the Verifier address
     * @param _newVerifier The new verifier address
     */
    function setVerifier(address _newVerifier) external onlyOwner {
        if (_newVerifier == address(0)) revert InvalidAddress();
        if (_newVerifier == msg.sender) revert VerifierCannotBeOwner();
        if (_newVerifier == charityWallet) revert DuplicateAddresses();
        if (_newVerifier == treasuryWallet) revert DuplicateAddresses();

        emit VerifierUpdated(verifier, _newVerifier);
        verifier = _newVerifier;
    }

    /**
     * @notice Updates the Charity wallet address
     * @dev Updates `trustedRecipients` mapping to ensure the new wallet can receive ETH via call.
     * @param _newCharity The new charity wallet address
     */
    function setCharityWallet(address _newCharity) external onlyOwner {
        if (_newCharity == address(0)) revert InvalidAddress();
        if (_newCharity == treasuryWallet) revert DuplicateAddresses();
        if (_newCharity == verifier) revert DuplicateAddresses();

        emit TrustedRecipientRemoved(charityWallet);
        trustedRecipients[charityWallet] = false; // Remove old

        emit TrustedRecipientAdded(_newCharity);
        trustedRecipients[_newCharity] = true; // Add new

        emit CharityWalletUpdated(charityWallet, _newCharity);
        charityWallet = _newCharity;
    }

    /**
     * @notice Updates the Treasury wallet address
     * @dev Updates `trustedRecipients` mapping.
     * @param _newTreasury The new treasury wallet address
     */
    function setTreasuryWallet(address _newTreasury) external onlyOwner {
        if (_newTreasury == address(0)) revert InvalidAddress();
        if (_newTreasury == charityWallet) revert DuplicateAddresses();
        if (_newTreasury == verifier) revert DuplicateAddresses();

        emit TrustedRecipientRemoved(treasuryWallet);
        trustedRecipients[treasuryWallet] = false; // Remove old

        emit TrustedRecipientAdded(_newTreasury);
        trustedRecipients[_newTreasury] = true; // Add new
        emit TreasuryWalletUpdated(treasuryWallet, _newTreasury);
        treasuryWallet = _newTreasury;
    }

    /**
     * @notice Updates the minimum and maximum allowed challenge durations
     * @dev Validates bounds against absolute limits and potential overflows.
     * @param _newMinDuration New minimum duration in minutes
     * @param _newMaxDuration New maximum duration in days
     */
    function updateDurationBounds(
        uint256 _newMinDuration,
        uint256 _newMaxDuration
    ) external onlyOwner {
        uint256 newMinDurationSec = _newMinDuration * 1 minutes;
        uint256 newMaxDurationSec = _newMaxDuration * 1 days;

        if (newMinDurationSec < ABSOLUTE_MIN_DURATION)
            revert MinDurationBelowAbsolute();
        if (newMaxDurationSec > ABSOLUTE_MAX_DURATION)
            revert MaxDurationAboveAbsolute();
        if (newMinDurationSec >= newMaxDurationSec)
            revert MinDurationAboveMax();

        // Overflow checks for max
        uint256 maxLockExtension = newMaxDurationSec * MAX_LOCK_MULTIPLIER;
        unchecked {
            if (maxLockExtension / MAX_LOCK_MULTIPLIER != newMaxDurationSec)
                revert MaxDurationCausesOverflow();
        }

        // Verify timestamp addition won't overflow
        if (
            newMaxDurationSec >
            type(uint256).max - block.timestamp - maxLockExtension
        ) revert DurationCausesTimestampOverflow();

        MIN_DURATION = newMinDurationSec;
        MAX_DURATION = newMaxDurationSec;

        emit MinDurationUpdated(_newMinDuration);
        emit MaxDurationUpdated(_newMaxDuration);
    }

    /**
     * @notice Updates the grace period for admin sweeping
     * @param _newGracePeriod New grace period in days
     */
    function setGracePeriod(uint256 _newGracePeriod) external onlyOwner {
        uint256 newGracePeriodSec = _newGracePeriod * 1 days;

        if (newGracePeriodSec < 1 days)
            revert GracePeriodCannotBeLessThanADay();
        if (newGracePeriodSec > MAX_GRACE_PERIOD) revert GracePeriodTooLong();
        if (newGracePeriodSec > type(uint32).max) revert GracePeriodTooLarge();

        // Verify no overflow with max duration
        unchecked {
            uint256 testSum = ABSOLUTE_MAX_DURATION + newGracePeriodSec;
            if (testSum < ABSOLUTE_MAX_DURATION)
                // Overflow check
                revert GracePeriodCausesOverflow();
        }

        GRACE_PERIOD = newGracePeriodSec;
        emit GracePeriodUpdated(_newGracePeriod);
    }

    /**
     * @notice Updates the multiplier for LOCK penalties
     * @param _newLockMultiplier New multiplier (e.g., 5 for 5x duration)
     */
    function setLockMultiplier(uint256 _newLockMultiplier) external onlyOwner {
        if (_newLockMultiplier < MIN_LOCK_MULTIPLIER)
            revert LockMultiplierTooLow();
        if (_newLockMultiplier > MAX_LOCK_MULTIPLIER)
            revert LockMultiplierTooHigh();

        // Verify no overflow for reasonable durations
        uint256 testDuration = ABSOLUTE_MAX_DURATION;
        uint256 testExtension;

        unchecked {
            testExtension = testDuration * _newLockMultiplier;
        }

        // Check for overflow
        if (testExtension / _newLockMultiplier != testDuration)
            revert LockMultiplierCausesOverflow();

        // Check timestamp overflow
        unchecked {
            uint256 testTimestamp = block.timestamp +
                ABSOLUTE_MAX_DURATION +
                (ABSOLUTE_MAX_DURATION * _newLockMultiplier);
            if (testTimestamp < block.timestamp)
                revert LockMultiplierCausesOverflow();
        }

        LOCK_MULTIPLIER = _newLockMultiplier;
        emit LockMultiplierUpdated(_newLockMultiplier);
    }

    /**
     * @notice Updates the minimum penalty percentage requirement
     * @param _newMinPenaltyPercentage New minimum percentage (e.g., 20 for 20%)
     */
    function setMinPenaltyPercentage(
        uint8 _newMinPenaltyPercentage
    ) external onlyOwner {
        if (_newMinPenaltyPercentage < ABSOLUTE_MIN_PENALTY)
            revert MinPenaltyPercentageMustBeGreaterThan5();
        if (_newMinPenaltyPercentage > ABSOLUTE_MAX_MIN_PENALTY)
            revert MinPenaltyPercentageHigherThan50();

        MIN_PENALTY_PERCENTAGE = _newMinPenaltyPercentage;
        emit MinPenaltyPercentageUpdated(_newMinPenaltyPercentage);
    }

    /// @notice Schedule a USDC fee change (executes after 24 hours if is fee increase)
    /// @param _newUSDCFee Fee in base units (6 decimals, e.g., 500000 for $0.50)
    function scheduleUSDCFeeUpdate(uint256 _newUSDCFee) external onlyOwner {
        // Validation
        if (_newUSDCFee == 0) revert USDCFeeZero();
        if (_newUSDCFee < MIN_USDC_FEE) revert USDCFeeTooLow();

        // Prevent drastic increase
        if (usdcFee > 0) {
            uint256 maxIncrease = (usdcFee * MAX_FEE_CHANGE_PERCENT) / 100;
            if (_newUSDCFee > usdcFee + maxIncrease) {
                revert FeeChangeTooLarge();
            }
        }

        // Schedule the update
        uint256 effectiveTime;
        // Only allow increase if giving users notice
        if (_newUSDCFee > usdcFee) {
            // Fee increase: 24 hour delay
            effectiveTime = block.timestamp + FEE_UPDATE_DELAY;
        } else {
            // Fee decrease: immediate (benefits users)
            effectiveTime = block.timestamp;
        }

        pendingUSDCFeeUpdate = PendingFeeUpdate({
            newFee: _newUSDCFee,
            effectiveTime: effectiveTime,
            isPending: true
        });

        emit USDCFeeUpdateScheduled(_newUSDCFee, effectiveTime);
    }

    /// @notice Cancel pending fee update
    function cancelUSDCFeeUpdate() external onlyOwner {
        if (!pendingUSDCFeeUpdate.isPending) revert NoPendingUpdate();

        delete pendingUSDCFeeUpdate;
        emit USDCFeeUpdateCancelled();
    }

    /**
     * @notice Update base USDC minimum stake (affects all tokens)
     * @param _newMinStake New minimum stake in base units (6 decimals, e.g., 5000000 for $5)
     */
    function setUSDCMinStake(uint256 _newMinStake) external onlyOwner {
        if (_newMinStake == 0) revert InvalidTokenConfig();

        uint256 oldMinStake = usdcMinStake;
        usdcMinStake = _newMinStake;
        emit BaseUSDCMinStakeUpdated(oldMinStake, _newMinStake);
    }

    /**
     * @notice Pauses contract operations (creating new challenges)
     * @dev Used in emergencies. Does not prevent withdrawals.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses contract operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /// ===== Unauthenticated Admin Functions ======
    /// @notice Execute scheduled fee change (callable by anyone after delay)
    function executeUSDCFeeUpdate() external {
        PendingFeeUpdate memory pending = pendingUSDCFeeUpdate;

        if (!pending.isPending) revert NoPendingUpdate();
        if (block.timestamp < pending.effectiveTime) revert UpdateNotReady();

        uint256 oldFee = usdcFee;
        usdcFee = pending.newFee;

        // Clear pending update
        delete pendingUSDCFeeUpdate;

        emit USDCFeeUpdated(oldFee, pending.newFee);
    }

    /// @notice Check if fee update is ready to execute
    function canExecuteUSDCFeeUpdate() external view returns (bool) {
        return
            pendingUSDCFeeUpdate.isPending &&
            block.timestamp >= pendingUSDCFeeUpdate.effectiveTime;
    }

    /**
     * @title Secure Token Recovery
     * @notice Allows admin to recover accidentally sent tokens while protecting user funds
     */

    // ===== Token Recovery Functions =====

    /**
     * @notice Recover accidentally sent ETH
     * @param _to Address to send recovered ETH to
     * @dev Only recovers ETH that is not locked in active challenges
     * @dev Cannot recover ETH that belongs to users' stakes
     */
    function recoverETH(address payable _to) external onlyOwner nonReentrant {
        if (_to == address(0)) revert InvalidAddress();

        // Get contract's total ETH balance
        uint256 contractBalance = address(this).balance;

        // Calculate total locked ETH from all ETH challenges
        bytes32 ethTokenId = keccak256(abi.encode("ETH"));

        uint256 lockedETH = totalLockedByToken[ethTokenId];
        uint256 pendingETH = totalPendingWithdrawals[ethTokenId];
        uint256 protectedETH = lockedETH + pendingETH;

        // Emit attempt for transparency
        emit RecoveryAttempt(
            address(0),
            contractBalance,
            protectedETH,
            contractBalance > protectedETH ? contractBalance - protectedETH : 0
        );

        // Check if there's any excess to recover
        if (contractBalance <= protectedETH) revert NoTokensToRecover();

        uint256 recoverableAmount = contractBalance - protectedETH;

        // Transfer excess ETH
        (bool success, ) = _to.call{value: recoverableAmount}("");
        if (!success) revert RecoveryFailed();

        emit ETHRecovered(_to, recoverableAmount);
    }

    /**
     * @notice Recover accidentally sent ERC20 tokens
     * @param _symbol Token symbol (e.g., "USDC", "DAI")
     * @param _to Address to send recovered tokens to
     * @dev Only recovers tokens that are not locked in active challenges
     * @dev Token must be in the supported tokens list to know its address
     */
    function recoverERC20BySymbol(
        string calldata _symbol,
        address _to
    ) external onlyOwner nonReentrant {
        if (_to == address(0)) revert InvalidAddress();

        bytes32 tokenId = keccak256(abi.encode(_symbol));
        TokenConfig memory config = tokenConfigs[tokenId];

        // Must be a supported token to know the address
        if (!config.isSupported) revert TokenNotSupported();
        if (config.tokenAddress == address(0)) revert InvalidAddress(); // Cannot recover ETH this way

        _recoverERC20Internal(config.tokenAddress, tokenId, _symbol, _to);
    }

    /**
     * @notice Recover accidentally sent ERC20 tokens by address
     * @param _tokenAddress Token contract address
     * @param _to Address to send recovered tokens to
     * @dev Use this for tokens that were sent but never added to supported list
     * @dev Will check all supported tokens to ensure we don't touch locked funds
     */
    function recoverERC20ByAddress(
        address _tokenAddress,
        address _to
    ) external onlyOwner nonReentrant {
        if (_tokenAddress == address(0)) revert InvalidAddress();
        if (_to == address(0)) revert InvalidAddress();

        // Check if this token address matches any supported token
        bytes32 matchedTokenId = bytes32(0);
        string memory matchedSymbol = "";

        for (uint256 i = 0; i < supportedTokenIds.length; i++) {
            bytes32 tokenId = supportedTokenIds[i];
            TokenConfig memory config = tokenConfigs[tokenId];

            if (config.tokenAddress == _tokenAddress) {
                matchedTokenId = tokenId;
                matchedSymbol = tokenSymbols[tokenId];
                break;
            }
        }

        if (matchedTokenId != bytes32(0)) {
            // This is a supported token, use safe recovery
            _recoverERC20Internal(
                _tokenAddress,
                matchedTokenId,
                matchedSymbol,
                _to
            );
        } else {
            // This is an unsupported token, can recover entire balance
            _recoverUnsupportedERC20(_tokenAddress, _to);
        }
    }

    /**
     * @notice Internal function to recover ERC20 tokens with locked amount check
     * @param _tokenAddress Token contract address
     * @param _tokenId Token ID (hash of symbol)
     * @param _symbol Token symbol for event
     * @param _to Recipient address
     */
    function _recoverERC20Internal(
        address _tokenAddress,
        bytes32 _tokenId,
        string memory _symbol,
        address _to
    ) internal {
        IERC20 token = IERC20(_tokenAddress);

        // Get contract's balance
        uint256 contractBalance = token.balanceOf(address(this));

        // Get locked amount
        uint256 lockedAmount = totalLockedByToken[_tokenId];
        uint256 pendingAmount = totalPendingWithdrawals[_tokenId];
        uint256 protectedAmount = lockedAmount + pendingAmount;

        // Emit attempt for transparency
        emit RecoveryAttempt(
            _tokenAddress,
            contractBalance,
            protectedAmount,
            contractBalance > protectedAmount
                ? contractBalance - protectedAmount
                : 0
        );

        // Check if there's any excess
        if (contractBalance <= protectedAmount) revert NoTokensToRecover();

        uint256 recoverableAmount = contractBalance - protectedAmount;

        // Transfer excess tokens
        token.safeTransfer(_to, recoverableAmount);

        emit ERC20Recovered(_tokenAddress, _to, recoverableAmount, _symbol);
    }

    /**
     * @notice Internal function to recover unsupported ERC20 tokens
     * @param _tokenAddress Token contract address
     * @param _to Recipient address
     * @dev Can recover entire balance since token was never used for challenges
     */
    function _recoverUnsupportedERC20(
        address _tokenAddress,
        address _to
    ) internal {
        IERC20 token = IERC20(_tokenAddress);
        uint256 balance = token.balanceOf(address(this));

        if (balance == 0) revert NoTokensToRecover();

        // Emit with zero locked amount (not a supported token)
        emit RecoveryAttempt(_tokenAddress, balance, 0, balance);

        token.safeTransfer(_to, balance);

        emit ERC20Recovered(_tokenAddress, _to, balance, "UNKNOWN");
    }

    /**
     * @notice Get recoverable ETH amount
     * @return recoverableAmount Amount of ETH that can be recovered
     */
    function getRecoverableETH()
        external
        view
        returns (uint256 recoverableAmount)
    {
        uint256 contractBalance = address(this).balance;
        bytes32 ethTokenId = keccak256(abi.encode("ETH"));

        uint256 lockedETH = totalLockedByToken[ethTokenId];
        uint256 pendingETH = totalPendingWithdrawals[ethTokenId];
        uint256 protectedETH = lockedETH + pendingETH;

        if (contractBalance <= protectedETH) return 0;
        return contractBalance - protectedETH;
    }

    /**
     * @notice Get recoverable token amount by symbol
     * @param _symbol Token symbol
     * @return recoverableAmount Amount of tokens that can be recovered
     */
    function getRecoverableTokensBySymbol(
        string calldata _symbol
    ) external view returns (uint256 recoverableAmount) {
        bytes32 tokenId = keccak256(abi.encode(_symbol));
        TokenConfig memory config = tokenConfigs[tokenId];

        if (!config.isSupported || config.tokenAddress == address(0)) {
            return 0;
        }

        IERC20 token = IERC20(config.tokenAddress);
        uint256 contractBalance = token.balanceOf(address(this));

        uint256 lockedAmount = totalLockedByToken[tokenId];
        uint256 pendingAmount = totalPendingWithdrawals[tokenId];
        uint256 protectedAmount = lockedAmount + pendingAmount;

        if (contractBalance <= protectedAmount) return 0;
        return contractBalance - protectedAmount;
    }

    /**
     * @notice Get recoverable token amount by address
     * @param _tokenAddress Token contract address
     * @return recoverableAmount Amount of tokens that can be recovered
     * @return isSupported Whether this token is in supported list
     * @return lockedAmount Amount currently locked in challenges
     * @return pendingAmount Amount in pending withdrawals
     */
    function getRecoverableTokensByAddress(
        address _tokenAddress
    )
        external
        view
        returns (
            uint256 recoverableAmount,
            bool isSupported,
            uint256 lockedAmount,
            uint256 pendingAmount
        )
    {
        IERC20 token = IERC20(_tokenAddress);
        uint256 contractBalance = token.balanceOf(address(this));

        // Check if this is a supported token
        for (uint256 i = 0; i < supportedTokenIds.length; i++) {
            bytes32 tokenId = supportedTokenIds[i];
            TokenConfig memory config = tokenConfigs[tokenId];

            if (config.tokenAddress == _tokenAddress) {
                isSupported = true;
                lockedAmount = totalLockedByToken[tokenId];
                pendingAmount = totalPendingWithdrawals[tokenId];

                uint256 protectedAmount = lockedAmount + pendingAmount;

                if (contractBalance <= protectedAmount) {
                    return (0, isSupported, lockedAmount, pendingAmount);
                }

                recoverableAmount = contractBalance - protectedAmount;
                return (
                    recoverableAmount,
                    isSupported,
                    lockedAmount,
                    pendingAmount
                );
            }
        }

        // Unsupported token - entire balance is recoverable
        return (contractBalance, false, 0, 0);
    }

    // NOTE: getAllRecoveryStatus, hasRecoverableFunds, and helper functions
    // have been moved to the TouchGrassViews contract to reduce bytecode size.

    /**
     * @dev Helper function to process ETH recovery for batchRecoverTokens
     * @param tokenId Token ID for ETH
     * @param _to Recipient address
     * @return result Recovery result for ETH
     */
    function _processETHRecovery(
        bytes32 tokenId,
        address _to
    ) private returns (RecoveryResult memory result) {
        result.symbol = "ETH";

        uint256 contractBalance = address(this).balance;
        uint256 lockedAmount = totalLockedByToken[tokenId];
        uint256 pendingAmount = totalPendingWithdrawals[tokenId];
        uint256 protectedAmount = lockedAmount + pendingAmount;

        if (contractBalance > protectedAmount) {
            uint256 recoverable = contractBalance - protectedAmount;
            (bool success, ) = _to.call{value: recoverable}("");
            if (success) {
                result.success = true;
                result.amount = recoverable;
                emit ETHRecovered(_to, recoverable);
            } else {
                result.errorReason = "ETH transfer failed";
            }
        } else {
            result.errorReason = "No recoverable ETH";
        }
        return result;
    }

    /**
     * @dev Helper function to process ERC20 recovery for batchRecoverTokens
     * @param tokenId Token ID
     * @param config Token configuration
     * @param symbol Token symbol
     * @param _to Recipient address
     * @return result Recovery result for ERC20
     */
    function _processERC20Recovery(
        bytes32 tokenId,
        TokenConfig memory config,
        string calldata symbol,
        address _to
    ) private returns (RecoveryResult memory result) {
        result.symbol = symbol;

        uint256 recoverable;

        // Calculate recoverable in scoped block to free stack slots
        {
            uint256 contractBalance = IERC20(config.tokenAddress).balanceOf(
                address(this)
            );
            uint256 protectedAmount = totalLockedByToken[tokenId] +
                totalPendingWithdrawals[tokenId];

            if (contractBalance <= protectedAmount) {
                result.errorReason = "No recoverable tokens";
                return result;
            }
            recoverable = contractBalance - protectedAmount;
        }

        // Execute transfer in scoped block
        {
            (bool success, bytes memory data) = config.tokenAddress.call(
                abi.encodeWithSelector(
                    IERC20.transfer.selector,
                    _to,
                    recoverable
                )
            );

            if (!success) {
                result.errorReason = "Transfer reverted";
                return result;
            }

            // Check return value
            if (data.length == 0) {
                result.success = true;
                result.amount = recoverable;
            } else {
                bool returnValue = abi.decode(data, (bool));
                if (returnValue) {
                    result.success = true;
                    result.amount = recoverable;
                } else {
                    result.errorReason = "Transfer returned false";
                    return result;
                }
            }
        }

        // Emit event outside scoped blocks
        if (result.success) {
            emit ERC20Recovered(config.tokenAddress, _to, recoverable, symbol);
        }

        return result;
    }

    /**
     * @notice Batch recovery for multiple tokens
     * @param _symbols Array of token symbols to recover
     * @param _to Recipient address for all recoveries
     * @dev More gas efficient than individual recoveries
     */
    function batchRecoverTokens(
        string[] calldata _symbols,
        address _to
    ) external onlyOwner nonReentrant returns (RecoveryResult[] memory) {
        if (_to == address(0)) revert InvalidAddress();

        RecoveryResult[] memory results = new RecoveryResult[](_symbols.length);
        uint256 successCount = 0;

        for (uint256 i = 0; i < _symbols.length; i++) {
            bytes32 tokenId = keccak256(abi.encode(_symbols[i]));
            TokenConfig memory config = tokenConfigs[tokenId];

            // Validate token first
            if (!config.isSupported) {
                results[i].symbol = _symbols[i];
                results[i].errorReason = "Token not supported";
                continue;
            }

            if (
                config.tokenAddress != address(0) &&
                config.tokenAddress.code.length == 0
            ) {
                results[i].symbol = _symbols[i];
                results[i].errorReason = "Not a contract";
                continue;
            }

            // Process recovery in separate stack frame
            if (config.tokenAddress == address(0)) {
                results[i] = _processETHRecovery(tokenId, _to);
            } else {
                results[i] = _processERC20Recovery(
                    tokenId,
                    config,
                    _symbols[i],
                    _to
                );
            }

            if (results[i].success) {
                successCount++;
            }
        }

        // At least one recovery must succeed
        if (successCount == 0) revert NoTokensToRecover();
        return results;
    }

    /**
     * @notice Emergency recovery for specific challenge (admin override)
     * @param _challengeId Challenge ID to inspect
     * @dev This function only provides information, not recovery
     * @dev Helps admin verify locked amounts are accurate
     */
    function getChallengeLockedInfo(
        uint256 _challengeId
    )
        external
        view
        returns (
            address staker,
            bytes32 tokenId,
            string memory tokenSymbol,
            uint256 stakeAmount,
            bool isWithdrawn,
            bool isSuccess,
            uint256 unlockTime
        )
    {
        Challenge memory c = challenges[_challengeId];

        staker = c.staker;
        tokenId = c.tokenId;
        tokenSymbol = tokenSymbols[c.tokenId];
        stakeAmount = c.stakeAmount;
        isWithdrawn = c.isWithdrawn;
        isSuccess = c.isSuccess;

        if (
            c.penaltyType == PenaltyType.LOCK && !c.isWithdrawn && !c.isSuccess
        ) {
            uint256 additionalLockTime = c.duration * c.lockMultiplierSnapshot;
            unlockTime = c.startTime + c.duration + additionalLockTime;
        } else {
            unlockTime = c.startTime + c.duration;
        }

        return (
            staker,
            tokenId,
            tokenSymbol,
            stakeAmount,
            isWithdrawn,
            isSuccess,
            unlockTime
        );
    }

    // ===== FINANCIAL AUDITING FUNCTIONS =====
    // NOTE: getTokenProtectionBreakdown, getGlobalProtectionSummary, and related
    // helper functions have been moved to the TouchGrassViews contract to reduce
    // main contract bytecode size. Deploy TouchGrassViews with this contract's
    // address to access those functions.

    /**
     * @notice Emergency check - verify all funds are properly accounted for
     * @dev Useful for auditing and ensuring no funds are lost
     * @return isBalanced True if contract balance equals locked + pending + recoverable
     * @return discrepancy Amount of discrepancy if not balanced (0 if balanced)
     */
    function verifyFundAccounting(
        string calldata _symbol
    ) external view returns (bool isBalanced, uint256 discrepancy) {
        bytes32 tokenId = keccak256(abi.encode(_symbol));
        TokenConfig memory config = tokenConfigs[tokenId];

        if (!config.isSupported) revert TokenNotSupported();

        uint256 contractBalance;
        if (config.tokenAddress == address(0)) {
            contractBalance = address(this).balance;
        } else {
            IERC20 token = IERC20(config.tokenAddress);
            contractBalance = token.balanceOf(address(this));
        }

        uint256 locked = totalLockedByToken[tokenId];
        uint256 pending = totalPendingWithdrawals[tokenId];
        uint256 accountedFor = locked + pending;

        if (contractBalance == accountedFor) {
            return (true, 0);
        } else if (contractBalance > accountedFor) {
            // Excess funds (recoverable)
            return (true, contractBalance - accountedFor);
        } else {
            // CRITICAL: Contract has less than it should!
            // This should never happen
            return (false, accountedFor - contractBalance);
        }
    }

    // ===== OWNERSHIP TRANSFER =====

    /**
     * @notice Whitelists a multi-sig address to bypass contract checks
     * @dev Allows a Gnosis Safe or similar to be an owner.
     * @param _multiSig The multi-sig address
     */
    function whitelistMultiSig(address _multiSig) external onlyOwner {
        trustedMultiSigs[_multiSig] = true;
        emit MultiSigWhitelisted(_multiSig);
    }

    /**
     * @notice Removes a multi-sig address from the whitelist
     * @param _multiSig The multi-sig address
     */
    function removeMultiSigWhitelist(address _multiSig) external onlyOwner {
        trustedMultiSigs[_multiSig] = false;
        emit MultiSigRemovedFromWhitelist(_multiSig);
    }

    /// @notice Propose ownership transfer with time delay
    /// @dev Requires 48 hour delay before new owner can accept
    function transferOwnership(
        address newOwner
    ) public virtual override onlyOwner {
        // Prevent transfer while renunciation is pending
        if (ownershipRenunciationInitiated) {
            revert OwnershipRenunciationInProgress();
        }

        // Validation
        if (newOwner == address(0)) revert TransferToZeroAddress();
        if (newOwner == owner()) revert TransferToCurrentOwner();

        // Allow contracts if whitelisted
        if (_isContract(newOwner) && !trustedMultiSigs[newOwner]) {
            revert TransferToContract();
        }

        // Set pending owner
        _pendingOwnerWithDelay = newOwner;
        ownershipTransferInitiatedAt = block.timestamp;

        emit OwnershipTransferScheduled(
            owner(),
            newOwner,
            block.timestamp + OWNERSHIP_TRANSFER_DELAY
        );
    }

    /// @notice New owner accepts ownership after delay period
    function acceptOwnership() public virtual override {
        address sender = _msgSender();

        // Verify sender is pending owner
        if (pendingOwner() != sender && _pendingOwnerWithDelay != sender) {
            revert OnlyPendingOwner();
        }

        // Verify delay has passed
        if (
            block.timestamp <
            ownershipTransferInitiatedAt + OWNERSHIP_TRANSFER_DELAY
        ) {
            revert TransferDelayNotMet();
        }

        // Transfer ownership
        _transferOwnership(sender);

        // Clear pending state
        delete _pendingOwnerWithDelay;
        delete ownershipTransferInitiatedAt;
    }

    /// @notice Cancel pending ownership transfer
    function cancelOwnershipTransfer() external onlyOwner {
        if (
            _pendingOwnerWithDelay == address(0) &&
            !ownershipRenunciationInitiated
        ) revert NoTransferPending();

        // Clear transfer
        if (_pendingOwnerWithDelay != address(0)) {
            address cancelled = _pendingOwnerWithDelay;
            delete _pendingOwnerWithDelay;
            delete ownershipTransferInitiatedAt;
            emit OwnershipTransferCancelled(cancelled);
        }

        // Clear renunciation
        if (ownershipRenunciationInitiated) {
            ownershipRenunciationInitiated = false;
            ownershipRenunciationInitiatedAt = 0;
            emit OwnershipRenunciationCancelled(owner());
        }
    }

    /// @notice Get pending owner (override to include our enhanced pending)
    function pendingOwner() public view override returns (address) {
        address openzeppelinPending = super.pendingOwner();
        return
            openzeppelinPending != address(0)
                ? openzeppelinPending
                : _pendingOwnerWithDelay;
    }

    /// @notice Check if transfer can be accepted
    function canAcceptOwnership() external view returns (bool) {
        return
            _pendingOwnerWithDelay != address(0) &&
            block.timestamp >=
            ownershipTransferInitiatedAt + OWNERSHIP_TRANSFER_DELAY;
    }

    /// @notice Check if address is a contract
    function _isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    // ===== RENOUNCE OWNERSHIP =====
    /**
     * @notice Schedule ownership renunciation (setting owner to address(0))
     * @dev Requires waiting period before execution to prevent accidental or malicious renunciation
     * @dev Cannot be called if there's already a pending transfer
     */
    function renounceOwnership() public virtual override onlyOwner {
        // Prevent renunciation while transfer is pending
        if (_pendingOwnerWithDelay != address(0)) {
            revert OwnershipRenunciationInProgress();
        }

        // Prevent calling twice
        if (ownershipRenunciationInitiated) {
            revert OwnershipRenunciationInProgress();
        }

        // Schedule renunciation
        ownershipRenunciationInitiated = true;
        ownershipRenunciationInitiatedAt = block.timestamp;

        emit OwnershipRenunciationScheduled(
            owner(),
            block.timestamp + OWNERSHIP_RENUNCIATION_DELAY
        );
    }

    /**
     * @notice Execute scheduled ownership renunciation after delay
     * @dev Can only be called by current owner after delay period
     */
    function executeOwnershipRenunciation() external onlyOwner {
        if (!ownershipRenunciationInitiated) {
            revert OwnershipRenunciationNotInitiated();
        }

        if (
            block.timestamp <
            ownershipRenunciationInitiatedAt + OWNERSHIP_RENUNCIATION_DELAY
        ) {
            revert RenunciationDelayNotMet();
        }

        address previousOwner = owner();

        // Clear renunciation state
        ownershipRenunciationInitiated = false;
        ownershipRenunciationInitiatedAt = 0;

        // Execute renunciation
        _transferOwnership(address(0));

        emit OwnershipRenounced(previousOwner);
    }

    /**
     * @notice Cancel scheduled ownership renunciation
     * @dev Only owner can cancel before execution
     */
    function cancelOwnershipRenunciation() external onlyOwner {
        if (!ownershipRenunciationInitiated) {
            revert OwnershipRenunciationNotInitiated();
        }

        address currentOwner = owner();

        // Clear state
        ownershipRenunciationInitiated = false;
        ownershipRenunciationInitiatedAt = 0;

        emit OwnershipRenunciationCancelled(currentOwner);
    }

    /**
     * @notice Check if renunciation can be executed
     * @return bool True if renunciation is ready to execute
     */
    function canExecuteRenunciation() external view returns (bool) {
        return
            ownershipRenunciationInitiated &&
            block.timestamp >=
            ownershipRenunciationInitiatedAt + OWNERSHIP_RENUNCIATION_DELAY;
    }

    /**
     * @notice Get time remaining until renunciation can be executed
     * @return uint256 Seconds remaining, or 0 if not initiated or already executable
     */
    function renunciationTimeRemaining() external view returns (uint256) {
        if (!ownershipRenunciationInitiated) return 0;

        uint256 executeTime = ownershipRenunciationInitiatedAt +
            OWNERSHIP_RENUNCIATION_DELAY;
        if (block.timestamp >= executeTime) return 0;

        return executeTime - block.timestamp;
    }
}
