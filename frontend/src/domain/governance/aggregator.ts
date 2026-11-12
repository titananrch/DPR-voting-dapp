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
import { getPartyName as getPartyNameFromMap } from './parties'

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

/**
 * On-chain ProposalStatus enum ordinals. These mirror ProposalModels.sol and are
 * the ONLY source for status comparisons in the frontend.
 */
export const PROPOSAL_STATUS_DRAFT = 0
export const PROPOSAL_STATUS_ACTIVE = 1
export const PROPOSAL_STATUS_VOTING = 2
export const PROPOSAL_STATUS_CLOSED = 3
export const PROPOSAL_STATUS_EXECUTED = 4
export const PROPOSAL_STATUS_REJECTED = 5
export const PROPOSAL_STATUS_CANCELLED = 6

/**
 * Sentinel returned by VotingEngine.getVote() when a seat has not voted.
 * Mirrors `type(uint256).max` in Solidity.
 */
const MAX_UINT256 =
  BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

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

let cachedProposalList: import('./types').PreparedProposal[] | null = null
let cachedProposalListTimestamp = 0
const PROPOSAL_LIST_CACHE_TTL = 15 * 1000

function filterByStatus(
  proposals: import('./types').PreparedProposal[],
  status: number | null,
) {
  if (status === null) return proposals
  return proposals.filter((proposal) => proposal.status === status)
}

async function fetchProposalList(
  client = publicClient,
): Promise<import('./types').PreparedProposal[]> {
  const managerAddr = getAddr('proposalDraftManager')

  const maxProposalId = await client.readContract({
    address: managerAddr,
    abi: ProposalDraftManagerABI,
    functionName: 'getProposalCount',
    authorizationList: undefined
  }) as bigint

  const count = Number(maxProposalId)
  if (count === 0) {
    console.debug('📊 No proposals found on chain')
    return []
  }

  console.debug('📊 Fetching proposals from chain...', { count })

  const ids = Array.from({ length: count }, (_, index) => BigInt(index + 1))

  const proposalReads = ids.map((id) =>
    client.readContract({
      address: managerAddr,
      abi: ProposalDraftManagerABI,
      functionName: 'getProposal',
      args: [id],
      authorizationList: undefined
    }) as Promise<ProposalRaw>
  )

  const sponsorshipReads = ids.map((id) =>
    client.readContract({
      address: managerAddr,
      abi: ProposalDraftManagerABI,
      functionName: 'getSponsorshipStatus',
      args: [id],
      authorizationList: undefined
    }) as Promise<[bigint, bigint, boolean]>
  )

  const [proposalRaws, sponsorStatuses] = await Promise.all([
    Promise.all(proposalReads),
    Promise.all(sponsorshipReads)
  ])

  return proposalRaws.map((proposalRaw, index) => {
    const sponsorStatus = sponsorStatuses[index]
    const status = Number(proposalRaw.status)
    const votingEndedAt = Number(proposalRaw.votingEndedAt)

    return {
      id: Number(proposalRaw.id),
      proposer: proposalRaw.proposer,
      proposalType: Number(proposalRaw.proposalType),
      title: proposalRaw.title,
      description: proposalRaw.description,
      status,
      statusLabel: getProposalStatusLabel(status),
      createdAt: Number(proposalRaw.createdAt),
      votingStartedAt: Number(proposalRaw.votingStartedAt),
      votingEndedAt,
      executedAt: Number(proposalRaw.executedAt),
      sponsorCount: Number(sponsorStatus[0]),
      partyCount: Number(sponsorStatus[1]),
      thresholdMet: Boolean(sponsorStatus[2]),
      // NOTE: lifecycle booleans (isVoting/isClosed) are intentionally omitted here.
      // The aggregator returns normalized, raw chain data only. UI components
      // must derive time-sensitive lifecycle state using the canonical
      // blockchain-synced time (useBlockchainSyncedTime) to ensure consistent
      // behavior across renders.
    }
  })
}

export function clearProposalCache() {
  cachedProposalList = null
  cachedProposalListTimestamp = 0
}

