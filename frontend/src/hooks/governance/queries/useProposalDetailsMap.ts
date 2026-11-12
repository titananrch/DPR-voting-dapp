import { useQuery } from '@tanstack/react-query'
import { getProposal } from '../../../domain/governance/aggregator'
import type { ProposalData } from '../../../domain/governance/types'
import type { Address } from 'viem'

/**
 * Fetch proposal detail data for multiple proposals at once.
 * Centralized at dashboard level to avoid per-card fetches.
 *
 * Returns a map of proposalId -> ProposalData
 * Includes votes, execution status, etc.
 *
 * @param proposalIds List of proposal IDs to fetch details for
 * @param userAddress User's wallet address (for user-specific vote data)
 * @returns Record<proposalId, ProposalData>
 */
export function useProposalDetailsMap(
  proposalIds: number[],
  userAddress?: Address
) {
  // Create stable query key that doesn't include array directly
  const idsKey = proposalIds.length > 0 ? proposalIds.join(',') : 'empty'
  
  return useQuery<Record<number, ProposalData>>({
    queryKey: [
      'governance',
      'proposal-details-map',
      idsKey,
      userAddress ?? null,
    ],
    queryFn: async () => {
      if (proposalIds.length === 0) {
        return {}
      }

      // Fetch all proposal details in parallel
      const results = await Promise.all(
        proposalIds.map((id) =>
          getProposal(BigInt(id), undefined, userAddress)
            .then((detail) => [id, detail] as const)
            .catch((error) => {
              console.error(
                `Error fetching proposal detail for ${id}:`,
                error
              )
              return [id, null] as const
            })
        )
      )

      // Build map, filtering out failed fetches
      return Object.fromEntries(
        results.filter(([_, detail]) => detail !== null)
      ) as Record<number, ProposalData>
    },
    enabled: proposalIds.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: 10_000,
  })
}
