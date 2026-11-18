import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWriteContract, useAccount } from 'wagmi'
import { publicClient, clearProposalCache } from '../../../domain/governance/aggregator'
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
      clearProposalCache()
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposal', proposalId.toString()],
      })

      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposals'],
      })
      // Execution persists a terminal status (Executed/Rejected) and may change
      // GovernanceConfig parameters, so refresh both immediately.
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposal-details-map'],
      })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposal-status-counts'],
      })
      queryClient.invalidateQueries({
        queryKey: ['governance', 'parameters'],
      })
    },
  })
}