export async function getProposalsByStatus(
  statusFilter: number | null = null,
  client = publicClient
): Promise<import('./types').PreparedProposal[]> {
  const now = Date.now()

  if (cachedProposalList && now - cachedProposalListTimestamp < PROPOSAL_LIST_CACHE_TTL) {
    console.debug('📊 Returning cached proposals', {
      statusFilter,
      cachedCount: cachedProposalList.length,
      ageMs: now - cachedProposalListTimestamp
    })
    return filterByStatus(cachedProposalList, statusFilter)
  }

  try {
    const proposals = await fetchProposalList(client)
    cachedProposalList = proposals
    cachedProposalListTimestamp = now
    return filterByStatus(proposals, statusFilter)
  } catch (error) {
    console.error('❌ Error in getProposalsByStatus:', error)
    throw error
  }
}

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
    quorum: Number(quorum),
    votingDuration: Number(votingDuration),
    approvalThreshold: Number(approvalThreshold),
    minProposalDelay: Number(minProposalDelay),
    emergencyPause
  }
}

/* -------------------------------------------------------------------------- */
/*                             SEAT NFT READS                                 */
/* -------------------------------------------------------------------------- */

export async function getUserSeats(
  userAddress: Address,
  client = publicClient
): Promise<number[]> {
  const seats = await client.readContract({
    address: getAddr('seatNft'),
    abi: SeatNFTABI,
    functionName: 'getSeatsOfHolder',
    args: [userAddress],
    authorizationList: undefined
  }) as bigint[]

  return seats.map((seatId) => Number(seatId))
}

/* -------------------------------------------------------------------------- */
/*                           PROPOSAL AGGREGATOR                              */
/* -------------------------------------------------------------------------- */

type ProposalRaw = {
  id: bigint
  proposer: Address
  proposalType: bigint
  title: string
  description: string
  status: bigint
  createdAt: bigint
  votingStartedAt: bigint
  votingEndedAt: bigint
  executedAt: bigint
  blockNumber: bigint
}

