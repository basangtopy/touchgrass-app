import { useState, useEffect, useCallback, useRef } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Contract, formatUnits } from "ethers";

import { Routes, Route, useNavigate, useLocation } from "react-router-dom";

// WAGMI & RAINBOWKIT IMPORTS
import { useAccount, useDisconnect } from "wagmi";
import { useEthersSigner } from "./utils/ethersAdapter";
import {
  HeaderConnectButton,
  HomeConnectButton,
} from "./components/ui/CustomConnectButton";

// Custom Hooks
import { useDraftChallenge } from "./hooks/useDraftChallenge";

import { auth, db } from "./firebase";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./data/contractConfig";
import {
  ERC20_ABI,
  getTokenConfig,
  getTokenDecimals,
  isNativeToken,
  getKnownTokenSymbols,
} from "./data/tokenConfig";
import { generateQuote } from "./data/constants";
import { parseTokenAmount } from "./utils/helpers";
import { useIdentity } from "./hooks/useIdentity";

import Header from "./components/Header";
import Home from "./views/Home";
import ObjectiveSelection from "./views/ObjectiveSelection";
import Staking from "./views/Staking";
import ActiveChallenge from "./views/ActiveChallenge";
import Verify from "./views/Verify";
import Lost from "./views/Lost";
import Result from "./views/Result";
import Notification from "./components/ui/Notification";
import Documentation from "./views/Documentation";
import OnboardingModal from "./components/OnboardingModal";

