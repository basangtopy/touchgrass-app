import { useState, useEffect, useCallback } from "react";
import { Contract, formatUnits } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../data/contractConfig";
import {
  ERC20_ABI,
  getTokenConfig,
  getTokenDecimals,
  getKnownTokenSymbols,
} from "../data/tokenConfig";

/**
 * useTokenPricing - Manages token pricing, wallet balance, and pending withdrawals
 *
 * This hook fetches token fees, min stakes, wallet balances for the selected token,
 * and checks for any pending withdrawals from failed transfers.
 */
export function useTokenPricing({
  walletConnected,
  walletAddress,
  signer,
  selectedToken,
  showNotification,
  setIsProcessing,
}) {
  // Token pricing state
  const [tokenFee, setTokenFee] = useState("0");
  const [tokenMinStake, setTokenMinStake] = useState("0");
  const [supportedTokens] = useState(getKnownTokenSymbols());

  // Wallet balance for selected token
  const [walletBalance, setWalletBalance] = useState("0.00");

  // Pending withdrawals from failed transfers
  const [pendingWithdrawals, setPendingWithdrawals] = useState({});

  // Fetch token pricing from contract
  useEffect(() => {
    const fetchTokenPricing = async () => {
      if (!signer || !selectedToken) return;

      try {
        const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        const [fee, minStake] = await Promise.all([
          contract.calculateTokenFee(selectedToken),
          contract.calculateMinStake(selectedToken),
        ]);

        const decimals = getTokenDecimals(selectedToken);
        setTokenFee(formatUnits(fee, decimals));
        setTokenMinStake(formatUnits(minStake, decimals));
      } catch (error) {
        console.error("Error fetching token pricing:", error);
        // Fallback to sensible defaults
        if (selectedToken === "ETH") {
          setTokenFee("0.0002");
          setTokenMinStake("0.0004");
        } else {
          setTokenFee("0.50");
          setTokenMinStake("1.00");
        }
      }
    };

    fetchTokenPricing();
  }, [signer, selectedToken]);

  // Fetch wallet balance for selected token
  const fetchBalance = useCallback(async () => {
    if (!walletConnected || !walletAddress || !signer) return;

    try {
      const tokenConfig = getTokenConfig(selectedToken);

      if (!tokenConfig) {
        console.error(`Unknown token: ${selectedToken}`);
        setWalletBalance("0.00");
        return;
      }

      if (tokenConfig.isNative) {
        // Native ETH balance
        const bal = await signer.provider.getBalance(walletAddress);
        setWalletBalance(formatUnits(bal, tokenConfig.decimals));
      } else {
        // ERC20 token balance
        const tokenContract = new Contract(
          tokenConfig.address,
          ERC20_ABI,
          signer
        );
        try {
          const bal = await tokenContract.balanceOf(walletAddress);
          setWalletBalance(formatUnits(bal, tokenConfig.decimals));
        } catch (e) {
          showNotification?.(
            `${selectedToken} not available on this network`,
            "error"
          );
          setWalletBalance("0.00");
        }
      }
    } catch (e) {
      showNotification?.("Balance fetch error", "error");
      console.error("Balance fetch error:", e);
      setWalletBalance("0.00");
    }
  }, [walletConnected, walletAddress, selectedToken, signer, showNotification]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Check for pending withdrawals from failed transfers
  const checkPendingWithdrawals = useCallback(async () => {
    if (!walletConnected || !walletAddress || !signer) {
      setPendingWithdrawals({});
      return;
    }

    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const [symbols, amounts] = await contract.getAllPendingWithdrawals(
        walletAddress,
        0,
        10
      );

      const pending = {};
      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        const amount = amounts[i];
        if (amount > 0) {
          const decimals = getTokenDecimals(symbol);
          pending[symbol] = formatUnits(amount, decimals);
        }
      }
      setPendingWithdrawals(pending);
    } catch (error) {
      console.error("Error checking pending withdrawals:", error);
      setPendingWithdrawals({});
    }
  }, [walletConnected, walletAddress, signer]);

  useEffect(() => {
    checkPendingWithdrawals();
    const interval = setInterval(checkPendingWithdrawals, 30000);
    return () => clearInterval(interval);
  }, [checkPendingWithdrawals]);

  // Claim a pending withdrawal
  const claimPendingWithdrawal = async (tokenSymbol) => {
    if (!signer || !walletAddress) return;

    setIsProcessing?.(true);
    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.claimPendingWithdrawal(tokenSymbol, {
        gasLimit: 100000,
      });

      showNotification?.(`Claiming your ${tokenSymbol}...`, "success");
      await tx.wait();

      showNotification?.(
        `Successfully claimed your ${tokenSymbol}! 💰`,
        "success"
      );
      await checkPendingWithdrawals();
      fetchBalance();
    } catch (error) {
      console.error("Claim pending withdrawal error:", error);
      if (error.message?.includes("NoPendingWithdrawal")) {
        showNotification?.("No pending withdrawal found", "error");
      } else if (error.message?.includes("user rejected")) {
        showNotification?.("Transaction cancelled", "error");
      } else {
        showNotification?.(
          error.reason || "Failed to claim funds – please try again",
          "error"
        );
      }
    } finally {
      setIsProcessing?.(false);
    }
  };

  return {
    // Token pricing
    tokenFee,
    tokenMinStake,
    supportedTokens,

    // Wallet balance
    walletBalance,
    fetchBalance,

    // Pending withdrawals
    pendingWithdrawals,
    checkPendingWithdrawals,
    claimPendingWithdrawal,
  };
}
