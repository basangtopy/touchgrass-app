import { JsonRpcProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../data/contractConfig";

const RPC_URL = import.meta.env.VITE_BASE_RPC_URL;

// Dedicated read-only provider for blockchain queries (eth_getLogs, etc.)
// This bypasses the wallet's RPC and uses a reliable dedicated endpoint.
// Only used for reconciliation — all signing operations use the wallet's signer.
let readProvider = null;

export function getReadProvider() {
  if (!readProvider && RPC_URL) {
    readProvider = new JsonRpcProvider(RPC_URL);
  }
  return readProvider;
}

export function getReadContract() {
  const provider = getReadProvider();
  if (!provider) return null;
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}
