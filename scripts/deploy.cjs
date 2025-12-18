const hre = require("hardhat");

async function main() {
  const [deployer, verifier] = await hre.ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  // 1. Deploy MockUSDC (Only for Localhost/Testnet if needed)
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20"); // We need to create this file
  const mockUSDC = await MockERC20.deploy("Mock USDC", "USDC");
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("Mock USDC deployed to:", mockUSDCAddress);

  // 2. Deploy TouchGrass
  const charity = "0x0000000000000000000000000000000000000000";
  const treasury = deployer.address;

  const TouchGrass = await hre.ethers.getContractFactory("TouchGrass");
  const contract = await TouchGrass.deploy(
    mockUSDCAddress,
    verifier.address,
    charity,
    treasury
  );

  await contract.waitForDeployment();

  console.log("TouchGrass deployed to:", await contract.getAddress());
  console.log("----------------------------------------------------");
  console.log("UPDATE FRONTEND CONFIG WITH THESE ADDRESSES:");
  console.log("CONTRACT_ADDRESS =", await contract.getAddress());
  console.log("USDC_CONTRACT_ADDRESS =", mockUSDCAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
