import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWriteContract, useAccount } from 'wagmi'
import { publicClient } from '../../../domain/governance/aggregator'
import ExecutionABI from '../../../contracts/abi/ExecutionEngine.json'
import { CONTRACTS } from '../../../contracts/addresses'

export type ExecuteProposalArgs = {
  proposalId: bigint
}

export function useExecuteProposal() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  return useMutation({
    mutationFn: async ({ proposalId }: ExecuteProposalArgs) => {
      const hash = await writeContractAsync({
          address: CONTRACTS.executionEngine,
          abi: ExecutionABI,
          functionName: 'executeProposal',
          args: [proposalId],
          chain: undefined,
          account: address
      })

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash })

      return hash
    },

    onSuccess: (_data, { proposalId }) => {
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposal', proposalId],
      })

      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposals'],
      })
    },
  })
}
