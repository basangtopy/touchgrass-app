/**
 * Test constants and configuration values
 */

// Time constants (in seconds)
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Fee constants (USDC has 6 decimals)
const DEFAULT_FEE = 500000n; // 0.5 USDC
const DEFAULT_MIN_STAKE = 1000000n; // 1 USDC

// Price feed decimals
const PRICE_FEED_DECIMALS = 8;

// Default prices (8 decimals for Chainlink)
const ETH_PRICE = 3000_00000000n; // $3000
const USDC_PRICE = 1_00000000n; // $1

// Token decimals
const ETH_DECIMALS = 18;
const USDC_DECIMALS = 6;

// Penalty types enum
const PenaltyType = {
  CHARITY: 0,
  DEV: 1,
  LOCK: 2,
  BURN: 3,
};

// Duration bounds
const MIN_DURATION = 1 * MINUTE;
const MAX_DURATION = 365 * DAY;
const ABSOLUTE_MIN_DURATION = 1 * MINUTE;
const ABSOLUTE_MAX_DURATION = 730 * DAY;

// Grace period
const DEFAULT_GRACE_PERIOD = 7 * DAY;
const MAX_GRACE_PERIOD = 30 * DAY;

// Lock multiplier
const DEFAULT_LOCK_MULTIPLIER = 5;
const MIN_LOCK_MULTIPLIER = 3;
const MAX_LOCK_MULTIPLIER = 15;

// Penalty percentages
const DEFAULT_MIN_PENALTY_PERCENT = 20;
const ABSOLUTE_MIN_PENALTY = 5;
const ABSOLUTE_MAX_MIN_PENALTY = 50;

// Ownership delays
const OWNERSHIP_TRANSFER_DELAY = 48 * HOUR;
const OWNERSHIP_RENUNCIATION_DELAY = 7 * DAY;

// Fee update delay
const FEE_UPDATE_DELAY = 24 * HOUR;

// Verification buffer
const VERIFICATION_BUFFER = 15 * MINUTE;

// Gas stipend for ETH transfers
const GAS_STIPEND = 2300;

// Dead address for burns
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

module.exports = {
  MINUTE,
  HOUR,
  DAY,
  DEFAULT_FEE,
  DEFAULT_MIN_STAKE,
  PRICE_FEED_DECIMALS,
  ETH_PRICE,
  USDC_PRICE,
  ETH_DECIMALS,
  USDC_DECIMALS,
  PenaltyType,
  DEFAULT_MIN_PENALTY_PERCENT,
  ABSOLUTE_MIN_PENALTY,
  ABSOLUTE_MAX_MIN_PENALTY,
  MIN_DURATION,
  MAX_DURATION,
  ABSOLUTE_MIN_DURATION,
  ABSOLUTE_MAX_DURATION,
  DEFAULT_GRACE_PERIOD,
  MAX_GRACE_PERIOD,
  DEFAULT_LOCK_MULTIPLIER,
  MIN_LOCK_MULTIPLIER,
  MAX_LOCK_MULTIPLIER,
  OWNERSHIP_TRANSFER_DELAY,
  OWNERSHIP_RENUNCIATION_DELAY,
  FEE_UPDATE_DELAY,
  VERIFICATION_BUFFER,
  GAS_STIPEND,
  DEAD_ADDRESS,
};
