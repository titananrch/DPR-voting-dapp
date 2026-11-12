import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWriteContract, useAccount } from 'wagmi'
import { publicClient, clearProposalCache } from '../../../domain/governance/aggregator'
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
      if (!address) {
        throw new Error('Wallet not connected')
      }

      if (!title.trim() || !description.trim()) {
        throw new Error('Title and description are required')
      }

      try {
        console.log('🚀 Creating proposal with args:', {
          title,
          description,
          changeType,
          newValue,
        })

        const hash = await writeContractAsync({
          address: CONTRACTS.proposalDraftManager,
          abi: ProposalDraftABI,
          functionName: 'createDraftProposal',
          args: [title, description, changeType, newValue],
          chain: undefined,
          account: address
        })

        console.log('✅ Transaction hash:', hash)

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash })

        if (!receipt) {
          throw new Error('Transaction receipt not found')
        }

        console.log('✅ Transaction confirmed at block:', receipt.blockNumber)
        console.log('📊 Transaction details:', {
          from: receipt.from,
          to: receipt.to,
          status: receipt.status,
          blockNumber: receipt.blockNumber,
          transactionHash: receipt.transactionHash,
        })

        return hash
      } catch (error) {
        console.error('❌ Proposal creation failed:', error)
        throw error
      }
    },

    onSuccess: (hash) => {
      clearProposalCache()
      console.log('🔄 Clearing proposal cache and invalidating proposal queries...')

      // Invalidate all proposal-related queries to force refresh
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposals', null],
      })

      // Also invalidate all status-filtered queries
      queryClient.invalidateQueries({
        queryKey: ['governance', 'proposals'],
        exact: false
      })
    },

    onError: (error) => {
      console.error('❌ Mutation error:', error)
    }
  })
}
