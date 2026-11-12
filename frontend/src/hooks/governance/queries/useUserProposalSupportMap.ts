import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { getUserSeats, hasUserSupported } from '../../../domain/governance/aggregator'

export function useUserProposalSupportMap(
  proposalIds: number[],
  userAddress?: Address,
  seatIds?: number[],
) {
  return useQuery<Record<string, boolean>>({
    queryKey: [
      'governance',
      'userSupportMap',
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
          const supported = await hasUserSupported(
            BigInt(proposalId),
            seats![0],
          )
          return [proposalId.toString(), supported] as const
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
