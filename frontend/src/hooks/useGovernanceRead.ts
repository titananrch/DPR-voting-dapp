import { ethers } from "ethers"
import addresses from "../contracts/addresses.json"

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545")

// Contract factory helpers
function getSeatNFT() {
  return new ethers.Contract(
    addresses.localhost.seatNft,
    ["function balanceOf(address) public view returns (uint256)", 
     "function seatParty(uint256) public view returns (uint256)",
     "function totalSupply() public view returns (uint256)"],
    provider
  )
}

function getGovernanceConfig() {
  return new ethers.Contract(
    addresses.localhost.governanceConfig,
    ["function quorum() public view returns (uint256)",
     "function votingDuration() public view returns (uint256)",
     "function approvalThreshold() public view returns (uint256)",
     "function minProposalDelay() public view returns (uint256)",
     "function emergencyPause() public view returns (bool)"],
    provider
  )
}

function getProposalManager() {
  return new ethers.Contract(
    addresses.localhost.proposalDraftManager,
    ["function proposals(uint256) public view returns (uint256 id, address proposer, uint8 proposalType, string memory title, string memory description, uint8 status, uint256 createdAt, uint256 votingStartedAt, uint256 votingEndedAt, uint256 executedAt, uint256 blockNumber)",
     "function getProposalSponsors(uint256) public view returns (uint256[])",
     "function getSponsorshipStatus(uint256) public view returns (uint256 sponsorCount, uint256 partyCount, bool thresholdMet)",
     "function getDraftProposals() public view returns (uint256[])",
     "function getActiveProposals() public view returns (uint256[])",
     "function getVotingProposals() public view returns (uint256[])",
     "function getClosedProposals() public view returns (uint256[])",
     "function getProposalCount() public view returns (uint256)"],
    provider
  )
}

function getVotingEngine() {
  return new ethers.Contract(
    addresses.localhost.votingEngine,
    ["function voteRecord(uint256, uint256) public view returns (uint256)",
     "function hasVoted(uint256, uint256) public view returns (bool)",
     "function voteCount(uint256, uint256) public view returns (uint256)",
     "function totalVotesCast(uint256) public view returns (uint256)",
     "function getVote(uint256, uint256) public view returns (uint256)",
     "function getOptionVoteCount(uint256, uint256) public view returns (uint256)",
     "function getTotalVotes(uint256) public view returns (uint256)",
     "function getVotingResults(uint256) public view returns (uint256, uint256)",
     "function getFullVotingResult(uint256) public view returns (tuple(uint256 proposalId, uint256 totalVotesCast, uint256 approvalVotes, uint256 rejectionVotes, uint256 totalSeatsIssued, bool quorumMet, bool approvalThresholdMet, bool approved))"],
    provider
  )
}

function getExecutionEngine() {
  return new ethers.Contract(
    addresses.localhost.executionEngine,
    ["function canExecuteProposal(uint256) public view returns (bool, string)",
     "function executed(uint256) public view returns (bool)"],
    provider
  )
}

// ═══════════════════════════════════════════════════════════════════════
// READ FUNCTIONS: SEAT & GOVERNANCE DATA
// ═══════════════════════════════════════════════════════════════════════

export async function getSeatCount(userAddress: string): Promise<number> {
  try {
    const seatNft = getSeatNFT()
    const balance = await seatNft.balanceOf(userAddress)
    return Number(balance)
  } catch (error) {
    console.error("Error getting seat count:", error)
    return 0
  }
}

export async function getTotalSeatsIssued(): Promise<number> {
  try {
    const seatNft = getSeatNFT()
    const totalSupply = await seatNft.totalSupply()
    return Number(totalSupply)
  } catch (error) {
    console.error("Error getting total seats:", error)
    return 0
  }
}

