// src/hooks/useWriteContracts.ts
import { ethers } from "ethers";
import { contracts } from "../lib/contracts";

export async function vote(
  topicId: number,
  optionId: number
) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const partyVoting = new ethers.Contract(
    contracts.partyAggregatedVoting.address,
    contracts.partyAggregatedVoting.abi,
    signer
  );

  const tx = await partyVoting.vote(topicId, optionId);
  await tx.wait();

  return true;
}