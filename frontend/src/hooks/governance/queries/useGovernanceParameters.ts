import { useQuery } from '@tanstack/react-query'
import { getGovernanceParameters } from '../../../domain/governance/aggregator'

export function useGovernanceParameters() {

  return useQuery({
    queryKey: ['governance', 'parameters'],
    queryFn: () => getGovernanceParameters(),
    staleTime: 60 * 1000, // 60 seconds
    refetchOnWindowFocus: false,
    refetchInterval: false,
  })
}
