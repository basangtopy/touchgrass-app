const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying NFT contract with account:", deployer.address);

  // REPLACE WITH YOUR ACTUAL DEPLOYED TOUCHGRASS ADDRESS
  const touchGrassAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const TouchGrassNFT = await hre.ethers.getContractFactory("TouchGrassNFT");
  const nftContract = await TouchGrassNFT.deploy(touchGrassAddress);

  await nftContract.waitForDeployment();

  console.log("TouchGrassNFT deployed to:", await nftContract.getAddress());
  console.log("----------------------------------------------------");
  console.log(
    "1. Add this address to src/data/contractConfig.js as NFT_CONTRACT_ADDRESS"
  );
  console.log("2. Update src/data/TouchGrassNFTABI.json with the new ABI");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