export async function getGovernanceParameters() {
  try {
    const config = getGovernanceConfig()
    const quorum = await config.quorum()
    const votingDuration = await config.votingDuration()
    const approvalThreshold = await config.approvalThreshold()
    const minProposalDelay = await config.minProposalDelay()
    const emergencyPause = await config.emergencyPause()

    return {
      quorum: Number(quorum),
      votingDuration: Number(votingDuration),
      approvalThreshold: Number(approvalThreshold),
      minProposalDelay: Number(minProposalDelay),
      emergencyPause,
    }
  } catch (error) {
    console.error("Error getting governance parameters:", error)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════
// READ FUNCTIONS: PROPOSAL DATA
// ═══════════════════════════════════════════════════════════════════════

export interface PreparedProposal {
  id: number
  proposer: string
  proposalType: number  // 0 = RuleChange, 1 = Action
  title: string
  description: string
  status: number  // Draft=0, Active=1, Voting=2, Closed=3, etc.
  statusLabel: string
  createdAt: number
  votingStartedAt: number
  votingEndedAt: number
  executedAt: number
  sponsorCount: number
  partyCount: number
  thresholdMet: boolean
  isVoting: boolean
  isClosed: boolean
}

export async function getProposalsByStatus(statusFilter: number | null = null): Promise<PreparedProposal[]> {
  try {
    const manager = getProposalManager()
    const config = getGovernanceConfig()
    const maxProposalId = await manager.getProposalCount()

    const proposals: PreparedProposal[] = []
    const votingDuration = Number(await config.votingDuration())

    for (let i = 1; i <= maxProposalId; i++) {
      const proposal = await manager.proposals(i)
      const [sponsorCount, partyCount, thresholdMet] = await manager.getSponsorshipStatus(i)

      const status = Number(proposal[5])
      if (statusFilter !== null && status !== statusFilter) {
        continue
      }

      const votingEndedAt = Number(proposal[8])
      const now = Math.floor(Date.now() / 1000)
      const isVoting = status === 2 && now < votingEndedAt
      const isClosed = status === 3

      proposals.push({
        id: Number(proposal[0]),
        proposer: proposal[1],
        proposalType: Number(proposal[2]),
        title: proposal[3],
        description: proposal[4],
        status,
        statusLabel: getProposalStatusLabel(status),
        createdAt: Number(proposal[6]),
        votingStartedAt: Number(proposal[7]),
        votingEndedAt,
        executedAt: Number(proposal[9]),
        sponsorCount: Number(sponsorCount),
        partyCount: Number(partyCount),
        thresholdMet: Boolean(thresholdMet),
        isVoting,
        isClosed,
      })
    }

    return proposals
  } catch (error) {
    console.error("Error getting proposals:", error)
    return []
  }
}

export function getProposalStatusLabel(status: number): string {
  switch (status) {
    case 0:
      return "Draft"
    case 1:
      return "Active"
    case 2:
      return "Voting"
    case 3:
      return "Closed"
    case 4:
      return "Executed"
    case 5:
      return "Rejected"
    case 6:
      return "Cancelled"
    default:
      return "Unknown"
  }
}

// ═══════════════════════════════════════════════════════════════════════
// READ FUNCTIONS: VOTING DATA
// ═══════════════════════════════════════════════════════════════════════

export async function getUserVoteOnProposal(proposalId: number, seatId: number): Promise<number | null> {
  try {
    const votingEngine = getVotingEngine()
    const hasVoted = await votingEngine.hasVoted(proposalId, seatId)

    if (!hasVoted) {
      return null
    }

    const vote = await votingEngine.voteRecord(proposalId, seatId)
    return Number(vote)
  } catch (error) {
    console.error("Error getting user vote:", error)
    return null
  }
}

export async function getProposalVotingResults(proposalId: number) {
  try {
    const votingEngine = getVotingEngine()
    const result = await votingEngine.getFullVotingResult(proposalId)

    return {
      proposalId: Number(result[0]),
      totalVotesCast: Number(result[1]),
      approvalVotes: Number(result[2]),
      rejectionVotes: Number(result[3]),
      totalSeatsIssued: Number(result[4]),
      quorumMet: result[5],
      approvalThresholdMet: result[6],
      approved: result[7],
    }
  } catch (error) {
    console.error("Error getting voting results:", error)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════
// READ FUNCTIONS: EXECUTION DATA
// ═══════════════════════════════════════════════════════════════════════

export async function canExecuteProposal(proposalId: number): Promise<boolean> {
  try {
    const executionEngine = getExecutionEngine()
    const [canExecute, reason] = await executionEngine.canExecuteProposal(proposalId)
    return canExecute
  } catch (error) {
    console.error("Error checking if proposal can execute:", error)
    return false
  }
}

export async function hasProposalBeenExecuted(proposalId: number): Promise<boolean> {
  try {
    const executionEngine = getExecutionEngine()
    const executed = await executionEngine.executed(proposalId)
    return Boolean(executed)
  } catch (error) {
    console.error("Error checking execution status:", error)
    return false
  }
}
