import { Heart, Wallet, Flame, Lock } from "lucide-react";
import quoteList from "./quotes.json";

export const OBJECTIVES = [
  // --- Physical Health ---
  { id: 1, title: "Run 5km", icon: "🏃‍♂️", defaultTime: 24 },
  { id: 2, title: "Drink 3L Water", icon: "💧", defaultTime: 12 },
  { id: 5, title: "Walk 10,000 Steps", icon: "👣", defaultTime: 24 },
  { id: 6, title: "Gym Workout (1hr)", icon: "💪", defaultTime: 24 },
  { id: 7, title: "Cold Shower / Plunge", icon: "🧊", defaultTime: 12 },
  { id: 8, title: "Sleep 8 Hours", icon: "😴", defaultTime: 24 },
  { id: 9, title: "Go for a Hike", icon: "🥾", defaultTime: 48 },

  // --- Mental Clarity & Mindfulness ---
  { id: 3, title: "Read 50 Pages", icon: "📖", defaultTime: 48 },
  { id: 10, title: "Meditate 20 Mins", icon: "🧘", defaultTime: 12 },
  { id: 11, title: "Journal 3 Pages", icon: "✍️", defaultTime: 24 },
  { id: 12, title: "Morning Sunlight (15m)", icon: "☀️", defaultTime: 12 },

  // --- Digital Detox & "Touch Grass" ---
  { id: 4, title: "No Social Media", icon: "📵", defaultTime: 12 },
  { id: 13, title: "No Video Games", icon: "🚫", defaultTime: 24 },
  { id: 14, title: "Gardening / Plant Care", icon: "🌱", defaultTime: 24 },
  { id: 15, title: "Phone-Free Walk", icon: "🌳", defaultTime: 6 },

  // --- Productivity & Livelihood ---
  { id: 16, title: "Cook a Healthy Meal", icon: "🍳", defaultTime: 24 },
  { id: 17, title: "Clean Your Room", icon: "🧹", defaultTime: 24 },
  { id: 18, title: "Learn a New Skill (1hr)", icon: "🎓", defaultTime: 48 },
];

export const generateQuote = () => {
  return quoteList[Math.floor(Math.random() * quoteList.length)];
};

export const PENALTY_OPTIONS = [
  {
    id: "charity",
    title: "Give to Health Charity 💚",
    desc: "Your loss becomes someone's gain – funds go to public health",
    icon: <Heart className="w-4 h-4" />,
  },
  {
    id: "dev",
    title: "Support the Dev Team 🛠️",
    desc: "Help keep TouchGrass alive and improving",
    icon: <Wallet className="w-4 h-4" />,
  },
  {
    id: "lock",
    title: "Timeout Mode 🔐",
    desc: "No loss, but funds frozen for 5× your challenge time",
    icon: <Lock className="w-4 h-4" />,
  },
  {
    id: "burn",
    title: "Burn It All 🔥",
    desc: "Gone forever. Maximum stakes, maximum motivation.",
    icon: <Flame className="w-4 h-4" />,
  },
];

export const FAQ_DATA = [
  {
    question: "How does TouchGrass ensure I actually do the task?",
    answer:
      "TouchGrass uses a powerful combination of 'Skin in the Game' and Artificial Intelligence. First, you lock a real financial stake in a smart contract, creating a tangible incentive to succeed. Second, to prove completion, you must upload photo evidence (e.g., a sweaty selfie, a Strava screenshot, or an open book). Our AI agent analyzes this image for specific visual indicators relevant to your goal. If the evidence is valid, your funds are unlocked. If not, and you are unable to provide a valid evidence before the end of the challenge time, the penalty you selected executes.",
  },
  {
    question: "Where does my money go if I fail a challenge?",
    answer:
      "This is entirely up to you during the setup process! You can choose to have your staked funds sent to health charity (making your failure a win for someone else), donated to the TouchGrass developer fund, 'burnt' (permanently destroyed), or simply locked in the contract for an extended 'penance period' before you can reclaim them.",
  },
  {
    question: "Is my money safe while it's staked?",
    answer:
      "Yes. TouchGrass is a non-custodial protocol. Your funds are held in a Smart Contract on the Base blockchain, not in a company bank account. The contract code dictates that funds can ONLY be released back to your wallet upon successful verification or after penalty conditions are met. Neither the developers nor any third party can access or withdraw your staked tokens.",
  },
  {
    question: "How exactly does the 'Lock' penalty work?",
    answer:
      "The Lock penalty is a 'Time Out' for your money. If you fail your objective, you don't lose your funds permanently. Instead, the smart contract freezes them for a duration equal to 5x your original challenge time. For example, if you failed a 24-hour challenge, your funds would be locked for 5 days (120 hours). Once this timer expires, a 'Withdraw' button will appear, allowing you to reclaim your full stake.",
  },
  {
    question: "Which tokens can I use to stake?",
    answer:
      "Currently, TouchGrass operates on the Base network (Coinbase's L2). You can stake using ETH (Ether) or USDC (USD Coin). We recommend using USDC if you want your stake value to remain stable and unaffected by crypto market volatility during your challenge.",
  },
];
