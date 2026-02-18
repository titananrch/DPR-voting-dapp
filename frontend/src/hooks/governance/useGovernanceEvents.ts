import { useEffect, useState } from 'react'
import { useWatchContractEvent, usePublicClient } from 'wagmi'
import { type Abi} from 'viem'
import ProposalDraftABI from '../../contracts/abi/ProposalDraftManager.json'
import VotingABI from '../../contracts/abi/VotingEngine.json'
import ExecutionABI from '../../contracts/abi/ExecutionEngine.json'
import { CONTRACTS } from '../../contracts/addresses'

export type GovernanceEvent = {
  type: string
  payload: unknown
  txHash?: string
  blockNumber?: number
  timestamp?: number
}

export function useGovernanceEvents() {
  const publicClient = usePublicClient()
  const [timelineEvents, setTimelineEvents] = useState<GovernanceEvent[]>([])
  const proposalDraftABI = ProposalDraftABI as Abi
  const votingABI = VotingABI as Abi
  const executionABI = ExecutionABI as Abi

  // Subscribe to DraftProposalCreated
  useWatchContractEvent({
    address: CONTRACTS.proposalDraftManager as `0x${string}`,
    abi: proposalDraftABI,
    eventName: 'DraftProposalCreated',
    onLogs(logs) {
      logs.forEach(log => setTimelineEvents((s) => [{ type: 'DraftProposalCreated', payload: log, txHash: log.transactionHash, blockNumber: Number(log.blockNumber) }, ...s]))
    }
  })

  // VoteCast
  useWatchContractEvent({
    address: CONTRACTS.votingEngine as `0x${string}`,
    abi: votingABI,
    eventName: 'VoteCast',
    onLogs(logs) {
      logs.forEach(log => setTimelineEvents((s) => [{ type: 'VoteCast', payload: log, txHash: log.transactionHash, blockNumber: Number(log.blockNumber) }, ...s]))
    }
  })

  // ProposalExecuted (ExecutionEngine)
  useWatchContractEvent({
    address: CONTRACTS.executionEngine as `0x${string}`,
    abi: executionABI,
    eventName: 'ProposalExecuted',
    onLogs(logs) {
      logs.forEach(log => setTimelineEvents((s) => [{ type: 'ProposalExecuted', payload: log, txHash: log.transactionHash, blockNumber: Number(log.blockNumber) }, ...s]))
    }
  })

  useEffect(() => {
    // Optionally hydrate past events - omitted for brevity
  }, [publicClient])

  return { timelineEvents }
}
