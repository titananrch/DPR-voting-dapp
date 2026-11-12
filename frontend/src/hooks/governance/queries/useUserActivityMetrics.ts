import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import type { PreparedProposal } from '../../../domain/governance/types'

export interface ActivityMetrics {
  votingProposalCount: number
  closedProposalCount: number
}

/**
 * Counts of proposals by on-chain status.
 *
 * IMPORTANT: These are GLOBAL proposal counts, not per-user activity. Deriving
 * a user's personal vote/support history would require an event indexer, which
 * this app does not have. They are named and labelled accordingly so the UI
 * does not present fabricated per-wallet figures.
 *
 * No RPC calls are performed inside this hook.
 */
export function useUserActivityMetrics(
  proposals: PreparedProposal[],
  address?: Address,
) {
  return useQuery<ActivityMetrics>({
    queryKey: [
      'governance',
      'proposal-status-counts',
      address ?? null,
      proposals.map((proposal) => `${proposal.id}:${proposal.status}`).join(','),
    ],
    queryFn: async () => {
      if (!address) {
        return { votingProposalCount: 0, closedProposalCount: 0 }
      }

      const votingProposalCount = proposals.filter(
        (proposal) => proposal.status === 2,
      ).length
      const closedProposalCount = proposals.filter(
        (proposal) => proposal.status === 3,
      ).length

      return { votingProposalCount, closedProposalCount }
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
  })
}
