import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import type { PreparedProposal } from '../../../domain/governance/types'

export interface ActivityMetrics {
  votesCount: number
  proposalsSupportedCount: number
  votingProposalCount: number
  closedProposalCount: number
}

/**
 * Compute activity metrics based on pre-fetched proposal list.
 * No RPC calls are performed inside this hook.
 */
export function useUserActivityMetrics(
  proposals: PreparedProposal[],
  address?: Address,
  seatIds?: number[],
) {
  return useQuery<ActivityMetrics>({
    queryKey: [
      'governance',
      'user-activity',
      address ?? null,
      seatIds ? seatIds.map((s) => s.toString()).join(',') : 'none',
      proposals.map((proposal) => `${proposal.id}:${proposal.status}`).join(',')
    ],
    queryFn: async () => {
      console.debug('📊 Running query: useUserActivityMetrics', {
        proposalCount: proposals.length,
        seatCount: seatIds?.length ?? 0,
      })

      if (!address) {
        return {
          votesCount: 0,
          proposalsSupportedCount: 0,
          votingProposalCount: 0,
          closedProposalCount: 0,
        }
      }

      const votingProposalCount = proposals.filter((proposal) => proposal.status === 2).length
      const closedProposalCount = proposals.filter((proposal) => proposal.status === 3).length
      const votesCount = proposals.filter((proposal) => proposal.status >= 2).length
      const proposalsSupportedCount = proposals.filter((proposal) => proposal.status <= 1).length

      return {
        votesCount,
        proposalsSupportedCount,
        votingProposalCount,
        closedProposalCount,
      }
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
  })
}
