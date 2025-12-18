# TouchGrass Smart Contract User Flow

> Complete guide to user interactions with the TouchGrass accountability protocol.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Challenge Creation Flow](#challenge-creation-flow)
4. [Active Challenge Phase](#active-challenge-phase)
5. [Verification Flow](#verification-flow)
6. [Withdrawal Flows](#withdrawal-flows)
7. [Penalty Scenarios](#penalty-scenarios)
8. [Pull-Based Recovery](#pull-based-recovery)
9. [NFT Minting](#nft-minting)
10. [View Functions for Users](#view-functions-for-users)

---

## Overview

The TouchGrass smart contract enables users to stake cryptocurrency on personal accountability challenges. The user journey follows this path:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   SETUP                ACTIVE              OUTCOME               CLAIM       │
│                                                                              │
│   ┌────────┐          ┌────────┐          ┌────────┐          ┌────────┐   │
│   │ Create │   ───►   │ Wait/  │   ───►   │Success │   ───►   │Withdraw│   │
│   │Challenge│         │Complete│          │  or    │          │ Funds  │   │
│   └────────┘          └────────┘          │ Fail   │          └────────┘   │
│                                           └────────┘                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Wallet Requirements

1. **Funded Wallet**: Must have sufficient tokens for:

   - Stake amount (your commitment)
   - Platform fee (dynamic, USD-based)
   - Gas fees (ETH for transaction execution)

2. **Token Approval** (ERC20 only): Before staking ERC20 tokens, approve the contract to spend your tokens:
   ```
   Token Contract → approve(TouchGrassAddress, stakeAmount + fee)
   ```

### Checking Current Pricing

Before creating a challenge, query the current fee and minimum stake:

```solidity
// Get fee in token's smallest unit
uint256 fee = contract.calculateTokenFee("ETH");

// Get minimum stake in token's smallest unit
uint256 minStake = contract.calculateMinStake("ETH");

// Get total payment required for your stake
(uint256 total, uint256 fee, uint256 min) = contract.calculateRequiredPayment("ETH", yourStakeAmount);
```

### Supported Tokens

Check which tokens are available:

```solidity
string[] memory tokens = contract.getAllSupportedTokens();
// Returns: ["ETH", "USDC", ...]
```

---

## Challenge Creation Flow

### Step 1: Choose Parameters

| Parameter       | Description                   | Constraints                            |
| --------------- | ----------------------------- | -------------------------------------- |
| Token Symbol    | Which token to stake          | Must be in supported list              |
| Stake Amount    | How much to risk              | ≥ minimum stake (USD-based)            |
| Duration        | Challenge timeframe           | Between MIN_DURATION and MAX_DURATION  |
| Penalty Type    | What happens on failure       | CHARITY, DEV, LOCK, or BURN            |
| Penalty Percent | How much forfeited on failure | ≥ MIN_PENALTY_PERCENTAGE (default 20%) |

### Step 2: Calculate Required Payment

```javascript
// For ETH stakes
const stakeAmount = ethers.parseEther("0.01"); // Your commitment
const fee = await contract.calculateTokenFee("ETH");
const totalRequired = stakeAmount + fee;

// For ERC20 stakes
const stakeAmount = ethers.parseUnits("10", 6); // 10 USDC
const fee = await contract.calculateTokenFee("USDC");
const totalApproval = stakeAmount + fee;
```

### Step 3: Create the Challenge

**For ETH:**

```javascript
await contract.createChallenge(
  "ETH", // Token symbol
  stakeAmount, // Stake in wei
  86400, // Duration: 24 hours
  0, // PenaltyType.CHARITY
  50, // 50% penalty on failure
  { value: totalRequired } // ETH sent with transaction
);
```

**For ERC20:**

```javascript
// First: Approve tokens
await usdcContract.approve(touchGrassAddress, totalApproval);

// Then: Create challenge
await contract.createChallenge(
  "USDC", // Token symbol
  stakeAmount, // Stake in USDC units
  604800, // Duration: 7 days
  1, // PenaltyType.DEV
  100 // 100% penalty on failure
);
```

### Challenge ID

The contract emits `ChallengeCreated` event with:

- `id`: Your challenge ID (use this for all future interactions)
- `staker`: Your address
- `amount`: Stake amount

```javascript
const receipt = await tx.wait();
const event = receipt.logs.find(
  (log) => log.fragment?.name === "ChallengeCreated"
);
const challengeId = event.args.id;
```

---

## Active Challenge Phase

### Understanding Your Challenge State

Query your challenge at any time:

```javascript
const challenge = await contract.challenges(challengeId);

// Returns:
{
    staker: "0x...",               // Your address
    penaltyPercent: 50,            // Your penalty setting
    penaltyType: 0,                // CHARITY
    isSuccess: false,              // Not yet verified
    isWithdrawn: false,            // Not yet claimed
    lockMultiplierSnapshot: 5,     // Lock multiplier at creation
    gracePeriodSnapshot: 604800,   // Grace period at creation (7 days)
    tokenId: "0x...",              // Token identifier hash
    stakeAmount: 10000000n,        // 10 USDC
    duration: 604800n,             // 7 days
    startTime: 1702500000n         // Creation timestamp
}
```

### Timeline Calculation

```javascript
const startTime = Number(challenge.startTime);
const duration = Number(challenge.duration);
const endTime = startTime + duration;

const now = Math.floor(Date.now() / 1000);
const timeRemaining = endTime - now;

const isExpired = now > endTime;
const isVerifiable = now <= endTime + 900; // +15 minute buffer
```

---

## Verification Flow

### When Can Verification Happen?

Verification window: **Challenge start → Challenge end + 15 minutes**

```
├─────────────────────────────────────────────────┤
│             CHALLENGE DURATION                   │
├─────────────────────────────────────────────────┼───────────────┤
                                                  │ 15min buffer │
                                                  ▼
                                          Verification deadline
```

### Who Verifies?

Only the designated **Verifier** address can call `verifySuccess()`. This is typically an automated backend service that:

1. Receives proof submission from user (via frontend)
2. Validates proof using AI/manual review
3. Calls `verifySuccess(challengeId)` on-chain

### What Happens on Verification?

```solidity
// Called by verifier backend
contract.verifySuccess(challengeId);
// → Sets isSuccess = true
// → Emits ChallengeSuccess(challengeId)
```

### User's Role in Verification

Users don't directly call verification. Instead:

1. **Submit proof** via frontend (photo, screenshot, etc.)
2. **Wait for backend** to process and verify
3. **Check status** by polling `challenges(id).isSuccess`

---

## Withdrawal Flows

### Flow 1: Successful Challenge Withdrawal

After verification, claim your funds:

```javascript
// Basic withdrawal - get all funds back
await contract.withdraw(
  challengeId,
  0, // No voluntary donation
  0 // Donation target (ignored if 0%)
);
```

**With Voluntary Donation:**

```javascript
// Donate 10% of recovered funds to charity
await contract.withdraw(
  challengeId,
  10, // 10% voluntary donation
  0 // PenaltyType.CHARITY
);

// Or donate to developers
await contract.withdraw(
  challengeId,
  5, // 5% voluntary donation
  1 // PenaltyType.DEV
);
```

**Payout Calculation:**

```
Total Payout = stakeAmount
Donation = (stakeAmount × donationPercent) / 100
User Receives = Total Payout - Donation
```

### Flow 2: Failed Challenge - Non-LOCK Penalty

If challenge expires without verification:

```javascript
// User can withdraw anytime after expiration
await contract.withdraw(challengeId, 0, 0);
```

**Payout Calculation:**

```
Penalty Amount = (stakeAmount × penaltyPercent) / 100
User Receives = stakeAmount - Penalty Amount
Penalty Goes To = Based on PenaltyType (charity/dev/burn)
```

**Example:**

- Stake: 100 USDC
- Penalty Percent: 50%
- Penalty Type: CHARITY

Result:

- 50 USDC → Charity wallet
- 50 USDC → User

### Flow 3: Failed Challenge - LOCK Penalty

LOCK penalty extends the waiting period significantly:

```
Unlock Time = startTime + duration + (duration × lockMultiplier)
```

**Example:**

- Duration: 7 days
- Lock Multiplier: 5x
- Unlock Time: Start + 7 days + (7 × 5) = Start + 42 days

```javascript
// Only works after unlock time
await contract.withdraw(challengeId, 0, 0);
// → Returns full stake (no penalty taken)
```

The LOCK penalty is designed as a pure time-lock punishment—you get everything back, but you have to wait.

---

## Penalty Scenarios

### Scenario Matrix

| Penalty Type | On Failure     | Destination       | Requirements       |
| ------------ | -------------- | ----------------- | ------------------ |
| CHARITY      | Lose penalty % | Charity wallet    | Any % ≥ minimum    |
| DEV          | Lose penalty % | Treasury wallet   | Any % ≥ minimum    |
| LOCK         | Wait longer    | N/A (no transfer) | Any % ≥ minimum    |
| BURN         | Lose all       | Dead address      | Requires 100% only |

### BURN Special Case

BURN requires 100% penalty and cannot be partially burned:

```javascript
// This works
await contract.createChallenge("ETH", stake, duration, 3 /*BURN*/, 100);

// This fails with BurnPercentLessThan100()
await contract.createChallenge("ETH", stake, duration, 3 /*BURN*/, 50);
```

### Sweep Mechanism

Users (or admin after grace period) can force-finalize failed challenges:

```javascript
// User can sweep their own challenge immediately after expiration
await contract.sweepPenalty(challengeId);

// Admin can sweep after grace period (7 days default)
// This is for abandoned challenges where user didn't withdraw
await contract.sweepPenalty(challengeId); // Called by owner
```

**IMPORTANT:** LOCK penalties cannot be swept—the funds remain locked until the full lock period expires.

---

## Pull-Based Recovery

### Why Pull-Based Withdrawals Exist

When withdrawing ETH, the contract uses a gas-limited transfer (2300 gas) for safety. If your wallet/contract can't receive ETH with this limit, the transfer fails.

Instead of losing your funds, they're stored for later retrieval:

```javascript
// Check if you have pending withdrawals
const pending = await contract.getPendingWithdrawal("ETH", userAddress);

// If pending > 0, claim it
if (pending > 0n) {
  await contract.claimPendingWithdrawal("ETH");
}
```

### Checking All Pending Withdrawals

```javascript
const { symbols, amounts, totalTokens } =
  await contract.getAllPendingWithdrawals(
    userAddress,
    0, // Start index
    100 // Count
  );

// symbols: ["ETH", "USDC", ...]
// amounts: [1000000000000000n, 0n, ...]
```

---

## NFT Minting

After successfully completing a challenge, users can mint a victory NFT:

```javascript
// On TouchGrassNFT contract
await nftContract.mintBadge(challengeId);
```

**Requirements:**

- Challenge must exist
- Caller must be the staker
- Challenge must be marked successful
- NFT not already minted for this challenge

---

## View Functions for Users

### Challenge Information

```solidity
// Get challenge details
function challenges(uint256 id) → Challenge

// Get detailed lock info (including unlock time)
function getChallengeLockedInfo(uint256 _challengeId) → (
    address staker,
    bytes32 tokenId,
    string tokenSymbol,
    uint256 stakeAmount,
    bool isWithdrawn,
    bool isSuccess,
    uint256 unlockTime
)
```

### Pricing Information

```solidity
// Get current token price (18 decimals)
function getTokenPrice(string symbol) → uint256 price

// Get fee amount
function calculateTokenFee(string symbol) → uint256 fee

// Get minimum stake
function calculateMinStake(string symbol) → uint256 minStake

// Get complete payment info
function calculateRequiredPayment(string symbol, uint256 stakeAmount) → (
    uint256 totalRequired,
    uint256 fee,
    uint256 minStake
)

// Get pricing for all tokens (paginated)
function getAllTokenPricing(uint256 startIndex, uint256 count) → (
    string[] tokens,
    uint256[] prices,
    uint256[] fees,
    uint256[] minStakes,
    uint256 totalTokens
)
```

### Token Information

```solidity
// Get all supported token symbols
function getAllSupportedTokens() → string[]

// Get token config by ID
function tokenConfigs(bytes32 tokenId) → TokenConfig
```

### Pending Withdrawals

```solidity
// Check single token pending
function getPendingWithdrawal(string symbol, address user) → uint256 amount

// Check all tokens pending (paginated)
function getAllPendingWithdrawals(address user, uint256 startIndex, uint256 count) → (
    string[] symbols,
    uint256[] amounts,
    uint256 totalTokens
)
```

---

## Complete User Journey Example

```javascript
// 1. Check pricing
const fee = await contract.calculateTokenFee("ETH");
const minStake = await contract.calculateMinStake("ETH");
console.log(`Fee: ${ethers.formatEther(fee)} ETH`);
console.log(`Min Stake: ${ethers.formatEther(minStake)} ETH`);

// 2. Create challenge
const stakeAmount = ethers.parseEther("0.1"); // 0.1 ETH stake
const totalPayment = stakeAmount + fee;

const tx = await contract.createChallenge(
  "ETH",
  stakeAmount,
  86400, // 24 hours
  0, // CHARITY penalty
  50, // 50% if I fail
  { value: totalPayment }
);
const receipt = await tx.wait();

// 3. Get challenge ID from event
const challengeId = receipt.logs[0].args.id;
console.log(`Challenge created: #${challengeId}`);

// 4. Check status periodically
const challenge = await contract.challenges(challengeId);
console.log(`Success: ${challenge.isSuccess}`);

// 5a. If verified successfully
if (challenge.isSuccess) {
  await contract.withdraw(challengeId, 0, 0);
  console.log("Funds withdrawn!");
}

// 5b. If expired without success
const now = Math.floor(Date.now() / 1000);
const endTime = Number(challenge.startTime) + Number(challenge.duration);
if (!challenge.isSuccess && now > endTime) {
  await contract.withdraw(challengeId, 0, 0);
  console.log("Penalty applied, remaining funds withdrawn.");
}
```

---

## Error Handling Guide

| Error                             | Meaning                | Solution                     |
| --------------------------------- | ---------------------- | ---------------------------- |
| `TokenNotSupported()`             | Token symbol not added | Use supported token          |
| `InvalidStake()`                  | Stake amount is 0      | Provide positive stake       |
| `StakeBelowMinimum()`             | Below min stake        | Increase stake amount        |
| `InsufficientEth()`               | Not enough ETH sent    | Send stake + fee + extra     |
| `InvalidDuration()`               | Duration out of range  | Check MIN/MAX_DURATION       |
| `InvalidPenaltyPercent()`         | Penalty > 100%         | Use 0-100                    |
| `PenaltyPercentLessThanMinimum()` | Below min penalty      | Check MIN_PENALTY_PERCENTAGE |
| `BurnPercentLessThan100()`        | BURN without 100%      | Set penalty to 100           |
| `ChallengeActive()`               | Challenge not expired  | Wait for expiration          |
| `ChallengeAlreadyWithdrawn()`     | Already claimed        | No action needed             |
| `FundsLocked()`                   | LOCK period active     | Wait for unlock time         |
| `Unauthorized()`                  | Not the staker         | Use correct account          |

---

_Document Version: 1.0_  
_Last Updated: December 2024_
