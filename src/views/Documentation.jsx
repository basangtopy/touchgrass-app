import {
  Book,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Cpu,
  Terminal,
  Layers,
  Info,
  Brain,
  Cog,
  HandHeart,
  ClipboardList,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

// Moved outside component for performance - prevents recreation on every render
const Section = ({ title, icon: Icon, children }) => (
  <div className="mb-10 last:mb-0">
    <h3 className="text-xl font-bold text-emerald-200 mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
      {Icon && <Icon size={20} className="text-emerald-400" />} {title}
    </h3>
    <div className="text-gray-300 text-sm leading-relaxed space-y-4">
      {children}
    </div>
  </div>
);

export default function Documentation({ setStep, walletConnected }) {
  return (
    <div className="h-full flex flex-col py-6 animate-fadeIn relative z-10">
      <div className="text-center mb-6 flex-shrink-0">
        <h2 className="text-2xl font-black text-white flex items-center justify-center mb-3 gap-2">
          <Book className="text-emerald-400" /> Your Guide to Crushing Goals
        </h2>
        <p className="text-emerald-200/60 text-xs uppercase tracking-widest">
          Your Accountability Partner, Powered by Web3
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-6 space-y-6">
        {/* 1. Overview */}
        <Card className="bg-black/40 border-white/10">
          <Section title="1. What's TouchGrass?" icon={ShieldCheck}>
            <p>
              Think of <strong>TouchGrass</strong> as your digital
              accountability buddy—here to help you actually do the things
              you've been meaning to do. We use the power of blockchain and AI
              to make your commitments stick.
            </p>
            <p className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              Here's the deal: you stake some crypto, complete your goal, prove
              it with a photo, and{" "}
              <strong className="text-emerald-300">
                get your money back plus a cool NFT
              </strong>
              . Miss the deadline? Your stake faces the{" "}
              <strong className="text-rose-400">
                consequence you chose upfront
              </strong>{" "}
              (Donate, Burn, or Lock). Simple, fair, and impossible to cheat.
            </p>
            <p>
              In a world of endless scrolling and "I'll do it tomorrow," we give
              you the push you need to disconnect, move, grow, and become the
              person you know you can be.
            </p>
          </Section>
        </Card>

        {/* 2. The Philosophy */}
        <Card className="bg-black/40 border-white/10">
          <Section title="2. Why It Works" icon={Brain}>
            <p>
              Let's be honest: we're all more likely to show up when there's
              something real on the line. That's not a flaw—it's human nature.
              Scientists call it <em>Loss Aversion</em>, and we use it to help
              you win.
            </p>
            <p>TouchGrass is designed to help you level up in:</p>
            <div className="space-y-3">
              <div>
                <strong className="text-white block">🏃 Physical Health</strong>
                <span className="text-gray-300">
                  Get moving! Run, hydrate, touch actual grass. Your body will
                  thank you.
                </span>
              </div>
              <div>
                <strong className="text-white block">
                  🧘 Mental Well-being
                </strong>
                <span className="text-gray-300">
                  Unplug, read a book, meditate. Give your brain the rest it
                  deserves.
                </span>
              </div>
              <div>
                <strong className="text-white block">
                  ⚡ Productivity & Growth
                </strong>
                <span className="text-gray-300">
                  Build discipline, crush your routines, and watch your life
                  transform.
                </span>
              </div>
            </div>
            <p>
              By putting real value behind your goals, we turn "I should" into
              "I did." No more empty promises to yourself.
            </p>
          </Section>
        </Card>

        {/* 3. Core Functionalities */}
        <Card className="bg-black/40 border-white/10">
          <Section title="3. How It All Works" icon={Zap}>
            <p>
              The TouchGrass cycle is simple:{" "}
              <strong>Commit → Act → Prove → Win.</strong>
            </p>
            <div className="space-y-3">
              <div>
                <strong className="text-white block">
                  A. Pick Your Challenge
                </strong>
                <span>
                  Choose from curated goals like "Run 5km" or "Read 50 pages"—or
                  create your own custom challenge. You set the rules, you set
                  the timeline.
                </span>
              </div>
              <div>
                <strong className="text-white block">
                  B. Put Your Money Where Your Mouth Is
                </strong>
                <span>
                  Stake ETH or USDC into a secure smart contract. This isn't
                  just a promise—it's a commitment with real weight. The minimum
                  stake (~$1) ensures you've got skin in the game.
                </span>
              </div>
              <div>
                <strong className="text-white block">
                  C. Prove It With AI
                </strong>
                <span>
                  Done with your challenge? Snap a photo! Our AI analyzes your
                  evidence (smartwatch stats, gym selfie, open book, screen time
                  logs—whatever fits) and verifies you actually did the thing.
                  No humans slowing you down.
                </span>
              </div>
              <div>
                <strong className="text-white block">
                  D. Face the Music (If You Don't Deliver)
                </strong>
                <span>
                  Missed the deadline? The consequence you chose kicks in:
                  <ul className="list-disc pl-4 mt-1">
                    <li className="mb-2">
                      <strong>Charity Donation:</strong> Your stake helps fund
                      public health initiatives. Your loss becomes someone's
                      gain.
                    </li>
                    <li className="mb-2">
                      <strong>Dev Support:</strong> Funds go toward making
                      TouchGrass even better.
                    </li>
                    <li className="mb-2">
                      <strong>Token Burn:</strong> Gone forever. No one gets it.
                      Maximum motivation.
                    </li>
                    <li className="mb-2">
                      <strong>Time Lock (Penance Mode):</strong> Your funds are
                      frozen for 5x the original duration. A timeout for your
                      wallet.
                    </li>
                  </ul>
                </span>
              </div>
            </div>
          </Section>
        </Card>

        {/* 4. Turning Failure into Social Good */}
        <Card className="bg-black/40 border-white/10">
          <Section title="4. When Setbacks Do Good" icon={HandHeart}>
            <div className="space-y-3">
              <div>
                Here's the silver lining: even if you stumble, you're still
                making a difference. We believe that no effort—even a failed
                one—should be wasted.
              </div>

              <div>
                When you choose the Charity penalty, your missed challenge
                directly funds public health causes. So yeah, you didn't hit
                your goal this time, but someone out there benefits from your
                commitment. That's not a loss—that's a different kind of win.
                And next time? You've got even more reason to follow through.
              </div>
            </div>
          </Section>
        </Card>

        {/* 5. Technical Architecture */}
        <Card className="bg-black/40 border-white/10">
          <Section title="5. Under the Hood (For the Curious)" icon={Cpu}>
            <h4 className="text-white font-bold mb-1">The Tech Stack</h4>
            <ul className="list-disc pl-4 space-y-1 text-xs text-gray-300 mb-4">
              <li>
                <strong>Blockchain:</strong> Base (Layer 2) — fast and cheap.
              </li>
              <li>
                <strong>Smart Contracts:</strong> Rock-solid Solidity (ERC-20,
                Access Control).
              </li>
              <li>
                <strong>Frontend:</strong> React + Vite + Tailwind CSS.
              </li>
              <li>
                <strong>Wallet Connection:</strong> RainbowKit + Wagmi + Viem
                (MetaMask, Coinbase Wallet).
              </li>
              <li>
                <strong>AI Verification:</strong> GPT-4o Vision via OpenRouter.
              </li>
            </ul>

            <h4 className="text-white font-bold mb-2">Smart Design Choices</h4>
            <div className="space-y-3">
              <div className="pl-3 border-l-2 border-emerald-500/30">
                <strong className="text-emerald-200 text-xs uppercase block mb-1">
                  Lazy Evaluation (No Bots Here)
                </strong>
                The contract doesn't auto-fail you. When you interact, it checks
                timestamps. If{" "}
                <code className="bg-black/30 px-1 rounded">
                  Current Time &gt; Deadline
                </code>{" "}
                and you haven't verified, the penalty applies automatically.
                Clean and gas-efficient.
              </div>
              <div className="pl-3 border-l-2 border-blue-500/30">
                <strong className="text-blue-200 text-xs uppercase block mb-1">
                  Auto-Recovery
                </strong>
                Network hiccup during creation? No sweat. The app listens to
                blockchain events and restores any "orphaned" challenges to your
                dashboard. Your funds are never lost.
              </div>
              <div className="pl-3 border-l-2 border-purple-500/30">
                <strong className="text-purple-200 text-xs uppercase block mb-1">
                  Social Identity
                </strong>
                We pull your name from Farcaster, Base Names, or ENS for a more
                personal touch.
              </div>
            </div>
          </Section>
        </Card>

        {/* 6. Features & Logic */}
        <Card className="bg-black/40 border-white/10">
          <Section title="6. The Details" icon={Cog}>
            <div className="mb-4">
              <h4 className="text-white font-bold flex items-center gap-2 mb-1">
                <Layers size={14} /> A. Staking
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-300">
                <li>
                  <strong>Tokens:</strong> ETH or USDC—your choice.
                </li>
                <li>
                  <strong>Minimum:</strong> Around ~$1 USD (dynamically
                  calculated).
                </li>
                <li>
                  <strong>App Fee:</strong> A small ~$0.50 fee covers AI calls,
                  gas for verification, and maintenance. Paid upfront to the
                  Treasury.
                </li>
                <li>
                  <strong>USDC Approval:</strong> We handle the approve +
                  transfer flow seamlessly.
                </li>
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="text-white font-bold flex items-center gap-2 mb-1">
                <Cpu size={14} /> B. AI Verification
              </h4>
              <p className="mb-2">
                Upload your proof photo. Our AI checks it against your challenge
                and makes the call.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-900/20 p-2 rounded border border-emerald-500/20 text-center">
                  <strong className="text-emerald-400 block">✅ PASS</strong>
                  Success recorded on-chain. You're golden!
                </div>
                <div className="bg-rose-900/20 p-2 rounded border border-rose-500/20 text-center">
                  <strong className="text-rose-400 block">❌ NOT YET</strong>
                  Try again—you've got time!
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-white font-bold flex items-center gap-2 mb-1">
                <AlertTriangle size={14} /> C. Penalty Options
              </h4>
              <p>You pick your consequence when creating the challenge:</p>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                <li>
                  <strong>Charity Donation:</strong> A % of your stake goes to
                  our health charity pool.
                </li>
                <li>
                  <strong>Dev Donation:</strong> A % goes to the treasury for
                  continuous improvements.
                </li>
                <li>
                  <strong>Burn:</strong> Sent to the 0x...dead address.
                  Permanently gone.
                </li>
                <li>
                  <strong>Lock (Penance):</strong> Funds frozen for{" "}
                  <strong className="text-yellow-400">5x the duration</strong>.
                  Patience is the penalty.
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold flex items-center gap-2 mb-1">
                <Info size={14} /> D. Rewards & Celebration
              </h4>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                <li>
                  <strong>NFT Badge:</strong> Mint a "Proof of Victory" ERC-721
                  to flex your achievement.
                </li>
                <li>
                  <strong>Share Your Win:</strong> Generate a custom image of
                  your challenge stats and post it everywhere.
                </li>
                <li>
                  <strong>Victory Donation:</strong> Feeling generous? Donate a
                  % of your reclaimed stake to charity as a celebration.
                </li>
              </ul>
            </div>
          </Section>
        </Card>

        {/* 7. How to Use */}
        <Card className="bg-black/40 border-white/10">
          <Section title="7. Quick Start Guide" icon={Terminal}>
            <div className="space-y-4">
              <div>
                <h5 className="text-emerald-400 font-bold text-xs uppercase mb-1">
                  Step 1: Connect Your Wallet
                </h5>
                <p>
                  Hit "Connect Wallet" and make sure you're on the Base network.
                  Let's make this official!
                </p>
              </div>
              <div>
                <h5 className="text-emerald-400 font-bold text-xs uppercase mb-1">
                  Step 2: Create Your Challenge
                </h5>
                <p>
                  Pick a preset goal or write your own. Set your timeframe,
                  choose your token and amount, and select what happens if you
                  don't deliver. If donating, use the slider to set your
                  percentage (minimum 20%). Then hit "Lock Stake" and sign the
                  transaction. You're committed now!
                </p>
              </div>
              <div>
                <h5 className="text-emerald-400 font-bold text-xs uppercase mb-1">
                  Step 3: Go Do the Thing!
                </h5>
                <p>
                  Your challenge is live with a countdown timer. This is your
                  moment—go run, read, hydrate, or touch that grass! 🌱
                </p>
              </div>
              <div>
                <h5 className="text-emerald-400 font-bold text-xs uppercase mb-1">
                  Step 4: Prove It
                </h5>
                <p>
                  Before time runs out, tap "I Did It!" and upload your proof
                  photo. Our AI will review it in seconds. If approved, you'll
                  land on the victory screen. 🎉
                </p>
              </div>
              <div>
                <h5 className="text-emerald-400 font-bold text-xs uppercase mb-1">
                  Step 5: Claim Your Victory
                </h5>
                <p>Verified? Hit "Withdraw Funds" to get your stake back.</p>
                <p>
                  <em>
                    Feeling generous? Use the slider to donate a portion before
                    withdrawing.
                  </em>
                </p>
                <p>
                  Then mint your "Proof of Victory" NFT and share your win with
                  the world!
                </p>
              </div>
              <div>
                <h5 className="text-rose-400 font-bold text-xs uppercase mb-1">
                  Step 6: If You Miss the Deadline...
                </h5>
                <p>Didn't make it this time? It happens. Here's what's next:</p>
                <ul className="list-disc pl-4 text-xs text-gray-300 mt-1">
                  <li className="mb-2">
                    <strong>Lock Penalty:</strong> A "Penance Timer" starts (5x
                    your original duration). Wait it out, then withdraw.
                  </li>
                  <li className="mb-2">
                    <strong>Partial Donation (e.g., 50%):</strong> Click "Settle
                    & Withdraw Remainder" to split the stake—half to charity,
                    half back to you.
                  </li>
                  <li className="mb-2">
                    <strong>Full Donation / Burn:</strong> Click "Forfeit &
                    Sweep" to execute the penalty and close out the challenge.
                  </li>
                </ul>
                <p className="text-gray-400 italic mt-2">
                  Remember: even a setback fuels your next victory. Get back up
                  and try again.
                </p>
              </div>
            </div>
          </Section>
        </Card>

        {/* 8. Summary */}
        <Card className="bg-black/40 border-white/10">
          <Section title="8. The Bottom Line" icon={ClipboardList}>
            <div className="space-y-3">
              TouchGrass isn't just an app—it's a commitment engine. Willpower
              fades. Excuses are easy. But a promise backed by your own money?
              That's hard to ignore.
              <p className="text-emerald-300 font-medium">
                Whether you succeed and reclaim your stake, or stumble and
                support a good cause, every challenge you take is a step toward
                becoming the person you want to be.
              </p>
              <p className="text-gray-400">
                So go ahead—put something on the line. We believe in you. 💪
              </p>
            </div>
          </Section>
        </Card>

        {/* 9. FAQ */}
        <Card className="bg-black/40 border-white/10">
          <Section title="9. Troubleshooting & FAQ" icon={AlertTriangle}>
            <div className="space-y-3">
              <div>
                <strong className="text-white block">
                  Q: My challenge disappeared from the dashboard!
                </strong>
                <span className="text-gray-300">
                  A: Don't panic. Wait about 30 seconds—our Auto-Recovery system
                  scans the blockchain and restores any missing challenges. Your
                  funds are safe.
                </span>
              </div>
              <div>
                <strong className="text-white block">
                  Q: The AI rejected my photo. What gives?
                </strong>
                <span className="text-gray-300">
                  A: Make sure your photo clearly shows what you accomplished.
                  If your challenge is "Read a book," we need to see the book!
                  Try again—you can submit as many times as you want before the
                  deadline.
                </span>
              </div>
              <div>
                <strong className="text-white block">
                  Q: Why does it say "Recovered Challenge"?
                </strong>
                <span className="text-gray-300">
                  A: That means the challenge was restored via Auto-Recovery,
                  but we don't know your original title. Just tap the pencil
                  icon to rename it.
                </span>
              </div>
              <div>
                <strong className="text-white block">
                  Q: I verified successfully but can't withdraw!
                </strong>
                <span className="text-gray-300">
                  A: Double-check that you have enough ETH for gas fees. A tiny
                  amount should do it.
                </span>
              </div>
            </div>
          </Section>
        </Card>
      </div>

      <div className="pt-4 flex-shrink-0">
        <Button
          onClick={() => setStep("home")}
          variant="secondary"
          className="w-full"
        >
          Back to {walletConnected ? "Dashboard" : "Home"}
        </Button>
      </div>
    </div>
  );
}
