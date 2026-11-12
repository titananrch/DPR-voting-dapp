import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { getUserSeats, getUserVote } from '../../../domain/governance/aggregator'

export function useUserVote(
  proposalId: bigint | number | undefined,
  userAddress: Address | undefined,
  seatIds?: number[],
) {
  return useQuery({
    queryKey: [
      'governance',
      'userVote',
      proposalId?.toString() ?? null,
      userAddress ?? null,
      seatIds?.map((s) => s.toString()).join(',') ?? 'fetch',
    ],

    enabled: proposalId !== undefined && !!userAddress,

    queryFn: async () => {
      const seats = seatIds ?? await getUserSeats(userAddress!)

      if (seats.length === 0) {
        return null
      }

      return getUserVote(proposalId!, seats[0])
    },

    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  })
}