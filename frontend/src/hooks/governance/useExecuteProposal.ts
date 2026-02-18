import { useState } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { type Abi, type Address, decodeEventLog, DecodeEventLogReturnType } from 'viem'
import ExecutionABI from '../../contracts/abi/ExecutionEngine.json'
import { CONTRACTS } from '../../contracts/addresses'

export function useExecuteProposal() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const executionABI = ExecutionABI as Abi
  const contract = CONTRACTS.executionEngine as Address

  async function canExecute(proposalId: number) {
    if (!publicClient) throw new Error('No public client')
    return await publicClient.readContract({ address: contract, abi: executionABI, functionName: 'canExecuteProposal', args: [proposalId],account: address, authorizationList: [{ account: address }] })
  }

  async function executeProposal(proposalId: number) {
    if (!walletClient) throw new Error('Wallet client not available')
    setIsLoading(true)
    setIsExecuting(true)
    setError(null)
    try {
      const contract = CONTRACTS.executionEngine
      const tx = await walletClient.writeContract({ address: contract, abi: executionABI, functionName: 'executeProposal', args: [proposalId], account: address, chain: undefined })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
      const events: DecodeEventLogReturnType[] = []
      for (const log of receipt.logs || []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        try { const decoded = decodeEventLog({ abi: executionABI, data: log.data, topics: (log as any).topics }); if (decoded) events.push(decoded) } catch{ }
      }
      return { txHash: receipt.transactionHash, events }
    } catch (e: unknown) {
      setError(e as Error)
      throw e
    } finally {
      setIsLoading(false)
      setIsExecuting(false)
    }
  }

  return { canExecute, executeProposal, isLoading, isExecuting, error }
}
