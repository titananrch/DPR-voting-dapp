import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWriteContract, useAccount } from 'wagmi'
import { publicClient, clearProposalCache } from '../../../domain/governance/aggregator'
import ProposalDraftManagerABI from '../../../contracts/abi/ProposalDraftManager.json'
import { CONTRACTS } from '../../../contracts/addresses'

export type SupportProposalArgs = {
  proposalId: bigint
  seatId: bigint
}

export function useSupportProposal() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  return useMutation({
    mutationFn: async ({ proposalId, seatId }: SupportProposalArgs) => {
      const hash = await writeContractAsync({
        address: CONTRACTS.proposalDraftManager,
        abi: ProposalDraftManagerABI,
        functionName: 'supportProposal',
        args: [proposalId, seatId],
        chain: undefined,
        account: address,
      })

      await publicClient.waitForTransactionReceipt({ hash })
      return hash
    },
    onSuccess: (_data, { proposalId }) => {
      clearProposalCache()
      console.debug('🔄 Clearing proposal cache and invalidating queries after supportProposal', { proposalId })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposal', proposalId.toString()],
      })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposals'],
      })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'userSupportMap'],
      })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'userVoteMap'],
      })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'seat-details'],
      })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposal-details-map'],
      })
      queryClient.invalidateQueries({
        queryKey: ['voteStatus'],
      })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposal-sponsors-map'],
      })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'sponsorParties', proposalId.toString()],
      })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'sponsorSeats', proposalId.toString()],
      })
    },
  })
}
