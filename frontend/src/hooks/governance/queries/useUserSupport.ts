import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { getUserSeats, hasUserSupported } from '../../../domain/governance/aggregator'

/**
 * @notice Hook to check if a user has supported a draft proposal
 * @param proposalId ID of the proposal (or undefined to skip query)
 * @param userAddress User's wallet address (or undefined to skip query)
 * @param seatIds Optional: user's seat IDs (if not provided, will fetch via getUserSeats)
 * @returns True if user has supported the proposal with at least one seat
 */
export function useUserSupport(
  proposalId: bigint | number | undefined,
  userAddress: Address | undefined,
  seatIds?: number[]
) {
  const enabled =
    proposalId !== undefined &&
    proposalId !== null &&
    !!userAddress

  return useQuery({
    queryKey: [
      'governance',
      'userSupport',
      proposalId?.toString() ?? null,
      userAddress ?? null,
      seatIds
        ? seatIds.map((s) => s.toString()).join(',')
        : 'fetch',
    ],

    enabled,

    queryFn: async () => {
      let seats = seatIds

      if (!seats) {
        seats = await getUserSeats(userAddress!)
      }

      if (seats.length === 0) {
        return false
      }

      return hasUserSupported(proposalId!, seats[0])
    },

    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  })
}