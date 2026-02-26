import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWriteContract, useAccount } from 'wagmi'
import { useGovernancePermissions } from '../useGovernancePermissions'
import { publicClient } from '../../../domain/governance/aggregator'
import VotingABI from '../../../contracts/abi/VotingEngine.json'
import { CONTRACTS } from '../../../contracts/addresses'

export type CastVoteArgs = {
  proposalId: bigint
  seatId: bigint
  optionId: number
}

export function useCastVote() {
  const queryClient = useQueryClient()
  const { isSeatHolder } = useGovernancePermissions()
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  return useMutation({
    mutationFn: async ({ proposalId, seatId, optionId }: CastVoteArgs) => {
      if (!isSeatHolder) {
        throw new Error('Not a seat holder')
      }

      const hash = await writeContractAsync({
          address: CONTRACTS.votingEngine,
          abi: VotingABI,
          functionName: 'vote',
          args: [proposalId, seatId, optionId],
          account: address,
          chain: undefined
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
