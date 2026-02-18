import { ethers } from "ethers"
import addresses from "../contracts/addresses.json"

// ═══════════════════════════════════════════════════════════════════════
// WRITE FUNCTIONS: PROPOSALS
// ═══════════════════════════════════════════════════════════════════════

export async function createRuleChangeProposal(
  title: string,
  description: string,
  changeType: number,  // RuleChangeType enum
  newValue: number | string
) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found")
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const proposalManager = new ethers.Contract(
    addresses.localhost.proposalDraftManager,
    [
      "function createDraftProposal(string calldata title, string calldata description, uint8 changeType, uint256 newValue) external returns (uint256)",
    ],
    signer
  )

  const tx = await proposalManager.createDraftProposal(
    title,
    description,
    changeType,
    newValue
  )
  const receipt = await tx.wait()

  // Extract proposal ID from events (optional; could also return from tx)
  return receipt?.transactionHash
}

export async function createAuthorityChangeProposal(
  title: string,
  description: string,
  changeType: number,  // RuleChangeType.ElectionAuthority or RecallAuthority
  newAddress: string
) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found")
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const proposalManager = new ethers.Contract(
    addresses.localhost.proposalDraftManager,
    [
      "function createDraftProposalWithAddress(string calldata title, string calldata description, uint8 changeType, address newAddress) external returns (uint256)",
    ],
    signer
  )

  const tx = await proposalManager.createDraftProposalWithAddress(
    title,
    description,
    changeType,
    newAddress
  )
  const receipt = await tx.wait()

  return receipt?.transactionHash
}

export async function createActionProposal(
  title: string,
  description: string,
  targetContract: string,
  functionSelector: string,
  encodedParams: string
) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found")
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const proposalManager = new ethers.Contract(
    addresses.localhost.proposalDraftManager,
    [
      "function createActionProposal(string calldata title, string calldata description, address targetContract, bytes4 functionSelector, bytes calldata encodedParams) external returns (uint256)",
    ],
    signer
  )

  const tx = await proposalManager.createActionProposal(
    title,
    description,
    targetContract,
    functionSelector,
    encodedParams
  )
  const receipt = await tx.wait()

  return receipt?.transactionHash
}

// ═══════════════════════════════════════════════════════════════════════
// WRITE FUNCTIONS: SPONSORSHIP
// ═══════════════════════════════════════════════════════════════════════

export async function supportProposal(proposalId: number, seatId: number) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found")
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const proposalManager = new ethers.Contract(
    addresses.localhost.proposalDraftManager,
    [
      "function supportProposal(uint256 proposalId, uint256 seatId) external",
    ],
    signer
  )

  const tx = await proposalManager.supportProposal(proposalId, seatId)
  await tx.wait()

  return true
}

export async function activateDraft(proposalId: number) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found")
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const proposalManager = new ethers.Contract(
    addresses.localhost.proposalDraftManager,
    [
      "function activateDraft(uint256 proposalId) external",
    ],
    signer
  )

  const tx = await proposalManager.activateDraft(proposalId)
  await tx.wait()

  return true
}

// ═══════════════════════════════════════════════════════════════════════
// WRITE FUNCTIONS: VOTING TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════

export async function startVoting(proposalId: number) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found")
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const proposalManager = new ethers.Contract(
    addresses.localhost.proposalDraftManager,
    [
      "function startVoting(uint256 proposalId) external",
    ],
    signer
  )

  const tx = await proposalManager.startVoting(proposalId)
  await tx.wait()

  return true
}

export async function closeVoting(proposalId: number) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found")
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const proposalManager = new ethers.Contract(
    addresses.localhost.proposalDraftManager,
    [
      "function closeVoting(uint256 proposalId) external",
    ],
    signer
  )

  const tx = await proposalManager.closeVoting(proposalId)
  await tx.wait()

  return true
}

// ═══════════════════════════════════════════════════════════════════════
// WRITE FUNCTIONS: VOTING
// ═══════════════════════════════════════════════════════════════════════

export async function vote(
  proposalId: number,
  seatId: number,
  optionId: number
) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found")
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const votingEngine = new ethers.Contract(
    addresses.localhost.votingEngine,
    [
      "function vote(uint256 proposalId, uint256 seatId, uint256 optionId) external",
    ],
    signer
  )

  const tx = await votingEngine.vote(proposalId, seatId, optionId)
  await tx.wait()

  return true
}

export async function voteWithMultipleSeats(
  proposalId: number,
  seatIds: number[],
  optionId: number
) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found")
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const votingEngine = new ethers.Contract(
    addresses.localhost.votingEngine,
    [
      "function voteWithMultipleSeats(uint256 proposalId, uint256[] calldata seatIds, uint256 optionId) external",
    ],
    signer
  )

  const tx = await votingEngine.voteWithMultipleSeats(proposalId, seatIds, optionId)
  await tx.wait()

  return true
}

// ═══════════════════════════════════════════════════════════════════════
// WRITE FUNCTIONS: EXECUTION
// ═══════════════════════════════════════════════════════════════════════

export async function executeProposal(proposalId: number) {
  if (!window.ethereum) {
    throw new Error("MetaMask not found")
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const executionEngine = new ethers.Contract(
    addresses.localhost.executionEngine,
    [
      "function executeProposal(uint256 proposalId) external returns (bool)",
    ],
    signer
  )

  const tx = await executionEngine.executeProposal(proposalId)
  await tx.wait()

  return true
}
