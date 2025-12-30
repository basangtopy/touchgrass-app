# TouchGrass Technical Documentation

> Comprehensive technical reference for the TouchGrass accountability protocol.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Smart Contracts](#smart-contracts)
5. [Frontend Application](#frontend-application)
6. [Verification Server](#verification-server)
7. [Data Models](#data-models)
8. [User Flow & State Management](#user-flow--state-management)
9. [Security & Trust Model](#security--trust-model)
10. [Deployment & Configuration](#deployment--configuration)
11. [API Reference](#api-reference)
12. [Troubleshooting & Recovery](#troubleshooting--recovery)

---

## Architecture Overview

TouchGrass is a decentralized accountability protocol that combines:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│  Firebase/Cloud │────▶│   Base L2       │
│  (Vite + WAGMI) │     │  (Firestore DB) │     │  (Smart Contracts)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                              │
         │              ┌─────────────────┐             │
         └─────────────▶│ Verification    │◀────────────┘
                        │ Server (Node.js)│
                        └─────────────────┘
                                │
                        ┌───────▼───────┐
                        │  GPT-4o Vision │
                        │  (OpenRouter)  │
                        └───────────────┘
```

### Key Design Principles

1. **Non-Custodial**: All user funds are held in smart contracts, not centralized databases
2. **Lazy Evaluation**: Contract doesn't require keepers/bots for timeout enforcement
3. **Auto-Recovery**: Lost challenges are automatically restored from blockchain events
4. **AI Verification**: GPT-4o Vision provides objective task completion verification

---

## Technology Stack

### Frontend

| Technology      | Purpose                 |
| --------------- | ----------------------- |
| React 18        | UI Framework            |
| Vite            | Build Tool & Dev Server |
| Tailwind CSS    | Styling                 |
| WAGMI + Viem    | Ethereum Library        |
| RainbowKit      | Wallet Connection UI    |
| React Router v6 | Client-side Routing     |
| Lucide React    | Icon Library            |

### Backend Services

| Technology         | Purpose                        |
| ------------------ | ------------------------------ |
| Firebase Firestore | Challenge metadata storage     |
| Firebase Auth      | Anonymous authentication       |
| Cloudinary         | Image hosting for verification |
| Node.js + Express  | Verification API server        |
| OpenRouter API     | GPT-4o Vision access           |

### Blockchain

| Technology       | Purpose                                                      |
| ---------------- | ------------------------------------------------------------ |
| Base (L2)        | Target deployment chain                                      |
| Solidity ^0.8.20 | Smart contract language                                      |
| OpenZeppelin     | Security libraries (ReentrancyGuard, Ownable2Step, Pausable) |
| Chainlink        | Price feed oracles                                           |
| Hardhat          | Development & testing framework                              |

---

## Project Structure

```
TouchGrass/
├── contracts/                    # Solidity smart contracts
│   ├── TouchGrass.sol           # Main challenge contract (2882 lines)
│   ├── TouchGrassNFT.sol        # Victory badge NFT (ERC-721)
│   ├── MockERC20.sol            # Test token
│   ├── libraries/
│   │   └── PricingLibrary.sol   # USD pricing calculations
│   └── mocks/                   # Mock contracts for testing
│
├── server/                       # Verification backend
│   ├── index.js                 # Express API server
│   └── .env                     # Environment config
│
├── src/                          # React frontend
│   ├── App.jsx                  # Main application component
│   ├── main.jsx                 # Entry point + providers
│   ├── wagmi.js                 # Wallet configuration
│   ├── firebase.js              # Firebase initialization
│   │
│   ├── views/                   # Page components
│   │   ├── Home.jsx             # Dashboard & challenge list
│   │   ├── ObjectiveSelection.jsx # Goal picker
│   │   ├── Staking.jsx          # Stake configuration
│   │   ├── ActiveChallenge.jsx  # Live challenge view
│   │   ├── Verify.jsx           # Photo upload & AI check
│   │   ├── Result.jsx           # Success screen
│   │   ├── Lost.jsx             # Failure screen
│   │   └── Documentation.jsx    # In-app docs
│   │
│   ├── components/              # Reusable UI components
│   │   ├── Header.jsx
│   │   ├── OnboardingModal.jsx  # First-time user tutorial
│   │   └── ui/                  # Button, Card, Tooltip, etc.
│   │
│   ├── data/                    # Static configuration
│   │   ├── constants.jsx        # Objectives, penalties, quotes
│   │   ├── contractConfig.js    # Contract address & ABI import
│   │   ├── tokenConfig.js       # ETH/USDC configuration
│   │   ├── quotes.json          # 119 motivational quotes
│   │   └── *.json               # Contract ABIs
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useIdentity.js       # ENS/Farcaster name resolution
│   │   └── useHandleNFTmint.js  # NFT minting logic
│   │
│   └── utils/                   # Utility functions
│       ├── helpers.js           # Time formatting, proof examples
│       ├── ethersAdapter.js     # WAGMI-to-Ethers bridge
│       ├── imageProcessing.js   # HEIC/PDF conversion
│       └── shareUtils.js        # Social sharing
│
├── test/                         # Contract test files
├── scripts/                      # Deployment scripts
└── hardhat.config.cjs           # Hardhat configuration
```

---

## Smart Contracts

### TouchGrass.sol (Main Contract)

The core contract managing stakes, challenges, and fund flows.

#### Key Enums

```solidity
enum PenaltyType {
    CHARITY,  // 0 - Forfeited funds go to charity wallet
    DEV,      // 1 - Forfeited funds go to treasury
    LOCK,     // 2 - Funds locked for duration × LOCK_MULTIPLIER
    BURN      // 3 - Funds sent to dead address (0x...dead)
}
```

#### Challenge Struct (Storage-Optimized)

```solidity
struct Challenge {
    address staker;           // Slot 0: Challenge creator
    uint8 penaltyPercent;     // Slot 0: 0-100 penalty on failure
    PenaltyType penaltyType;  // Slot 0: Penalty destination
    bool isSuccess;           // Slot 0: Verified by AI
    bool isWithdrawn;         // Slot 0: Funds claimed
    bytes32 tokenId;          // Slot 1: Token identifier
    uint256 stakeAmount;      // Slot 2: Amount in smallest unit
    uint64 startTime;         // Slot 3: Challenge start timestamp
    uint64 duration;          // Slot 3: Challenge duration in seconds
}
```

#### Core Functions

| Function                                                                 | Access        | Description                               |
| ------------------------------------------------------------------------ | ------------- | ----------------------------------------- |
| `createChallenge(symbol, amount, duration, penaltyType, penaltyPercent)` | Public        | Create new challenge with stake           |
| `verifySuccess(challengeId)`                                             | Verifier Only | Mark challenge as successful              |
| `withdraw(challengeId, donationPercent, donationTarget)`                 | Staker Only   | Claim funds after success                 |
| `sweepPenalty(challengeId)`                                              | Anyone        | Execute 100% penalty on expired challenge |

#### Token Configuration

```solidity
struct TokenConfig {
    address tokenAddress;       // ERC20 address (0x0 for native ETH)
    AggregatorV3Interface priceFeed; // Chainlink oracle
    uint8 decimals;             // Token decimals
    bool isActive;              // Enabled for staking
    uint256 fallbackPrice;      // Price if oracle fails (18 decimals)
}
```

#### Key Events

```solidity
event ChallengeCreated(
    uint256 indexed challengeId,
    address indexed staker,
    bytes32 indexed tokenId,
    uint256 stakeAmount,
    uint256 duration
);

event ChallengeVerified(
    uint256 indexed challengeId,
    address indexed staker
);

event ChallengeWithdrawn(
    uint256 indexed challengeId,
    address indexed staker,
    uint256 amountReturned,
    uint256 penaltyAmount
);
```

### TouchGrassNFT.sol (Victory Badges)

ERC-721 contract for minting "Proof of Victory" badges.

```solidity
function mintBadge(uint256 challengeId) external;
```

Verifies on-chain that:

1. Challenge exists and belongs to caller
2. Challenge is marked successful
3. Badge hasn't been minted for this challenge

---

## Frontend Application

### Main App.jsx State Management

The application uses React hooks for state management (no Redux/Zustand):

```javascript
// Wallet State (via WAGMI)
const { address, isConnected } = useAccount();
const signer = useEthersSigner();

// Database State
const [challenges, setChallenges] = useState([]);
const [challengesLoading, setChallengesLoading] = useState(true);

// Draft State (Challenge Creation)
const [draftObjective, setDraftObjective] = useState(null);
const [draftStakeAmount, setDraftStakeAmount] = useState(1);
const [draftToken, setDraftToken] = useState("USDC");
const [draftPenaltyType, setDraftPenaltyType] = useState("charity");
const [draftPenaltyPercent, setDraftPenaltyPercent] = useState(100);

// Dynamic Pricing (from contract)
const [tokenFee, setTokenFee] = useState("0");
const [tokenMinStake, setTokenMinStake] = useState("0");
```

### Route Structure

| Path          | Component          | Description                      |
| ------------- | ------------------ | -------------------------------- |
| `/`           | Home               | Dashboard with challenge list    |
| `/objective`  | ObjectiveSelection | Pick/create challenge goal       |
| `/staking`    | Staking            | Configure stake & penalty        |
| `/active/:id` | ActiveChallenge    | Live timer & verify button       |
| `/verify/:id` | Verify             | Photo upload & AI submission     |
| `/result/:id` | Result             | Success celebration & withdrawal |
| `/lost/:id`   | Lost               | Penalty handling                 |
| `/docs`       | Documentation      | In-app reference                 |

### Challenge Lifecycle

```
┌──────────────┐
│   /objective │ User selects goal
└──────┬───────┘
       ▼
┌──────────────┐
│   /staking   │ User sets amount, token, penalty
└──────┬───────┘
       ▼
┌──────────────┐
│ createChallenge() ◀── Blockchain TX + Firestore write
└──────┬───────┘
       ▼
┌──────────────┐
│  /active/:id │ Timer counts down
└──────┬───────┘
       │
       ├─────────────────────┐
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│  /verify/:id │      │ Time Expired │
│ (Upload Photo)│     │              │
└──────┬───────┘      └──────┬───────┘
       │                     │
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│ AI Verification       │  /lost/:id  │
│ verifySuccess()│      │ (Penalty)   │
└──────┬───────┘      └──────────────┘
       ▼
┌──────────────┐
│  /result/:id │
│ (Withdraw + NFT)│
└──────────────┘
```

### Key Sync Mechanisms

#### 1. Firestore Real-time Listener

```javascript
const q = query(
  collection(db, "touchgrass_challenges"),
  where("walletAddress", "==", walletAddress.toLowerCase())
);
onSnapshot(q, (snapshot) => {
  const loaded = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  setChallenges(loaded);
});
```

#### 2. Challenge Recovery (Orphaned Challenges)

If a challenge creation succeeds on-chain but Firestore write fails, the recovery system scans `ChallengeCreated` events:

```javascript
const filter = contract.filters.ChallengeCreated(null, walletAddress);
const events = await contract.queryFilter(filter);
// Restore missing challenges from event data
```

#### 3. Chain State Sync

Periodically polls contract to sync `isSuccess` and `isWithdrawn` flags:

```javascript
setInterval(async () => {
  const c = await contract.challenges(challenge.onChainId);
  if (c.isWithdrawn && !challenge.isWithdrawn) {
    await updateDoc(...);
  }
}, 5000);
```

---

## Verification Server

### Architecture

A Node.js/Express server handling:

1. Image upload to Cloudinary (done by frontend)
2. AI analysis via GPT-4o Vision
3. On-chain verification transaction

### API Endpoint

**POST `/api/verify`**

```javascript
// Request
{
  "challengeId": "123",      // On-chain challenge ID
  "title": "Run 5km",        // Challenge objective
  "imageUrl": "https://..."  // Cloudinary URL of proof image
}

// Success Response
{
  "success": true,
  "txHash": "0x..."
}

// Failure Response
{
  "success": false,
  "message": "AI could not verify the objective based on the photo provided."
}
```

### AI Prompt Engineering

The system prompt instructs GPT-4o to:

1. **Accept diverse evidence types**: App screenshots, physical photos, hardware displays
2. **Require clear metrics**: For metric-based goals, visible numbers are mandatory
3. **Reject ambiguous evidence**: Blurry images, unrelated content, stock photos
4. **Answer YES/NO only**: Binary decision for clear programmatic handling

### Verification Flow

```
Frontend                    Server                      Blockchain
    │                          │                            │
    │──POST /api/verify───────▶│                            │
    │                          │──GPT-4o Vision call──────▶ │
    │                          │◀─────YES/NO response────── │
    │                          │                            │
    │                          │ (if YES)                   │
    │                          │──verifySuccess(id)────────▶│
    │                          │◀───────TX receipt──────────│
    │◀─────{success: true}─────│                            │
```

---

## Data Models

### Firestore Challenge Document

```javascript
{
  // Identifiers
  id: "firestore-doc-id",
  onChainId: "123",
  walletAddress: "0x123...abc",

  // Challenge Details
  title: "Run 5km",
  targetTime: 1702500000000,      // End time (Unix ms)
  durationValue: 24,
  durationUnit: "hours",

  // Stake Configuration
  stakeAmount: "5.00",            // String for precision
  token: "USDC",
  tokenDecimals: 6,

  // Penalty Configuration
  penaltyType: "charity",         // charity | dev | lock | burn
  penaltyPercent: 100,

  // State Flags
  isSuccess: false,
  isWithdrawn: false,

  // Transaction Hashes
  creationTxHash: "0x...",
  withdrawalTxHash: "0x...",      // If withdrawn

  // Timestamps
  createdAt: 1702413600000,
  completedAt: 1702450000000,     // If verified

  // Optional Donation
  voluntaryDonationPercent: 10,
  donationTarget: "charity"
}
```

### Token Configuration

```javascript
const TOKEN_CONFIG = {
  ETH: {
    symbol: "ETH",
    decimals: 18,
    address: null, // Native token
    icon: "Ξ",
    isNative: true,
  },
  USDC: {
    symbol: "USDC",
    decimals: 6,
    address: "0x...",
    icon: "$",
    isNative: false,
  },
};
```

### Preset Objectives

```javascript
const OBJECTIVES = [
  { id: 1, title: "Run 5km", icon: "🏃‍♂️", defaultTime: 24 },
  { id: 2, title: "Drink 3L Water", icon: "💧", defaultTime: 12 },
  // ... 18 total objectives across categories:
  // Physical Health, Mental Clarity, Digital Detox, Productivity
];
```

---

## Security & Trust Model

### Non-Custodial Design

1. **User Controls Keys**: All transactions require wallet signature
2. **Smart Contract Escrow**: Funds held on-chain, not in databases
3. **Deterministic Outcomes**: Contract logic enforces rules without admin intervention

### Access Control

| Role     | Capabilities                                     |
| -------- | ------------------------------------------------ |
| Staker   | Create challenges, withdraw (if eligible)        |
| Verifier | Call `verifySuccess()` to mark completion        |
| Owner    | Update fees, add tokens, pause contract          |
| Anyone   | Call `sweepPenalty()` on expired 100% challenges |

### Security Measures

- **ReentrancyGuard**: Prevents reentrancy attacks on withdrawals
- **Ownable2Step**: Two-step ownership transfer for safety
- **Pausable**: Emergency stop capability
- **SafeERC20**: Safe token transfers
- **Price Feed Staleness**: Rejects stale oracle data

### Trust Assumptions

1. **AI Verifier**: Server must be honest (signs successful verifications)
2. **Firebase**: Off-chain data is convenience, not source of truth
3. **Oracles**: Chainlink price feeds assumed accurate

---

## Deployment & Configuration

### Environment Variables

**Frontend (`.env`)**

```bash
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset
```

**Server (`server/.env`)**

```bash
RPC_URL=https://mainnet.base.org
VERIFIER_PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
OPENROUTER_API_KEY=sk-...
SITE_URL=https://touchgrass.app
SITE_NAME=TouchGrass
```

### Contract Deployment

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy (modify script for target network)
npx hardhat run scripts/deploy.js --network base
```

### Frontend Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## API Reference

### Contract Read Functions

| Function                    | Parameters  | Returns                        |
| --------------------------- | ----------- | ------------------------------ |
| `challenges(uint256)`       | challengeId | Challenge struct               |
| `calculateTokenFee(string)` | symbol      | Fee in token's smallest unit   |
| `calculateMinStake(string)` | symbol      | Minimum stake in smallest unit |
| `tokenConfigs(bytes32)`     | tokenId     | TokenConfig struct             |

### Contract Write Functions

| Function          | Parameters                                            | Description                        |
| ----------------- | ----------------------------------------------------- | ---------------------------------- |
| `createChallenge` | symbol, amount, duration, penaltyType, penaltyPercent | Create challenge + lock stake      |
| `verifySuccess`   | challengeId                                           | Mark as successful (verifier only) |
| `withdraw`        | challengeId, donationPercent, donationTarget          | Claim funds                        |
| `sweepPenalty`    | challengeId                                           | Execute 100% penalty               |

### NFT Contract

| Function    | Parameters  | Description                               |
| ----------- | ----------- | ----------------------------------------- |
| `mintBadge` | challengeId | Mint victory NFT for successful challenge |

---

## Troubleshooting & Recovery

### Common Issues

| Issue                            | Cause                            | Solution                   |
| -------------------------------- | -------------------------------- | -------------------------- |
| Challenge missing from dashboard | Firestore write failed           | Wait 30s for auto-recovery |
| "Recovered Challenge #123" title | Restored from chain, no metadata | Rename using edit button   |
| AI rejects valid proof           | Image unclear or insufficient    | Retry with better evidence |
| Can't withdraw                   | Insufficient gas                 | Add small ETH for tx fee   |
| "TokenNotSupported" error        | Token not added to contract      | Use ETH or USDC            |

### Recovery System Details

The frontend implements three recovery mechanisms:

1. **Event Scanning**: On wallet connect, scans all `ChallengeCreated` events for user
2. **State Polling**: Every 5 seconds, checks contract state for active challenges
3. **Reconciliation**: Compares local state to chain state, updates discrepancies

### Emergency Procedures

In case of critical issues:

1. **Contract Pause**: Owner can pause all operations
2. **Token Recovery**: Owner can recover stuck tokens (not user stakes)
3. **Price Fallback**: If oracle fails, contract uses configured fallback prices

---

## Appendix: Motivational Quotes

The app includes 119 motivational quotes displayed during active challenges, rotating every 10 seconds. Examples:

- _"The discipline you dodge is the growth you lose."_
- _"We suffer more often in imagination than in reality."_ – Seneca
- _"Bet on yourself, then prove yourself right."_
- _"Consistency beats intensity."_

Quotes are stored in `/src/data/quotes.json` and mix Stoic philosophy, fitness motivation, and TouchGrass-specific accountability mantras.

---

_Document Version: 1.0_  
_Last Updated: December 2025_
