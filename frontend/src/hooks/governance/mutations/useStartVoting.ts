import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWriteContract, useAccount } from 'wagmi'
import { publicClient, clearProposalCache } from '../../../domain/governance/aggregator'
import ProposalDraftManagerABI from '../../../contracts/abi/ProposalDraftManager.json'
import { CONTRACTS } from '../../../contracts/addresses'

export type StartVotingArgs = {
  proposalId: bigint
}

export function useStartVoting() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  return useMutation({
    mutationFn: async ({ proposalId }: StartVotingArgs) => {
      const hash = await writeContractAsync({
        address: CONTRACTS.proposalDraftManager,
        abi: ProposalDraftManagerABI,
        functionName: 'startVoting',
        args: [proposalId],
        chain: undefined,
        account: address,
      })

      await publicClient.waitForTransactionReceipt({ hash })
      return hash
    },
    onSuccess: (_data, { proposalId }) => {
      clearProposalCache()
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposal', proposalId.toString()],
      })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposals'],
      })
      // The proposal status changed on-chain (Active -> Voting), so the
      // aggregated detail map and status counts must not wait for the poll.
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposal-details-map'],
      })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposal-status-counts'],
      })
    },
  })
}
