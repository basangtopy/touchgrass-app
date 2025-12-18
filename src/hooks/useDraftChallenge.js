import { useState } from "react";

/**
 * useDraftChallenge - Manages the draft state for creating a new challenge
 *
 * This hook encapsulates all the form state needed when a user is setting up
 * a new challenge before submitting it to the blockchain.
 */
export function useDraftChallenge() {
  // Objective & Title
  const [draftObjective, setDraftObjective] = useState(null);
  const [draftCustomTitle, setDraftCustomTitle] = useState("");

  // Duration
  const [draftCustomTime, setDraftCustomTime] = useState(24);
  const [draftDurationUnit, setDraftDurationUnit] = useState("hours");

  // Staking
  const [draftStakeAmount, setDraftStakeAmount] = useState(1);
  const [draftToken, setDraftToken] = useState("USDC");

  // Penalty
  const [draftPenaltyType, setDraftPenaltyType] = useState("charity");
  const [draftPenaltyPercent, setDraftPenaltyPercent] = useState(100);

  // Reset all draft state to defaults
  const resetDraft = () => {
    setDraftObjective(null);
    setDraftCustomTitle("");
    setDraftCustomTime(24);
    setDraftDurationUnit("hours");
    setDraftStakeAmount(1);
    setDraftToken("USDC");
    setDraftPenaltyType("charity");
    setDraftPenaltyPercent(100);
  };

  return {
    // State
    draftObjective,
    draftCustomTitle,
    draftCustomTime,
    draftDurationUnit,
    draftStakeAmount,
    draftToken,
    draftPenaltyType,
    draftPenaltyPercent,

    // Setters
    setDraftObjective,
    setDraftCustomTitle,
    setDraftCustomTime,
    setDraftDurationUnit,
    setDraftStakeAmount,
    setDraftToken,
    setDraftPenaltyType,
    setDraftPenaltyPercent,

    // Actions
    resetDraft,
  };
}
