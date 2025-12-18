const hre = require("hardhat");

async function main() {
  // ----------------------------------------------------
  // CONFIGURATION
  // ----------------------------------------------------
  // REPLACE THIS WITH YOUR DEPLOYED CONTRACT ADDRESS
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  // ----------------------------------------------------

  const TouchGrass = await hre.ethers.getContractFactory("TouchGrass");
  const contract = TouchGrass.attach(contractAddress);

  console.log(`🤖 Keeper Bot Started...`);
  console.log(`👀 Watching contract at: ${contractAddress}`);
  console.log(`----------------------------------------------------`);

  // Poll every 10 seconds
  setInterval(async () => {
    try {
      // 1. Fetch all active (unresolved) challenges
      const activeIds = await contract.getActiveChallenges();

      if (activeIds.length === 0) {
        // Optional: reduce log spam
        // process.stdout.write(".");
        return;
      }

      const now = Math.floor(Date.now() / 1000);

      for (let id of activeIds) {
        // 2. Get challenge details
        const c = await contract.challenges(id);
        const expiryTime = Number(c.startTime) + Number(c.duration);

        // 3. Check if expired
        if (now > expiryTime) {
          console.log(`\n🚨 Detected Expired Challenge #${id}`);
          console.log(
            `   - Target: ${new Date(expiryTime * 1000).toLocaleTimeString()}`
          );
          console.log(
            `   - Current: ${new Date(now * 1000).toLocaleTimeString()}`
          );
          console.log(
            `   - Penalty Type: ${c.penaltyType} | Percent: ${c.penaltyPercent}%`
          );

          // 4. Trigger Resolution (Failure)
          // Gas Limit increased slightly to handle potential token transfers (Burn/Donation)
          try {
            const tx = await contract.resolveChallenge(id, false, {
              gasLimit: 500000,
            });
            console.log(`   ⏳ Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log(`   ✅ Challenge #${id} marked FAILED on-chain.`);

            // Logic explanation based on your new rules:
            if (c.penaltyType.toString() === "2") {
              // Lock
              console.log(`      -> Lock Timer Started.`);
            } else if (
              c.penaltyType.toString() === "3" ||
              c.penaltyPercent.toString() === "100"
            ) {
              console.log(`      -> Penalty Auto-Executed (Burn/100%).`);
            } else {
              console.log(
                `      -> Partial Penalty. Waiting for User to Settle.`
              );
            }
          } catch (txError) {
            console.error(
              `   ❌ Failed to resolve #${id}:`,
              txError.reason || txError.message
            );
          }
        }
      }
    } catch (err) {
      console.error("\nBot Global Error:", err.message);
    }
  }, 10000); // 10 Seconds Interval
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
