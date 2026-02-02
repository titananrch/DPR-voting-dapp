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

// Admin functions
export async function createTopic(title: string) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const topicManager = new ethers.Contract(
    contracts.topicManager.address,
    contracts.topicManager.abi,
    signer
  );

  const tx = await topicManager.createTopic(title);
  await tx.wait();

  return true;
}

export async function addVoteOption(topicId: number, label: string) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const topicManager = new ethers.Contract(
    contracts.topicManager.address,
    contracts.topicManager.abi,
    signer
  );

  const tx = await topicManager.addVoteOption(topicId, label);
  await tx.wait();

  return true;
}

export async function openTopic(topicId: number) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const topicManager = new ethers.Contract(
    contracts.topicManager.address,
    contracts.topicManager.abi,
    signer
  );

  const tx = await topicManager.openTopic(topicId);
  await tx.wait();

  return true;
}

export async function closeTopic(topicId: number) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const topicManager = new ethers.Contract(
    contracts.topicManager.address,
    contracts.topicManager.abi,
    signer
  );

  const tx = await topicManager.closeTopic(topicId);
  await tx.wait();

  return true;
}

// Party Management
export async function addParty(name: string) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const partyRegistry = new ethers.Contract(
    contracts.partyRegistry.address,
    contracts.partyRegistry.abi,
    signer
  );

  const tx = await partyRegistry.addParty(name);
  await tx.wait();

  return true;
}

export async function deactivateParty(partyId: number) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const partyRegistry = new ethers.Contract(
    contracts.partyRegistry.address,
    contracts.partyRegistry.abi,
    signer
  );

  const tx = await partyRegistry.deactivateParty(partyId);
  await tx.wait();

  return true;
}

export async function activateParty(partyId: number) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const partyRegistry = new ethers.Contract(
    contracts.partyRegistry.address,
    contracts.partyRegistry.abi,
    signer
  );

  const tx = await partyRegistry.activateParty(partyId);
  await tx.wait();

  return true;
}

// Member Management
export async function registerMember(memberAddress: string, partyId: number) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const memberRegistry = new ethers.Contract(
    contracts.memberRegistry.address,
    contracts.memberRegistry.abi,
    signer
  );

  const tx = await memberRegistry.registerMember(memberAddress, partyId);
  await tx.wait();

  return true;
}

export async function deactivateMember(memberAddress: string) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const memberRegistry = new ethers.Contract(
    contracts.memberRegistry.address,
    contracts.memberRegistry.abi,
    signer
  );

  const tx = await memberRegistry.deactivateMember(memberAddress);
  await tx.wait();

  return true;
}

export async function activateMember(memberAddress: string) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const memberRegistry = new ethers.Contract(
    contracts.memberRegistry.address,
    contracts.memberRegistry.abi,
    signer
  );

  const tx = await memberRegistry.activateMember(memberAddress);
  await tx.wait();

  return true;
}
