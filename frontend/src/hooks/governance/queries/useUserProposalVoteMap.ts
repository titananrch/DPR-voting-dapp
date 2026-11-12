import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { getUserSeats, getUserVote } from '../../../domain/governance/aggregator'

export function useUserProposalVoteMap(
  proposalIds: number[],
  userAddress?: Address,
  seatIds?: number[],
) {
  return useQuery<Record<string, 0 | 1 | null>>({
    queryKey: [
      'governance',
      'userVoteMap',
      userAddress ?? null,
      seatIds ? seatIds.map((s) => s.toString()).join(',') : 'fetch',
      proposalIds.map((id) => id.toString()).join(',') || 'none',
    ],
    queryFn: async () => {
      if (!userAddress || proposalIds.length === 0) {
        return {}
      }

      let seats = seatIds
      if (!seats) {
        seats = await getUserSeats(userAddress)
      }

      if (seats.length === 0) {
        return {}
      }

      const results = await Promise.all(
        proposalIds.map(async (proposalId) => {
          const vote = await getUserVote(
            BigInt(proposalId),
            seats![0],
          )
          return [proposalId.toString(), vote] as const
        }),
      )

      return Object.fromEntries(results)
    },
    enabled: !!userAddress && proposalIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  })
}