export default function TouchGrass() {
  // ROUTER HOOKS
  const navigate = useNavigate();
  const location = useLocation();

  const setStep = (stepName) => {
    if (stepName === "home") navigate("/");
    else navigate(`/${stepName}`);
  };

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]); // Runs whenever path changes

  // WAGMI HOOKS
  const { address, isConnected } = useAccount();
  useDisconnect(); // Keep hook mounted but no need for disconnect fn
  const signer = useEthersSigner();

  // Sync local state with Wagmi state
  const [walletConnected, setWalletConnected] = useState(false);
  const [basename, setBasename] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);

  const identity = useIdentity(address);
  const displayName = identity.name;

  useEffect(() => {
    setWalletConnected(isConnected);
    if (isConnected && address) {
      setWalletAddress(address.toLowerCase());
      setBasename(displayName);
    } else {
      setWalletAddress(null);
      setBasename(null);
      setChallenges([]); // Clear data on disconnect
      if (location.pathname !== "/" && location.pathname !== "/docs") {
        navigate("/");
      }
    }
  }, [isConnected, address, displayName, location.pathname, navigate]);

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [ethPrice, setEthPrice] = useState(3000);
  const [user, setFirebaseUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState("0.00");

  // Dynamic pricing from contract
  const [tokenFee, setTokenFee] = useState("0");
  const [tokenMinStake, setTokenMinStake] = useState("0");
  const [supportedTokens, setSupportedTokens] = useState(
    getKnownTokenSymbols()
  );

  // Pending withdrawals from failed transfers
  const [pendingWithdrawals, setPendingWithdrawals] = useState({});

  // Draft State (from useDraftChallenge hook)
  const {
    draftObjective,
    draftCustomTitle,
    draftCustomTime,
    draftDurationUnit,
    draftStakeAmount,
    draftToken,
    draftPenaltyType,
    draftPenaltyPercent,
    setDraftObjective,
    setDraftCustomTitle,
    setDraftCustomTime,
    setDraftDurationUnit,
    setDraftStakeAmount,
    setDraftToken,
    setDraftPenaltyType,
    setDraftPenaltyPercent,
    resetDraft,
  } = useDraftChallenge();

  // Active Interaction State
  const [verificationStatus, setVerificationStatus] = useState("idle");
  const [resultDonationPercent, setResultDonationPercent] = useState(0);
  const [quote, setQuote] = useState(generateQuote());

  const isReconciling = useRef(false);

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type });
  }, []);

  // --- 1. Database Sync ---
  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, setFirebaseUser);
  }, []);

  useEffect(() => {
    if (!user || !walletAddress) {
      setChallenges([]);
      return;
    }
    const q = query(
      collection(db, "touchgrass_challenges"),
      where("walletAddress", "==", walletAddress.toLowerCase())
    );
    setChallengesLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.createdAt - a.createdAt);
      setChallenges(loaded);
      setChallengesLoading(false);
    });
    return () => unsubscribe();
  }, [user, walletAddress]);

  // --- 2. Fetch Token Pricing from Contract ---
  useEffect(() => {
    const fetchTokenPricing = async () => {
      if (!signer || !draftToken) return;

      try {
        const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        // Fetch fee and minStake from contract (these are view functions - FREE!)
        const [fee, minStake] = await Promise.all([
          contract.calculateTokenFee(draftToken),
          contract.calculateMinStake(draftToken),
        ]);

        const decimals = getTokenDecimals(draftToken);
        setTokenFee(formatUnits(fee, decimals));
        setTokenMinStake(formatUnits(minStake, decimals));
      } catch (error) {
        console.error("Error fetching token pricing:", error);
        // Fallback to sensible defaults
        if (draftToken === "ETH") {
          setTokenFee("0.0002");
          setTokenMinStake("0.0004");
        } else {
          setTokenFee("0.50");
          setTokenMinStake("1.00");
        }
      }
    };

    fetchTokenPricing();
  }, [signer, draftToken]);

  // --- 3. FETCH BALANCE ---
  const fetchBalance = useCallback(async () => {
    if (!walletConnected || !walletAddress || !signer) return;

    try {
      const tokenConfig = getTokenConfig(draftToken);

      if (!tokenConfig) {
        console.error(`Unknown token: ${draftToken}`);
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
          showNotification(
            `${draftToken} not available on this network`,
            "error"
          );
          setWalletBalance("0.00");
        }
      }
    } catch (e) {
      showNotification("Balance fetch error", "error");
      console.error("Balance fetch error:", e);
      setWalletBalance("0.00");
    }
  }, [walletConnected, walletAddress, draftToken, signer, showNotification]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // --- 3b. CHECK PENDING WITHDRAWALS (from failed transfers) ---
  const checkPendingWithdrawals = useCallback(async () => {
    if (!walletConnected || !walletAddress || !signer) {
      setPendingWithdrawals({});
      return;
    }

    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      // Get pending withdrawals for all tokens (up to 10 tokens, starting from index 0)
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
    // Also check periodically (every 30 seconds)
    const interval = setInterval(checkPendingWithdrawals, 30000);
    return () => clearInterval(interval);
  }, [checkPendingWithdrawals]);

  // --- 3c. CLAIM PENDING WITHDRAWAL ---
  const claimPendingWithdrawal = async (tokenSymbol) => {
    if (!signer || !walletAddress) return;

    setIsProcessing(true);
    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.claimPendingWithdrawal(tokenSymbol, {
        gasLimit: 100000,
      });

      showNotification(`Claiming your ${tokenSymbol}...`, "success");
      await tx.wait();

      showNotification(
        `Successfully claimed your ${tokenSymbol}! 💰`,
        "success"
      );
      // Refresh pending withdrawals and balance
      await checkPendingWithdrawals();
      fetchBalance();
    } catch (error) {
      console.error("Claim pending withdrawal error:", error);
      if (error.message?.includes("NoPendingWithdrawal")) {
        showNotification("No pending withdrawal found", "error");
      } else if (error.message?.includes("user rejected")) {
        showNotification("Transaction cancelled", "error");
      } else {
        showNotification(
          error.reason || "Failed to claim funds – please try again",
          "error"
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 4. RECOVERY SYSTEM ---
  useEffect(() => {
    const reconcileChallenges = async () => {
      if (
        !walletConnected ||
        !walletAddress ||
        !user ||
        isReconciling.current ||
        !signer
      )
        return;
      isReconciling.current = true;

      try {
        const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        const filter = contract.filters.ChallengeCreated(null, walletAddress);

        // Query only recent blocks to avoid "exceeds max block range" RPC errors
        // Most RPC providers limit queries to ~100,000 blocks
        const currentBlock = await signer.provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 99000); // ~99k blocks to stay under limit
        const events = await contract.queryFilter(filter, fromBlock, "latest");

        for (const event of events) {
          try {
            const onChainId = event.args[0].toString();
            let exists = challenges.some((c) => c.onChainId === onChainId);

            if (!exists) {
              const q = query(
                collection(db, "touchgrass_challenges"),
                where("onChainId", "==", onChainId)
              );
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) exists = true;
            }

            if (!exists) {
              console.debug(
                `Found orphaned challenge #${onChainId}, attempting recovery...`
              );
              const c = await contract.challenges(onChainId);

              // Extract struct fields with fallback indices matching TouchGrass.sol Challenge struct
              // Struct order: staker[0], penaltyPercent[1], penaltyType[2], isSuccess[3], isWithdrawn[4],
              //               lockMultiplierSnapshot[5], gracePeriodSnapshot[6], tokenId[7], stakeAmount[8],
              //               duration[9], startTime[10]
              const tokenId = c.tokenId !== undefined ? c.tokenId : c[7];
              const duration = c.duration !== undefined ? c.duration : c[9];
              const chainStartTime =
                c.startTime !== undefined ? c.startTime : c[10];
              const stakeAmount =
                c.stakeAmount !== undefined ? c.stakeAmount : c[8];
              const penaltyType =
                c.penaltyType !== undefined ? c.penaltyType : c[2];
              const penaltyPercent =
                c.penaltyPercent !== undefined ? c.penaltyPercent : c[1];
              const isSuccess = c.isSuccess !== undefined ? c.isSuccess : c[3];
              const isWithdrawn =
                c.isWithdrawn !== undefined ? c.isWithdrawn : c[4];

              // Reverse-lookup token symbol from tokenId using contract's tokenSymbols mapping
              const tokenSymbol = await contract.tokenSymbols(tokenId);
              const decimals = getTokenDecimals(tokenSymbol);

              const durationMs = Number(duration) * 1000;
              const startTime = Number(chainStartTime) * 1000;
              const targetTime = startTime + durationMs;

              const recoveredChallenge = {
                walletAddress: walletAddress.toLowerCase(),
                onChainId: onChainId,
                title: `Recovered Challenge #${onChainId}`,
                targetTime: targetTime,
                durationValue: Number(duration) / 3600,
                durationUnit: "hours",
                stakeAmount: formatUnits(stakeAmount, decimals),
                token: tokenSymbol,
                tokenDecimals: decimals,
                penaltyType: ["charity", "dev", "lock", "burn"][
                  Number(penaltyType)
                ],
                penaltyPercent: Number(penaltyPercent),
                isSuccess: isSuccess,
                isWithdrawn: isWithdrawn,
                creationTxHash: event.transactionHash,
                createdAt: startTime,
                status: "active",
              };

              await addDoc(
                collection(db, "touchgrass_challenges"),
                recoveredChallenge
              );
              showNotification(
                `Recovered missing challenge #${onChainId}`,
                "success"
              );
            }
          } catch (innerError) {
            // Non-critical: individual challenge recovery failed, continue with others
            console.debug("Challenge recovery skipped:", innerError.message);
          }
        }
      } catch (e) {
        console.error("Reconciliation Error:", e);
      } finally {
        isReconciling.current = false;
      }
    };

    if (walletConnected) reconcileChallenges();
    const interval = setInterval(reconcileChallenges, 30000);
    return () => clearInterval(interval);
  }, [walletConnected, walletAddress, user, challenges.length, signer]);

  // --- 5. Chain Sync ---
  useEffect(() => {
    const checkContractState = async () => {
      if (!walletConnected || challenges.length === 0 || !signer) return;

      const activeLocalChallenges = challenges.filter(
        (c) => !c.isSuccess && !c.isWithdrawn
      );

      try {
        const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        for (const challenge of activeLocalChallenges) {
          if (!challenge.onChainId) return;

          const c = await contract.challenges(challenge.onChainId);
          const isSuccessChain = c.isSuccess !== undefined ? c.isSuccess : c[3];
          const isWithdrawnChain =
            c.isWithdrawn !== undefined ? c.isWithdrawn : c[4];

          const updates = {};
          if (isSuccessChain && !challenge.isSuccess) updates.isSuccess = true;
          if (isWithdrawnChain && !challenge.isWithdrawn)
            updates.isWithdrawn = true;

          if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, "touchgrass_challenges", challenge.id), {
              ...updates,
            });
          }
        }
      } catch (e) {
        // Silent fail for background sync - non-critical operation
        console.debug("Chain sync check failed:", e.message);
      }
    };
    const interval = setInterval(checkContractState, 5000);
    return () => clearInterval(interval);
  }, [walletConnected, challenges, signer]);

  // --- 6. Timers ---
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Note: Expiry is handled by individual components (ActiveChallenge, etc.)
  // The 1-second currentTime update triggers re-renders that update UI automatically

  useEffect(() => {
    if (location.pathname.startsWith("/active")) {
      const interval = setInterval(() => setQuote(generateQuote()), 10000);
      return () => clearInterval(interval);
    }
  }, [location.pathname]);

  // --- Actions ---
  const updateChallengeStatus = async (id, status, extraData = {}) => {
    try {
      await updateDoc(doc(db, "touchgrass_challenges", id), {
        status,
        ...extraData,
      });
    } catch (e) {
      showNotification(`${e}`, "error");
      console.error(e);
    }
  };

  const confirmStartChallenge = async () => {
    if (!walletConnected || !signer) return;

    // Validate input
    if (draftCustomTitle === "" && draftObjective === null) {
      showNotification("Oops! Don't forget to set your goal first 🎯", "error");
      return;
    }

    if (parseFloat(walletBalance) < parseFloat(draftStakeAmount)) {
      showNotification("Not enough funds – top up or stake less", "error");
      return;
    }

    const minRequired = parseFloat(tokenMinStake);
    if (parseFloat(draftStakeAmount) < minRequired) {
      showNotification(
        `Minimum commitment: ${minRequired} ${draftToken}. Go big or go home! 💪`,
        "error"
      );
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tokenConfig = getTokenConfig(draftToken);
      const penaltyMap = { charity: 0, dev: 1, lock: 2, burn: 3 };

      // Parse stake amount to wei/smallest unit
      const stakeWei = parseTokenAmount(draftStakeAmount, draftToken);

      // Calculate duration in seconds
      let durationMs = 0;
      const timeValue = draftObjective
        ? draftObjective.defaultTime
        : draftCustomTime;
      const unit = draftObjective ? "hours" : draftDurationUnit;
      if (unit === "minutes") durationMs = timeValue * 60 * 1000;
      else if (unit === "hours") durationMs = timeValue * 60 * 60 * 1000;
      else if (unit === "days") durationMs = timeValue * 24 * 60 * 60 * 1000;
      const durationSeconds = Math.floor(durationMs / 1000);

      let txValue = 0;

      if (tokenConfig.isNative) {
        // ETH: Calculate total payment (stake + fee calculated on-chain)
        const feeWei = await contract.calculateTokenFee(draftToken);
        txValue = stakeWei + feeWei;
      } else {
        // ERC20: Approve total amount (stake + fee)
        const feeWei = await contract.calculateTokenFee(draftToken);
        const totalAmount = stakeWei + feeWei;

        const tokenContract = new Contract(
          tokenConfig.address,
          ERC20_ABI,
          signer
        );

        const allowance = await tokenContract.allowance(
          walletAddress,
          CONTRACT_ADDRESS
        );

        if (allowance < totalAmount) {
          showNotification(
            "One quick signature to approve – almost there!",
            "success"
          );
          const approveTx = await tokenContract.approve(
            CONTRACT_ADDRESS,
            totalAmount
          );
          await approveTx.wait();
          showNotification(
            "Approved! Locking in your commitment...",
            "success"
          );
        }
      }

      // createChallenge(symbol, stakeAmount, duration, penaltyType, penaltyPercent)
      const tx = await contract.createChallenge(
        draftToken, // Token symbol as string
        stakeWei, // Stake amount in smallest unit
        durationSeconds, // Duration in seconds
        penaltyMap[draftPenaltyType], // Penalty type enum
        draftPenaltyPercent, // Penalty percentage
        { value: txValue, gasLimit: 300000 }
      );

      const receipt = await tx.wait();

      // Parse ChallengeCreated event to get the on-chain ID
      let onChainId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed.name === "ChallengeCreated") {
            onChainId = parsed.args[0].toString();
            break;
          }
        } catch (e) {
          /* ignore non-contract logs */
        }
      }

      // Create Firestore document
      const newChallenge = {
        walletAddress: walletAddress.toLowerCase(),
        onChainId,
        title: draftObjective ? draftObjective.title : draftCustomTitle,
        targetTime: Date.now() + durationMs,
        durationValue: timeValue,
        durationUnit: unit,
        stakeAmount: draftStakeAmount.toString(), // String for Firestore precision
        token: draftToken, // Store token symbol
        tokenDecimals: tokenConfig.decimals, // Store decimals for recovery
        penaltyType: draftPenaltyType,
        penaltyPercent: draftPenaltyPercent,
        isSuccess: false,
        isWithdrawn: false,
        creationTxHash: tx.hash,
        createdAt: Date.now(),
      };

      try {
        const docRef = await addDoc(
          collection(db, "touchgrass_challenges"),
          newChallenge
        );
        navigate(`/active/${docRef.id}`);
        showNotification("Let's go! Your challenge is live 🔥");
        fetchBalance();
      } catch (dbError) {
        console.error("DB Write Failed but Chain Success:", dbError);
        showNotification("Committed! Syncing your challenge now...", "success");
        navigate("/");
      }
    } catch (error) {
      console.error(error);
      if (error.message?.includes("user rejected")) {
        showNotification(
          "You cancelled – no worries, try again when ready",
          "error"
        );
      } else if (error.message?.includes("TokenNotSupported")) {
        showNotification(
          `${draftToken} isn't available on Base yet – try ETH or USDC`,
          "error"
        );
      } else {
        showNotification(
          error.message || "Something went wrong – please try again",
          "error"
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (
    id,
    donationPercent = 0,
    donationTarget = "charity"
  ) => {
    const challenge = challenges.find((c) => c.id === id);
    if (!challenge || !signer) return;
    setIsProcessing(true);
    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const donationTargetEnum = donationTarget === "dev" ? 1 : 0;

      let tx;
      const isExpired = Date.now() > challenge.targetTime;
      const isFullPenalty =
        challenge.penaltyType === "burn" || challenge.penaltyPercent === 100;

      if (
        isExpired &&
        isFullPenalty &&
        !challenge.isSuccess &&
        challenge.penaltyType !== "lock"
      ) {
        tx = await contract.sweepPenalty(challenge.onChainId, {
          gasLimit: 200000,
        });
      } else {
        tx = await contract.withdraw(
          challenge.onChainId,
          Math.floor(donationPercent),
          donationTargetEnum,
          { gasLimit: 200000 }
        );
      }

      await tx.wait();

      await updateDoc(doc(db, "touchgrass_challenges", id), {
        isWithdrawn: true,
        withdrawalTxHash: tx.hash,
        voluntaryDonationPercent: donationPercent,
        donationTarget: donationTarget,
        completedAt: Date.now(),
      });
      showNotification("Done! Your funds are on their way 💰", "success");
      fetchBalance();
    } catch (error) {
      console.error(error);
      if (error.message.includes("locked"))
        showNotification("Your funds are still in timeout ⏳", "error");
      else if (error.message.includes("active"))
        showNotification(
          "Your challenge is still running – keep going!",
          "error"
        );
      else
        showNotification("Transaction didn't go through – try again", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async (
    id,
    isExternalSuccess = false,
    errorMessage = ""
  ) => {
    setVerificationStatus("verifying");
    if (isExternalSuccess === true) {
      setVerificationStatus("success");
      await updateDoc(doc(db, "touchgrass_challenges", id), {
        isSuccess: true,
        completedAt: Date.now(),
      });

      setTimeout(() => navigate(`/result/${id}`), 1000);
      showNotification("AI verified! You crushed it! 🎉", "success");
      return;
    }
    if (isExternalSuccess === false && errorMessage) {
      setVerificationStatus("failed");
      showNotification(errorMessage, "error");
      return;
    }
    setVerificationStatus("failed");
  };

  const retryVerification = () => setVerificationStatus("idle");

  const initNewChallenge = () => {
    resetDraft();
    setVerificationStatus("idle");
    navigate("/objective");
  };
  const openChallenge = (id) => {
    const c = challenges.find((ch) => ch.id === id);
    if (!c) return;
    // setActiveChallengeId(id);
    setVerificationStatus("idle");
    setResultDonationPercent(0);
    if (c.isSuccess) navigate(`/result/${id}`);
    else if (c.isWithdrawn) navigate(`/lost/${id}`);
    else if (Date.now() > c.targetTime) navigate(`/lost/${id}`);
    else navigate(`/active/${id}`);
  };

  const currentFee = `${parseFloat(tokenFee).toFixed(
    isNativeToken(draftToken) ? 6 : 2
  )} ${draftToken}`;

  return (
    <div className="min-h-screen w-full bg-gray-950 flex items-center justify-center sm:p-4 font-sans text-slate-200">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold text-white">Processing...</h2>
        </div>
      )}
      <OnboardingModal />
      <div className="relative w-full max-w-md bg-gray-900/80 backdrop-blur-3xl border border-white/10 h-screen sm:h-[850px] sm:max-h-[90vh] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col z-10">
        <Header
          setVerificationStatus={setVerificationStatus}
          walletConnected={walletConnected}
          HeaderConnectButton={HeaderConnectButton(displayName)}
        />

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto relative custom-scrollbar"
        >
          <div className="min-h-full px-6 pb-6 flex flex-col">
            <Routes>
              <Route
                path="/"
                element={
                  <Home
                    walletConnected={walletConnected}
                    HomeConnectButton={HomeConnectButton}
                    basename={basename}
                    initNewChallenge={initNewChallenge}
                    challenges={challenges}
                    challengesLoading={challengesLoading}
                    openChallenge={openChallenge}
                    currentTime={currentTime}
                    setStep={setStep}
                    pendingWithdrawals={pendingWithdrawals}
                    claimPendingWithdrawal={claimPendingWithdrawal}
                    isProcessing={isProcessing}
                  />
                }
              />

              <Route
                path="/objective"
                element={
                  <ObjectiveSelection
                    setDraftObjective={setDraftObjective}
                    setDraftCustomTitle={setDraftCustomTitle}
                    setDraftCustomTime={setDraftCustomTime}
                    setDraftDurationUnit={setDraftDurationUnit}
                    setStep={setStep}
                    draftObjective={draftObjective}
                    draftCustomTitle={draftCustomTitle}
                    draftCustomTime={draftCustomTime}
                    draftDurationUnit={draftDurationUnit}
                  />
                }
              />

              <Route
                path="/staking"
                element={
                  <Staking
                    walletBalance={walletBalance}
                    draftStakeAmount={draftStakeAmount}
                    setDraftStakeAmount={setDraftStakeAmount}
                    draftToken={draftToken}
                    setDraftToken={setDraftToken}
                    draftPenaltyType={draftPenaltyType}
                    setDraftPenaltyType={setDraftPenaltyType}
                    draftPenaltyPercent={draftPenaltyPercent}
                    setDraftPenaltyPercent={setDraftPenaltyPercent}
                    draftObjective={draftObjective}
                    draftCustomTime={draftCustomTime}
                    draftDurationUnit={draftDurationUnit}
                    confirmStartChallenge={confirmStartChallenge}
                    currentFee={currentFee}
                    minStake={tokenMinStake}
                    supportedTokens={supportedTokens}
                  />
                }
              />

              <Route
                path="/active/:id"
                element={
                  <ActiveChallenge
                    challenges={challenges}
                    currentTime={currentTime}
                    quote={quote}
                    setStep={setStep}
                    updateChallengeStatus={updateChallengeStatus}
                  />
                }
              />

              <Route
                path="/verify/:id"
                element={
                  <Verify
                    challenges={challenges}
                    currentTime={currentTime}
                    verificationStatus={verificationStatus}
                    handleUpload={handleUpload}
                    retryVerification={retryVerification}
                    setStep={setStep}
                    showNotification={showNotification}
                  />
                }
              />

              <Route
                path="/lost/:id"
                element={
                  <Lost
                    challenges={challenges}
                    currentTime={currentTime}
                    handleWithdraw={handleWithdraw}
                    setStep={setStep}
                    showNotification={showNotification}
                  />
                }
              />

              <Route
                path="/result/:id"
                element={
                  <Result
                    challenges={challenges}
                    resultDonationPercent={resultDonationPercent}
                    setResultDonationPercent={setResultDonationPercent}
                    markAsWithdrawn={handleWithdraw}
                    setStep={setStep}
                    showNotification={showNotification}
                  />
                }
              />

              <Route
                path="/docs"
                element={
                  <Documentation
                    setStep={setStep}
                    walletConnected={walletConnected}
                  />
                }
              />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