// Mirrors the VotingResult struct returned by VotingEngine.getFullVotingResult().
// The total field is named `totalVotesCast` on-chain - NOT `totalVotes`.
type VoteResultRaw = {
  proposalId: bigint
  totalVotesCast: bigint
  approvalVotes: bigint
  rejectionVotes: bigint
  totalSeatsIssued: bigint
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
    id: Number(id),
    proposer: proposalRaw.proposer,
    proposalType: mapType(Number(proposalRaw.proposalType)),
    status: mapStatus(Number(proposalRaw.status)),
    description: proposalRaw.description,
    createdAt: Number(proposalRaw.createdAt),
    activatedAt: Number(proposalRaw.votingStartedAt),
    votingStartedAt: Number(proposalRaw.votingStartedAt),
    votingEndedAt: Number(proposalRaw.votingEndedAt),
    votes: {
      approvalVotes: Number(voteResultRaw.approvalVotes ?? 0),
      rejectionVotes: Number(voteResultRaw.rejectionVotes ?? 0),
      totalVotes: Number(voteResultRaw.totalVotesCast ?? 0),
      quorumMet: Boolean(voteResultRaw.quorumMet),
      approvalThresholdMet: Boolean(voteResultRaw.approvalThresholdMet),
      approved: Boolean(voteResultRaw.approved)
    },
    execution: {
      canExecute: Boolean(executionCheck[0]),
      reason: executionCheck[1] ?? '',
      isExecuted: Number(proposalRaw.status) === PROPOSAL_STATUS_EXECUTED
    }
  }

  /* ------------------------- USER-SPECIFIC DATA -------------------------- */

  if (userAddress) {
    const seats = await getUserSeats(userAddress, client)
    proposal.userSeats = seats
    proposal.userVotes = {}

    const votes = await Promise.all(
      seats.map((seatId) =>
        client.readContract({
          address: getAddr('votingEngine'),
          abi: VotingEngineABI,
          functionName: 'getVote',
          args: [id, BigInt(seatId)],
          authorizationList: undefined
        })
      )
    )

    seats.forEach((seatId, index) => {
      const raw = votes[index] as bigint

      // VotingEngine.getVote returns type(uint256).max when the seat has not
      // voted. Storing that sentinel would surface a meaningless huge number,
      // so non-voters are simply omitted from the record.
      if (raw === MAX_UINT256) {
        return
      }

      proposal.userVotes![seatId.toString()] = Number(raw) as VoteOptionEnum
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

/* -------------------------------------------------------------------------- */
/*                         USER VOTE & SUPPORT STATUS                         */
/* -------------------------------------------------------------------------- */

/**
 * @notice Get the vote option for a user's seat on a proposal
 * @param proposalId ID of the proposal
 * @param seatId ID of the seat
 * @returns Vote option (0 for Approve, 1 for Reject) or null if not voted
 */
export async function getUserVote(
  proposalId: bigint | number,
  seatId: bigint | number,
  client = publicClient
): Promise<0 | 1 | null> {
  try {
    const result = await client.readContract({
      address: getAddr('votingEngine'),
      abi: VotingEngineABI,
      functionName: 'getVote',
      args: [BigInt(proposalId), BigInt(seatId)],
      authorizationList: undefined
    }) as bigint

    // getVote returns type(uint256).max if not voted
    if (result === BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')) {
      return null
    }

    return Number(result) as 0 | 1
  } catch (error) {
    console.error(`Error fetching user vote for proposal ${proposalId}, seat ${seatId}:`, error)
    return null
  }
}

/**
 * @notice Check if a user has supported a draft proposal
 * @param proposalId ID of the proposal
 * @param seatId ID of the seat
 * @returns True if the seat has sponsored the proposal
 */
export async function hasUserSupported(
  proposalId: bigint | number,
  seatId: bigint | number,
  client = publicClient
): Promise<boolean> {
  try {
    const result = await client.readContract({
      address: getAddr('proposalDraftManager'),
      abi: ProposalDraftManagerABI,
      functionName: 'hasSponsoredProposal',
      args: [BigInt(proposalId), BigInt(seatId)],
      authorizationList: undefined
    }) as boolean

    return result
  } catch (error) {
    console.error(`Error checking user support for proposal ${proposalId}, seat ${seatId}:`, error)
    return false
  }
}

/**
 * @notice Get the list of parties that have sponsored a proposal
 * @param proposalId ID of the proposal
 * @returns Array of party IDs that sponsored the proposal
 */
export async function getProposalSponsorParties(
  proposalId: bigint | number,
  client = publicClient
): Promise<number[]> {
  try {
    const result = await client.readContract({
      address: getAddr('proposalDraftManager'),
      abi: ProposalDraftManagerABI,
      functionName: 'getProposalSponsorParties',
      args: [BigInt(proposalId)],
      authorizationList: undefined
    }) as bigint[]

    return result.map((partyId) => Number(partyId))
  } catch (error) {
    console.error(`Error fetching sponsor parties for proposal ${proposalId}:`, error)
    return []
  }
}

/**
 * @notice Get party name from party ID
 * @dev SeatNFT has no `partyNames` mapping - only `seatParty`. Party names are
 *      off-chain metadata, so this delegates to the shared static map in
 *      domain/governance/parties.ts. Kept async to preserve the existing
 *      call signature; no RPC is performed.
 * @param partyId ID of the party
 * @returns Party name
 */
export async function getPartyName(
  partyId: bigint | number
): Promise<string> {
  return getPartyNameFromMap(partyId)
}

/**
 * @notice Get the list of seats that have sponsored a proposal
 * @param proposalId ID of the proposal
 * @returns Array of seat IDs that sponsored the proposal
 */
export async function getProposalSponsors(
  proposalId: bigint | number,
  client = publicClient
): Promise<number[]> {
  try {
    const result = await client.readContract({
      address: getAddr('proposalDraftManager'),
      abi: ProposalDraftManagerABI,
      functionName: 'getProposalSponsors',
      args: [BigInt(proposalId)],
      authorizationList: undefined
    }) as bigint[]

    return result.map((seatId) => Number(seatId))
  } catch (error) {
    console.error(`Error fetching sponsors for proposal ${proposalId}:`, error)
    return []
  }
}

export async function getProposalSponsorParty(
  proposalId: bigint | number,
  seatId: bigint | number,
  client = publicClient
): Promise<number | null> {
  try {
    const partyId = await client.readContract({
      address: getAddr('proposalDraftManager'),
      abi: ProposalDraftManagerABI,
      functionName: 'proposalSponsorParty',
      args: [BigInt(proposalId), BigInt(seatId)],
      authorizationList: undefined
    }) as bigint

    return partyId === 0n ? null : Number(partyId)
  } catch (error) {
    console.error(
      `Error fetching historical sponsor party for proposal ${proposalId}, seat ${seatId}:`,
      error
    )
    throw error
  }
}
