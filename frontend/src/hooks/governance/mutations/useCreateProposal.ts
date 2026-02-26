import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWriteContract, useAccount } from 'wagmi'
import { publicClient } from '../../../domain/governance/aggregator'
import ProposalDraftABI from '../../../contracts/abi/ProposalDraftManager.json'
import { CONTRACTS } from '../../../contracts/addresses'

export type CreateDraftArgs = {
  title: string
  description: string
  changeType: number
  newValue: number
}

export function useCreateProposal() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  return useMutation({
    mutationFn: async ({
      title,
      description,
      changeType,
      newValue,
    }: CreateDraftArgs) => {
      const hash = await writeContractAsync({
        address: CONTRACTS.proposalDraftManager,
        abi: ProposalDraftABI,
        functionName: 'createDraftProposal',
        args: [title, description, changeType, newValue],
        chain: undefined,
        account: address
      })

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash })

      return hash
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposals'],
      })
    },
  })
}
