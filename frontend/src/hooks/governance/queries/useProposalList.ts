import { useQuery } from '@tanstack/react-query'
import { getProposalsByStatus } from '../../../domain/governance/aggregator'

export function useProposalList(status: number | null = null) {
  return useQuery({
    queryKey: ['governance', 'proposals', status],
    queryFn: () => getProposalsByStatus(status),
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: 10_000,
  })
}

