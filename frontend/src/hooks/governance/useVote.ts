import { useState } from 'react'
import { usePublicClient, useWalletClient, useAccount } from 'wagmi'
import { type Abi, type Address,decodeEventLog,DecodeEventLogReturnType } from 'viem'
import VotingABI from '../../contracts/abi/VotingEngine.json'
import { CONTRACTS } from '../../contracts/addresses'

export function useVote() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const votingAbi = VotingABI as Abi
  const contract = CONTRACTS.votingEngine as Address

  async function simulateVote(proposalId: number, seatId: number, optionId: number) {
    if (!publicClient || !address) throw new Error('No client or account')
    return await publicClient.simulateContract({ address: contract, abi: votingAbi, functionName: 'vote', args: [proposalId, seatId, optionId], account: address })
  }

  async function writeVoteAsync(proposalId: number, seatId: number, optionId: number) {
    if (!walletClient) throw new Error('Wallet client not available')
    setIsLoading(true)
    setError(null)
    try {
      const tx = await walletClient.writeContract({ address: contract, abi: votingAbi, functionName: 'vote', args: [proposalId, seatId, optionId], chain: undefined, account: address, })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
      // decode events VoteCast / VoteRecorded
      const events: DecodeEventLogReturnType[] = []
      for (const log of receipt.logs || []) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const decoded = decodeEventLog({ abi: votingAbi, data: log.data, topics: (log as any).topics })
          if (decoded) events.push(decoded)
        } catch{ /* ignore */ }
      }
      return { txHash: receipt.transactionHash, events }
    } catch (e: unknown) {
      setError(e as Error)
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  return { simulateVote, writeVoteAsync, isLoading, error }
}
