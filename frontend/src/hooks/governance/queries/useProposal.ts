import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { getProposal } from '../../../domain/governance/aggregator'

export function useProposal(proposalId?: bigint | number, address?: Address) {
  return useQuery({
    queryKey: ['governance', 'proposal', proposalId ?? null],
    queryFn: async () => {
      if (proposalId === undefined || proposalId === null) {
        throw new Error('proposalId is required')
      }
      return getProposal(proposalId, undefined, address)
    },
    enabled: proposalId !== undefined && proposalId !== null
  })
}
