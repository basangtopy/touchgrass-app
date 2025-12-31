# TouchGrass Smart Contract Admin Guide

> Complete administrative reference for managing the TouchGrass protocol.

---

## Table of Contents

1. [Admin Roles & Permissions](#admin-roles--permissions)
2. [Initial Deployment](#initial-deployment)
3. [Token Management](#token-management)
4. [Fee & Pricing Configuration](#fee--pricing-configuration)
5. [Parameter Tuning](#parameter-tuning)
6. [Emergency Operations](#emergency-operations)
7. [Fund Recovery](#fund-recovery)
8. [Ownership Management](#ownership-management)
9. [Monitoring & Auditing](#monitoring--auditing)
10. [Operational Procedures](#operational-procedures)

---

## Admin Roles & Permissions

### Role: Owner

The `owner` address has complete administrative control over the contract.

**Capabilities:**

- Add/remove supported tokens
- Update price feeds
- Modify fees and parameters
- Pause/unpause contract
- Recover stuck funds
- Transfer ownership
- Whitelist multi-sig wallets

**Security:**

- Uses `Ownable2Step` (two-phase transfer)
- 48-hour delay for ownership transfers
- 7-day delay for ownership renunciation
- Cannot be verifier simultaneously

### Role: Verifier

The `verifier` address can mark challenges as successful.

**Capabilities:**

- Call `verifySuccess(challengeId)`

**Restrictions:**

- Cannot create challenges
- Cannot withdraw funds
- Cannot access admin functions
- Cannot be the owner

### Role: Trusted Recipients

Addresses in `trustedRecipients` mapping:

**Purpose:**

- Receive ETH with unlimited gas (vs. 2300 gas limit for users)
- Automatically includes: charity wallet, treasury wallet

**Security Implication:**

- These addresses can execute arbitrary code during ETH receives
- Only add addresses you fully control

---

## Initial Deployment

### Constructor Parameters

```solidity
constructor(
    address _verifierAddress,   // Backend verification service
    address _charityAddress,    // Charity fund recipient
    address _treasuryAddress,   // Platform fee recipient
    uint256 _USDCFee,           // Initial fee in USDC units (e.g., 500000 = $0.50)
    uint256 _USDCMinStake       // Initial min stake in USDC units (e.g., 1000000 = $1.00)
)
```

### Deployment Checklist

- [ ] Deploy contract with verified verifier address
- [ ] Add supported tokens (ETH, USDC, etc.)
- [ ] Configure price feeds for each token
- [ ] Verify fee and minimum stake settings
- [ ] Test challenge creation with small amounts
- [ ] Verify withdrawal flows
- [ ] Transfer ownership to multi-sig (if applicable)

### Post-Deployment Token Setup

```javascript
// Add ETH with Chainlink price feed
await contract.addToken(
  "ETH", // Symbol
  "0x0000000000000000000000000000000000000000", // Native token
  "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", // ETH/USD on Base
  18, // Decimals
  3600 // 1 hour staleness tolerance
);

// Add USDC
await contract.addToken(
  "USDC",
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B", // USDC/USD on Base
  6,
  86400 // 24 hour (stablecoins can be longer)
);
```

---

## Token Management

### Adding New Tokens

**Function:** `addToken(symbol, tokenAddress, priceFeed, decimals, stalenessTolerance)`

**Requirements:**

- Token not already added
- Price feed returns valid positive price
- Staleness tolerance > 0

```javascript
await contract.addToken(
  "DAI",
  "0x...", // DAI contract address
  "0x...", // DAI/USD Chainlink feed
  18, // DAI has 18 decimals
  3600 // 1 hour staleness
);
```

**Emits:** `TokenAdded(tokenId, symbol, tokenAddress, priceFeed)`

### Removing Tokens

**Function:** `removeToken(symbol)`

**Requirements:**

- Token exists and is supported
- No funds locked in active challenges
- No pending withdrawals for this token

```javascript
// First check if safe to remove
const locked = await contract.totalLockedByToken(tokenId);
const pending = await contract.totalPendingWithdrawals(tokenId);

if (locked == 0n && pending == 0n) {
  await contract.removeToken("DAI");
}
```

**Emits:** `TokenRemoved(tokenId, symbol)`

> **Warning:** Removing a token with locked funds will revert. Wait for all challenges to complete first.

### Updating Price Feeds

**Function:** `updatePriceFeed(symbol, newPriceFeed)`

**Use Case:**

- Chainlink deprecates old feed
- Migrating to higher-frequency feed
- Switching to different oracle

```javascript
await contract.updatePriceFeed(
  "ETH",
  "0x..." // New price feed address
);
```

**Emits:** `TokenPriceFeedUpdated(tokenId, oldFeed, newFeed)`

### Emergency Fallback Prices

When Chainlink oracles fail, enable manual pricing:

**Enable Fallback:**

```javascript
// Set ETH price to $2000 (18 decimals)
await contract.enableFallbackPrice(
  "ETH",
  ethers.parseEther("2000") // 2000e18
);
```

**Disable Fallback (restore oracle):**

```javascript
await contract.disableFallbackPrice("ETH");
```

> **Warning:** Fallback prices don't auto-update. Monitor market conditions and update regularly if enabled.

---

## Fee & Pricing Configuration

### Understanding the Fee System

All fees and minimums are denominated in **USDC (6 decimals)**:

- `usdcFee = 500000` means $0.50 fee
- `usdcMinStake = 1000000` means $1.00 minimum stake

These are converted to each token using Chainlink prices:

```
ETH fee = (usdcFee × 10^12) × 10^18 / ethPrice
```

### Scheduling Fee Updates

**Why Time-Lock?**
Fee increases require 24-hour notice to protect users from sudden changes.

**Schedule Increase:**

```javascript
// Change fee to $2.00 (from $0.50)
await contract.scheduleUSDCFeeUpdate(2000000n); // Base units (6 decimals)

// → Emits: USDCFeeUpdateScheduled(2000000, effectiveTime)
// → Users have 24 hours to create challenges at old rate
```

**Execute After Delay:**

```javascript
// Anyone can call after delay
await contract.executeUSDCFeeUpdate();
```

**Cancel Pending Update:**

```javascript
await contract.cancelUSDCFeeUpdate();
```

**Fee Decrease (Immediate):**

```javascript
// Decreases execute immediately (benefits users)
await contract.scheduleUSDCFeeUpdate(250000n); // $0.25 in base units
await contract.executeUSDCFeeUpdate(); // Can call immediately
```

### Constraints

| Constraint   | Value         | Purpose                        |
| ------------ | ------------- | ------------------------------ |
| Minimum Fee  | 0.1 USDC      | Prevent zero-fee abuse         |
| Max Change   | 5x per update | Prevent sudden large increases |
| Update Delay | 24 hours      | User notice for increases      |

### Setting Minimum Stake

**Function:** `setUSDCMinStake(newMinStake)`

```javascript
// Set minimum stake to $5.00
await contract.setUSDCMinStake(5000000n); // Base units (6 decimals)
```

No time-lock—minimum stake changes are immediate.

---

## Parameter Tuning

### Duration Bounds

**Function:** `updateDurationBounds(newMinDuration, newMaxDuration)`

```javascript
// Set min to 10 minutes, max to 90 days
await contract.updateDurationBounds(
  10, // 10 minutes (input is in minutes)
  90 // 90 days (input is in days)
);
```

**Constraints:**

- Minimum: ≥ 1 minute (ABSOLUTE_MIN_DURATION)
- Maximum: ≤ 730 days (ABSOLUTE_MAX_DURATION)
- Min must be < Max
- Must not cause overflow with lock multiplier

### Grace Period

**Function:** `setGracePeriod(newGracePeriod)`

Grace period = time after challenge expiration before admin can sweep.

```javascript
// Set to 14 days
await contract.setGracePeriod(14); // Input in days

// → Stored as 14 * 86400 = 1209600 seconds
```

**Constraints:**

- Minimum: 1 day
- Maximum: 30 days

### Lock Multiplier

**Function:** `setLockMultiplier(newMultiplier)`

For LOCK penalty type, funds are locked for `duration × multiplier`.

```javascript
// Set to 3x (funds locked 3× longer on failure)
await contract.setLockMultiplier(3);
```

**Constraints:**

- Minimum: 3x
- Maximum: 15x

### Minimum Penalty Percentage

**Function:** `setMinPenaltyPercentage(newMinPercentage)`

```javascript
// Require at least 25% penalty
await contract.setMinPenaltyPercentage(25);
```

**Constraints:**

- Minimum: 5%
- Maximum: 50%

---

## Emergency Operations

### Pausing the Contract

**Pause (stops new challenge creation):**

```javascript
await contract.pause();
```

**Effects:**

- `createChallenge()` reverts
- Withdrawals still work (protect user funds)
- Verification still works
- All admin functions still work

**Unpause:**

```javascript
await contract.unpause();
```

### When to Pause

| Scenario                     | Action                        |
| ---------------------------- | ----------------------------- |
| Critical bug discovered      | Pause immediately             |
| Oracle manipulation detected | Pause, enable fallback prices |
| Coordinated attack           | Pause, investigate            |
| Planned maintenance          | Usually not needed            |

---

## Fund Recovery

### Philosophy

The contract distinguishes between:

1. **Protected Funds:** User stakes + pending withdrawals (NEVER touch)
2. **Recoverable Funds:** Accidentally sent tokens (safe to recover)

### Checking Recoverable Amounts

```javascript
// Check ETH
const recoverableETH = await contract.getRecoverableETH();

// Check specific token
const recoverableUSDC = await contract.getRecoverableTokensBySymbol("USDC");

// Check unknown token by address
const { recoverableAmount, isSupported, lockedAmount, pendingAmount } =
  await contract.getRecoverableTokensByAddress("0x...");

// Global summary (from TouchGrassViews contract)
const viewsContract = new ethers.Contract(VIEWS_ADDRESS, VIEWS_ABI, provider);
const {
  totalContractValueUSD,
  totalLockedUSD,
  totalPendingUSD,
  totalProtectedUSD,
  totalRecoverableUSD,
} = await viewsContract.getGlobalProtectionSummary();
```

### Recovery Functions

**Recover ETH:**

```javascript
await contract.recoverETH(treasuryAddress);
```

**Recover ERC20 by Symbol:**

```javascript
await contract.recoverERC20BySymbol("USDC", treasuryAddress);
```

**Recover Unknown ERC20:**

```javascript
// For tokens accidentally sent that aren't in supported list
await contract.recoverERC20ByAddress(
  "0x...", // Token contract
  treasuryAddress
);
```

**Batch Recovery:**

```javascript
const results = await contract.batchRecoverTokens(
  ["ETH", "USDC", "DAI"],
  treasuryAddress
);

// Each result: { symbol, success, amount, errorReason }
```

### Verifying Fund Accounting

```javascript
const { isBalanced, discrepancy } = await contract.verifyFundAccounting("ETH");

if (!isBalanced) {
  console.error("CRITICAL: Fund discrepancy detected!");
  console.log("Discrepancy:", ethers.formatEther(discrepancy), "ETH");
}
```

---

## Ownership Management

### Standard Transfer (48-hour delay)

```javascript
// Step 1: Owner initiates transfer
await contract.transferOwnership(newOwnerAddress);
// → Emits: OwnershipTransferScheduled
// → 48-hour countdown starts

// Step 2: Wait 48 hours

// Step 3: New owner accepts
await contract.connect(newOwner).acceptOwnership();
```

### Transfer to Multi-Sig

```javascript
// First whitelist the multi-sig
await contract.whitelistMultiSig(gnosisSafeAddress);

// Then initiate transfer
await contract.transferOwnership(gnosisSafeAddress);

// Multi-sig accepts after delay
// (requires multi-sig transaction)
```

### Cancel Transfer

```javascript
await contract.cancelOwnershipTransfer();
```

### Renouncing Ownership (7-day delay)

> **Warning:** This makes the contract permanently ownerless. Admin functions become permanently inaccessible.

```javascript
// Step 1: Schedule renunciation
await contract.renounceOwnership();
// → 7-day countdown starts

// Step 2: Wait 7 days

// Step 3: Execute
await contract.executeOwnershipRenunciation();
// → owner = address(0)
```

### Cancel Renunciation

```javascript
await contract.cancelOwnershipRenunciation();
```

### Checking Transfer Status

```javascript
// Check pending owner
const pending = await contract.pendingOwner();

// Check if accept is possible
const canAccept = await contract.canAcceptOwnership();

// Check renunciation status
const canRenounce = await contract.canExecuteRenunciation();
const timeRemaining = await contract.renunciationTimeRemaining();
```

---

## Monitoring & Auditing

### Key Metrics to Monitor

```javascript
// Total locked per token
const ethLocked = await contract.totalLockedByToken(ethTokenId);
const usdcLocked = await contract.totalLockedByToken(usdcTokenId);

// Total pending withdrawals
const ethPending = await contract.totalPendingWithdrawals(ethTokenId);

// Challenge count
const totalChallenges = await contract.challengeCount();

// Contract balance vs accounting
const { isBalanced, discrepancy } = await contract.verifyFundAccounting("ETH");
```

### Event Monitoring

Set up listeners for critical events:

```javascript
// Security events
contract.on("OwnershipTransferScheduled", handler);
contract.on("MultiSigWhitelisted", handler);

// Operational anomalies
contract.on("TransferFailed", handler); // Users can't receive funds
contract.on("RecoveryAttempt", handler); // Admin recovery actions

// Financial events
contract.on("USDCFeeUpdateScheduled", handler);
contract.on("TokenAdded", handler);
contract.on("TokenRemoved", handler);
```

### Recovery Status Dashboard

> **Note:** `getAllRecoveryStatus()` is in the **TouchGrassViews** companion contract.

```javascript
const viewsContract = new ethers.Contract(VIEWS_ADDRESS, VIEWS_ABI, provider);
const {
  symbols,
  addresses,
  contractBalances,
  lockedAmounts,
  pendingAmounts,
  recoverableAmounts,
  totalTokens,
} = await viewsContract.getAllRecoveryStatus(0, 100);

// Display in admin dashboard
for (let i = 0; i < symbols.length; i++) {
  console.log(`${symbols[i]}:`);
  console.log(`  Balance: ${contractBalances[i]}`);
  console.log(`  Locked: ${lockedAmounts[i]}`);
  console.log(`  Pending: ${pendingAmounts[i]}`);
  console.log(`  Recoverable: ${recoverableAmounts[i]}`);
}
```

### Challenge Inspection

```javascript
// Get detailed info for specific challenge
const {
  staker,
  tokenId,
  tokenSymbol,
  stakeAmount,
  isWithdrawn,
  isSuccess,
  unlockTime,
} = await contract.getChallengeLockedInfo(challengeId);
```

---

## Operational Procedures

### Daily Checks

1. **Verify fund accounting** for all tokens
2. **Monitor pending withdrawals** (high amounts = users having issues)
3. **Check price feed staleness** for all tokens
4. **Review any TransferFailed events**

### Weekly Checks

1. **Review token pricing** vs market rates
2. **Check for recoverable funds** (accidentally sent tokens)
3. **Verify all oracle feeds are responsive**
4. **Review challenge completion rates**

### Post-Incident Checklist

After any security incident or bug:

1. [ ] Pause contract if necessary
2. [ ] Verify all fund accounting
3. [ ] Document affected challenges
4. [ ] Enable fallback prices if oracle issue
5. [ ] Communicate with affected users
6. [ ] Deploy fix (if applicable)
7. [ ] Unpause contract
8. [ ] Post-mortem documentation

### Sweep Process (Abandoned Challenges)

After grace period expires on failed challenges:

```javascript
// Identify sweepable challenges (off-chain analysis)
// For each challenge where:
// - isWithdrawn = false
// - isSuccess = false
// - now > startTime + duration + gracePeriod
// - penaltyType != LOCK

await contract.sweepPenalty(challengeId);
```

> **Note:** LOCK penalties cannot be swept. Users must wait for full lock period.

### Address Updates

**Update Verifier:**

```javascript
await contract.setVerifier(newVerifierAddress);
```

**Update Charity Wallet:**

```javascript
await contract.setCharityWallet(newCharityAddress);
// → Old address removed from trustedRecipients
// → New address added to trustedRecipients
```

**Update Treasury Wallet:**

```javascript
await contract.setTreasuryWallet(newTreasuryAddress);
// → Old address removed from trustedRecipients
// → New address added to trustedRecipients
```

---

## Quick Reference

### Admin Functions Summary

| Function                  | Purpose                         | Time-Lock       |
| ------------------------- | ------------------------------- | --------------- |
| `addToken`                | Add new staking token           | No              |
| `removeToken`             | Remove token support            | No              |
| `updatePriceFeed`         | Change oracle address           | No              |
| `enableFallbackPrice`     | Emergency manual price          | No              |
| `scheduleUSDCFeeUpdate`   | Schedule fee change             | 24h (increases) |
| `setUSDCMinStake`         | Change min stake                | No              |
| `updateDurationBounds`    | Change duration limits          | No              |
| `setGracePeriod`          | Change grace period             | No              |
| `setLockMultiplier`       | Change lock penalty duration    | No              |
| `setMinPenaltyPercentage` | Change min penalty              | No              |
| `setVerifier`             | Change verifier address         | No              |
| `setCharityWallet`        | Change charity address          | No              |
| `setTreasuryWallet`       | Change treasury address         | No              |
| `pause`                   | Stop new challenges             | No              |
| `recoverETH`              | Recover excess ETH              | No              |
| `batchRecoverTokens`      | Recover multiple tokens         | No              |
| `transferOwnership`       | Initiate ownership transfer     | 48h             |
| `renounceOwnership`       | Schedule permanent renunciation | 7d              |

### Modifiers Reference

| Modifier        | Applied To               | Purpose              |
| --------------- | ------------------------ | -------------------- |
| `onlyOwner`     | All admin functions      | Restrict to owner    |
| `onlyVerifier`  | `verifySuccess`          | Restrict to verifier |
| `nonReentrant`  | State-changing functions | Prevent reentrancy   |
| `whenNotPaused` | `createChallenge`        | Emergency stop       |

---

_Document Version: 1.0_  
_Last Updated: December 2025_
