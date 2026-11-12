import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { getUserSeats } from '../../../domain/governance/aggregator'

export function useSeatInfo(address?: Address) {
  return useQuery<number[]>({
    queryKey: ['governance', 'seats', address ?? null],
    queryFn: async () => {
      console.debug('📭 useSeatInfo: Fetching seats (this is the single source of truth)', { address })
      if (!address) return []
      return getUserSeats(address)
    },
    enabled: !!address,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: 10_000,
  })
}
