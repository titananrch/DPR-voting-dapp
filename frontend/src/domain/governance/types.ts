import type { Address } from 'viem'

export enum ProposalStatusEnum {
  Draft = 'Draft',
  Active = 'Active',
  Voting = 'Voting',
  Closed = 'Closed',
  Executed = 'Executed',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled'
}

export enum ProposalTypeEnum {
  RuleChange = 'RuleChange',
  Action = 'Action'
}

export enum VoteOptionEnum {
  Approve = 0,
  Reject = 1
}

export interface GovernanceParameters {
  quorum: number
  votingDuration: number
  approvalThreshold: number
  minProposalDelay: number
  emergencyPause: boolean
}

export interface VoteResult {
  approvalVotes: number
  rejectionVotes: number
  totalVotes: number
  quorumMet: boolean
  approvalThresholdMet: boolean
  approved: boolean
}

export interface ExecutionStatus {
  canExecute: boolean
  reason: string
  isExecuted: boolean
}

export interface ProposalData {
  id: number
  proposer: Address
  proposalType: ProposalTypeEnum
  status: ProposalStatusEnum
  description: string
  createdAt: number
  activatedAt: number
  votingStartedAt: number
  votingEndedAt: number
  votes: VoteResult
  execution: ExecutionStatus
  userSeats?: number[]
  userVotes?: Record<string, VoteOptionEnum>
}

export interface UnifiedGovernanceState {
  parameters: GovernanceParameters
  proposal?: ProposalData
  userAddress?: Address
  userSeats?: number[]
}

export interface PreparedProposal {
  id: number
  proposer: Address
  proposalType: number
  title: string
  description: string
  status: number
  statusLabel: string
  createdAt: number
  votingStartedAt: number
  votingEndedAt: number
  executedAt: number
  sponsorCount: number
  partyCount: number
  thresholdMet: boolean
  // Time-sensitive lifecycle flags removed. UI must derive these using
  // the blockchain-synced time source so that display logic is deterministic.
}
