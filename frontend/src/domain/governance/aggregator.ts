/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  createPublicClient,
  http,
  type Address
} from 'viem'
import { localhost } from 'viem/chains'

import addresses from '../../contracts/addresses.json'

import GovernanceConfigABI from '../../contracts/abi/GovernanceConfig.json'
import SeatNFTABI from '../../contracts/abi/SeatNFT.json'
import ProposalDraftManagerABI from '../../contracts/abi/ProposalDraftManager.json'
import VotingEngineABI from '../../contracts/abi/VotingEngine.json'
import ExecutionEngineABI from '../../contracts/abi/ExecutionEngine.json'


import {ProposalStatusEnum,ProposalTypeEnum,VoteOptionEnum,GovernanceParameters,VoteResult,ExecutionStatus,ProposalData,UnifiedGovernanceState} from './types'

/* -------------------------------------------------------------------------- */
/*                               CLIENT SETUP                                 */
/* -------------------------------------------------------------------------- */

export const publicClient = createPublicClient({
  chain: localhost,
  transport: http(
    process.env.NEXT_PUBLIC_RPC_URL ?? 'http://localhost:8545'
  )
})

/* -------------------------------------------------------------------------- */
/*                            INTERNAL UTILITIES                              */
/* -------------------------------------------------------------------------- */

function mapStatus(status: number): ProposalStatusEnum {
  const map: Record<number, ProposalStatusEnum> = {
    0: ProposalStatusEnum.Draft,
    1: ProposalStatusEnum.Active,
    2: ProposalStatusEnum.Voting,
    3: ProposalStatusEnum.Closed,
    4: ProposalStatusEnum.Executed,
    5: ProposalStatusEnum.Rejected,
    6: ProposalStatusEnum.Cancelled
  }

  return map[status] ?? ProposalStatusEnum.Draft
}

function mapType(type: number): ProposalTypeEnum {
  return type === 0
    ? ProposalTypeEnum.RuleChange
    : ProposalTypeEnum.Action
}

function getAddr(key: keyof typeof addresses.localhost): Address {
  return addresses.localhost[key] as Address
}

/* -------------------------------------------------------------------------- */
/*                           PROPOSAL LISTING                                */
/* -------------------------------------------------------------------------- */

export function getProposalStatusLabel(status: number): string {
  switch (status) {
    case 0:
      return 'Draft'
    case 1:
      return 'Active'
    case 2:
      return 'Voting'
    case 3:
      return 'Closed'
    case 4:
      return 'Executed'
    case 5:
      return 'Rejected'
    case 6:
      return 'Cancelled'
    default:
      return 'Unknown'
  }
}

export async function getProposalsByStatus(
  statusFilter: number | null = null,
  client = publicClient
): Promise<import('./types').PreparedProposal[]> {
  const managerAddr = getAddr('proposalDraftManager')

  const maxProposalId = await client.readContract({
    address: managerAddr,
    abi: ProposalDraftManagerABI,
    functionName: 'getProposalCount',
    authorizationList: undefined
  }) as bigint

  const configAddr = getAddr('governanceConfig')
  // read voting duration
  const votingDuration = Number(await client.readContract({
    address: configAddr,
    abi: GovernanceConfigABI,
    functionName: 'getVotingDuration',
    authorizationList: undefined
  }) as bigint)

  const proposals: import('./types').PreparedProposal[] = []

  for (let i = BigInt(1); i <= maxProposalId; i++) {
    const id = i
    const proposalRaw = await client.readContract({
      address: managerAddr,
      abi: ProposalDraftManagerABI,
      functionName: 'proposals',
      args: [id],
      authorizationList: undefined
    }) as ProposalRaw

    const sponsorStatus = await client.readContract({
      address: managerAddr,
      abi: ProposalDraftManagerABI,
      functionName: 'getSponsorshipStatus',
      args: [id],
      authorizationList: undefined
    }) as [bigint, bigint, boolean]

    const status = Number(proposalRaw[5])
    if (statusFilter !== null && status !== statusFilter) continue

    const votingEndedAt = Number(proposalRaw[8])
    const now = Math.floor(Date.now() / 1000)
    const isVoting = status === 2 && now < votingEndedAt
    const isClosed = status === 3

    proposals.push({
      id: Number(proposalRaw[0]),
      proposer: proposalRaw[1],
      proposalType: Number(proposalRaw[2]),
      title: proposalRaw[3],
      description: proposalRaw[4],
      status,
      statusLabel: getProposalStatusLabel(status),
      createdAt: Number(proposalRaw[6]),
      votingStartedAt: Number(proposalRaw[7]),
      votingEndedAt,
      executedAt: Number(proposalRaw[9]),
      sponsorCount: Number(sponsorStatus[0]),
      partyCount: Number(sponsorStatus[1]),
      thresholdMet: Boolean(sponsorStatus[2]),
      isVoting,
      isClosed
    })
  }

  return proposals
}

/* -------------------------------------------------------------------------- */
/*                          GOVERNANCE CONFIG READS                           */
/* -------------------------------------------------------------------------- */

