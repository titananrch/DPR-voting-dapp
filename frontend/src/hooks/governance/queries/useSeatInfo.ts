import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { getUserSeats } from '../../../domain/governance/aggregator'

export function useSeatInfo(address?: Address) {
  return useQuery<bigint[]>({
    queryKey: ['governance', 'seats', address ?? null],
    queryFn: async () => {
      if (!address) return []
      return getUserSeats(address)
    },
    enabled: !!address,
    staleTime: 10 * 60 * 1000
  })
}
