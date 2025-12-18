import { Contract } from "ethers";
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI } from "../data/NFTconfig";

export const handleMint = async (
  signer,
  setIsMinting,
  showNotification,
  activeChallenge
) => {
  if (!signer) {
    alert("Please connect your wallet first");
    return;
  }
  setIsMinting(true);
  try {
    const nftContract = new Contract(
      NFT_CONTRACT_ADDRESS,
      NFT_CONTRACT_ABI,
      signer
    );
    const tx = await nftContract.mintBadge(activeChallenge.onChainId);
    await tx.wait();
    showNotification("NFT Minted Successfully! Check your wallet.", "success");
  } catch (error) {
    console.error("Minting failed:", error);
    showNotification(
      `Minting failed. ${error.reason || error.message}`,
      "error"
    );
  } finally {
    setIsMinting(false);
  }
};