export async function getGovernanceParameters(
  client = publicClient
): Promise<GovernanceParameters> {
  const address = getAddr('governanceConfig')

  const [
    quorum,
    votingDuration,
    approvalThreshold,
    minProposalDelay,
    emergencyPause
  ] = await Promise.all([
    client.readContract({
      address,
      abi: GovernanceConfigABI,
      functionName: 'getQuorum',
      authorizationList: undefined
    }),
    client.readContract({
      address,
      abi: GovernanceConfigABI,
      functionName: 'getVotingDuration',
      authorizationList: undefined
    }),
    client.readContract({
      address,
      abi: GovernanceConfigABI,
      functionName: 'getApprovalThreshold',
      authorizationList: undefined
    }),
    client.readContract({
      address,
      abi: GovernanceConfigABI,
      functionName: 'getMinProposalDelay',
      authorizationList: undefined
    }),
    client.readContract({
      address,
      abi: GovernanceConfigABI,
      functionName: 'isExecutionPaused',
      authorizationList: undefined
    })
  ]) as [bigint, bigint, bigint, bigint, boolean]

  return {
    quorum,
    votingDuration,
    approvalThreshold,
    minProposalDelay,
    emergencyPause
  }
}

/* -------------------------------------------------------------------------- */
/*                             SEAT NFT READS                                 */
/* -------------------------------------------------------------------------- */

export async function getUserSeats(
  userAddress: Address,
  client = publicClient
): Promise<bigint[]> {
  return client.readContract({
    address: getAddr('seatNft'),
    abi: SeatNFTABI,
    functionName: 'getSeatsOfHolder',
    args: [userAddress],
    authorizationList: undefined
  }) as Promise<bigint[]>
}

/* -------------------------------------------------------------------------- */
/*                           PROPOSAL AGGREGATOR                              */
/* -------------------------------------------------------------------------- */
type ProposalRaw = {
  proposer: Address
  proposalType: bigint
  status: bigint
  description: string
  createdAt: bigint
  activatedAt: bigint
  votingStartedAt: bigint
  votingEndedAt: bigint
  quorumRequired: bigint
  approvalThresholdRequired: bigint
}

type VoteResultRaw = {
  approvalVotes: bigint
  rejectionVotes: bigint
  totalVotes: bigint
  quorumMet: boolean
  approvalThresholdMet: boolean
  approved: boolean
}

export async function getProposal(
  proposalId: bigint | number,
  client = publicClient,
  userAddress?: Address
): Promise<ProposalData> {
  const id = BigInt(proposalId)

  const [
    proposalRaw,
    voteResultRaw,
    executionCheck
  ] = await Promise.all([
    client.readContract({
      address: getAddr('proposalDraftManager'),
      abi: ProposalDraftManagerABI,
      functionName: 'getProposal',
      args: [id],
      authorizationList: undefined
    }),
    client.readContract({
      address: getAddr('votingEngine'),
      abi: VotingEngineABI,
      functionName: 'getFullVotingResult',
      args: [id],
      authorizationList: undefined
    }),
    client.readContract({
      address: getAddr('executionEngine'),
      abi: ExecutionEngineABI,
      functionName: 'canExecuteProposal',
      args: [id],
      authorizationList: undefined
    })
  ]) as [
    ProposalRaw,
    VoteResultRaw,
    [boolean, string]
  ]

  const proposal: ProposalData = {
    id,
    proposer: proposalRaw.proposer,
    proposalType: mapType(Number(proposalRaw.proposalType)),
    status: mapStatus(Number(proposalRaw.status)),
    description: proposalRaw.description,
    createdAt: proposalRaw.createdAt,
    activatedAt: proposalRaw.activatedAt,
    votingStartedAt: proposalRaw.votingStartedAt,
    votingEndedAt: proposalRaw.votingEndedAt,
    quorumRequired: proposalRaw.quorumRequired,
    approvalThresholdRequired: proposalRaw.approvalThresholdRequired,
    votes: {
      approvalVotes: voteResultRaw.approvalVotes,
      rejectionVotes: voteResultRaw.rejectionVotes,
      totalVotes: voteResultRaw.totalVotes,
      quorumMet: voteResultRaw.quorumMet,
      approvalThresholdMet: voteResultRaw.approvalThresholdMet,
      approved: voteResultRaw.approved
    },
    execution: {
      canExecute: executionCheck[0],
      reason: executionCheck[1],
      isExecuted: Number(proposalRaw.status) === 4
    }
  }

  /* ------------------------- USER-SPECIFIC DATA -------------------------- */

  if (userAddress) {
    const seats = await getUserSeats(userAddress, client)
    proposal.userSeats = seats
    proposal.userVotes = {}

    const votes = await Promise.all(
      seats.map(seatId =>
        client.readContract({
          address: getAddr('votingEngine'),
          abi: VotingEngineABI,
          functionName: 'getVote',
          args: [id, seatId],
          authorizationList: undefined
        })
      )
    )

    seats.forEach((seatId, index) => {
      proposal.userVotes![seatId.toString()] =
        Number(votes[index]) as VoteOptionEnum
    })
  }

  return proposal
}

/* -------------------------------------------------------------------------- */
/*                           UNIFIED GOVERNANCE                               */
/* -------------------------------------------------------------------------- */

export async function getUnifiedGovernanceState(
  options: {
    proposalId?: bigint | number
    userAddress?: Address
  } = {},
  client = publicClient
): Promise<UnifiedGovernanceState> {
  const parameters = await getGovernanceParameters(client)

  const state: UnifiedGovernanceState = {
    parameters,
    userAddress: options.userAddress
  }

  if (options.userAddress) {
    state.userSeats = await getUserSeats(
      options.userAddress,
      client
    )
  }

  if (options.proposalId !== undefined) {
    state.proposal = await getProposal(
      options.proposalId,
      client,
      options.userAddress
    )
  }

  return state
}
