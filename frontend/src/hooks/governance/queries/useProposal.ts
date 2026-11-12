import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { getProposal } from '../../../domain/governance/aggregator'

export function useProposal(proposalId?: bigint | number, address?: Address) {
  const queryKey = [
    'governance',
    'proposal',
    proposalId !== undefined && proposalId !== null ? proposalId.toString() : null,
    address ?? null,
  ] as const
  const enabled = proposalId !== undefined

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!enabled) {
        throw new Error('proposalId is required')
      }
      return getProposal(proposalId!, undefined, address)
    },
    enabled,
    staleTime: 15000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  })
}
