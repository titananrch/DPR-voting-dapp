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
  quorum: bigint
  votingDuration: bigint
  approvalThreshold: bigint
  minProposalDelay: bigint
  emergencyPause: boolean
}

export interface VoteResult {
  approvalVotes: bigint
  rejectionVotes: bigint
  totalVotes: bigint
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
  id: bigint
  proposer: Address
  proposalType: ProposalTypeEnum
  status: ProposalStatusEnum
  description: string
  createdAt: bigint
  activatedAt: bigint
  votingStartedAt: bigint
  votingEndedAt: bigint
  quorumRequired: bigint
  approvalThresholdRequired: bigint
  votes: VoteResult
  execution: ExecutionStatus
  userSeats?: bigint[]
  userVotes?: Record<string, VoteOptionEnum>
}

export interface UnifiedGovernanceState {
  parameters: GovernanceParameters
  proposal?: ProposalData
  userAddress?: Address
  userSeats?: bigint[]
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
  isVoting: boolean
  isClosed: boolean
}
