/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { usePublicClient, useWalletClient, useAccount } from 'wagmi'
import { decodeEventLog, type Abi, type Address, type DecodeEventLogReturnType } from 'viem'
import ProposalDraftABI from '../../contracts/abi/ProposalDraftManager.json'
import { CONTRACTS } from '../../contracts/addresses'

export function useCreateProposal() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { address } = useAccount()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const proposalDraftAbi = ProposalDraftABI as Abi
  const contract = CONTRACTS.proposalDraftManager as Address

  async function simulateCreateDraft(
    title: string,
    description: string,
    changeType: number,
    newValue: number | string
  ) {
    if (!publicClient || !address) throw new Error('No client or account')

    return await publicClient.simulateContract({
      address: contract,
      abi: proposalDraftAbi,
      functionName: 'createDraftProposal',
      args: [
        title,
        description,
        changeType,
        typeof newValue === 'string' ? 0 : newValue,
      ],
      account: address,
    })
  }

  async function writeCreateDraft(
    title: string,
    description: string,
    changeType: number,
    newValue: number
  ) {
    if (!walletClient || !publicClient)
      throw new Error('Wallet or public client not available')

    setIsLoading(true)
    setError(null)

    try {
      const tx = await walletClient.writeContract({
        address: contract,
        abi: proposalDraftAbi,
        functionName: 'createDraftProposal' as const,
        args: [title, description, changeType, newValue] as const,
        chain: undefined,
        account: address,
      } as any)

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      })

      const events: DecodeEventLogReturnType[] = []

      for (const log of receipt.logs ?? []) {
        try {
          const decoded = decodeEventLog({
            abi: proposalDraftAbi,
            data: log.data,
            topics: (log as any).topics,
          })
          events.push(decoded)
        } catch {
          // ignore non-matching logs
        }
      }

      return { txHash: receipt.transactionHash, events }
    } catch (e: unknown) {
      if (e instanceof Error) setError(e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  async function writeCreateActionProposal(
    title: string,
    description: string,
    targetContract: Address,
    functionSelector: `0x${string}`,
    encodedParams: `0x${string}`
  ) {
    if (!walletClient || !publicClient)
      throw new Error('Wallet or public client not available')

    setIsLoading(true)
    setError(null)

    try {
      const tx = await walletClient.writeContract({
        address: contract,
        abi: proposalDraftAbi,
        functionName: 'createActionProposal' as const,
        args: [
          title,
          description,
          targetContract,
          functionSelector,
          encodedParams,
        ] as const,        
        chain: undefined,
        account: address,
      } as any)

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      })

      const events: DecodeEventLogReturnType[] = []

      for (const log of receipt.logs ?? []) {
        try {
          const decoded = decodeEventLog({
            abi: proposalDraftAbi,
            data: log.data,
            topics: (log as any).topics,
          })
          events.push(decoded)
        } catch {}
      }

      return { txHash: receipt.transactionHash, events }
    } catch (e: unknown) {
      if (e instanceof Error) setError(e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  async function supportProposal(proposalId: number, seatId: number) {
    if (!walletClient || !publicClient)
      throw new Error('Wallet or public client not available')

    setIsLoading(true)
    setError(null)

    try {
      const tx = await walletClient.writeContract({
        address: contract,
        abi: proposalDraftAbi,
        functionName: 'supportProposal' as const,
        args: [proposalId, seatId] as const,        
        chain: undefined,
        account: address,
      } as any)

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      })

      const events: DecodeEventLogReturnType[] = []

      for (const log of receipt.logs ?? []) {
        try {
          const decoded = decodeEventLog({
            abi: proposalDraftAbi,
            data: log.data,
            topics: (log as any).topics,
          })
          events.push(decoded)
        } catch {}
      }

      return { txHash: receipt.transactionHash, events }
    } catch (e: unknown) {
      if (e instanceof Error) setError(e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  return {
    simulateCreateDraft,
    writeCreateDraft,
    writeCreateActionProposal,
    supportProposal,
    isLoading,
    error,
  }
}
