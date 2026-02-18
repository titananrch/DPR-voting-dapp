/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { type Address, type Abi} from 'viem'
import ProposalDraftABI from '../../contracts/abi/ProposalDraftManager.json'
import VotingABI from '../../contracts/abi/VotingEngine.json'
import ExecutionABI from '../../contracts/abi/ExecutionEngine.json'
import { CONTRACTS } from '../../contracts/addresses'

export type Proposal = {
  id: number
  proposer: string
  proposalType: number
  title: string
  description: string
  status: number
  createdAt: number
  votingStartedAt: number
  votingEndedAt: number
  executedAt: number
  blockNumber: number
}

export type RuleChange = {
  changeType: number
  oldValue: number
  newValue: number
  oldAddress?: string
  newAddress?: string
}

export type VoteResult = {
  approvalVotes: number
  rejectionVotes: number
  totalVotesCast: number
  quorumMet: boolean
  approvalThresholdMet: boolean
  approved: boolean
}

export function useProposal(proposalId?: number) {
  const publicClient = usePublicClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [actionData, setActionData] = useState<unknown | null>(null)
  const [ruleChange, setRuleChange] = useState<RuleChange | null>(null)
  const [sponsorship, setSponsorship] = useState<{ sponsorCount: number; partyCount: number; thresholdMet: boolean } | null>(null)
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null)
  const [canExecute, setCanExecute] = useState<{canExecute: boolean; reason: string} | null>(null)
  
  const proposalDraftAbi = ProposalDraftABI as Abi
  const votingAbi = VotingABI as Abi
  const executionAbi = ExecutionABI as Abi
  const pmAddr = CONTRACTS.proposalDraftManager as Address
  const votingAddr = CONTRACTS.votingEngine as Address
  const execAddr = CONTRACTS.executionEngine as Address

  const refresh = useCallback(async () => {
    if (!publicClient || !proposalId) return
    setIsLoading(true)
    setError(null)
    try {
      const p: any = await publicClient.readContract({ address: pmAddr, abi: proposalDraftAbi, functionName: 'getProposal', args: [proposalId], authorizationList : [] })
      setProposal({ id: Number(p.id), proposer: p.proposer, proposalType: Number(p.proposalType), title: p.title, description: p.description, status: Number(p.status), createdAt: Number(p.createdAt), votingStartedAt: Number(p.votingStartedAt), votingEndedAt: Number(p.votingEndedAt), executedAt: Number(p.executedAt), blockNumber: Number(p.blockNumber) })

      // action data (if action proposal)
      try {
        const a = await publicClient.readContract({ address: pmAddr, abi: proposalDraftAbi, functionName: 'getActionData', args: [proposalId], authorizationList : [] })
        setActionData(a)
      } catch {
        setActionData(null)
      }

      // rule change
      try {
        const r: any = await publicClient.readContract({ address: pmAddr, abi: proposalDraftAbi, functionName: 'getRuleChangeData', args: [proposalId], authorizationList : [] })
        setRuleChange({ changeType: Number(r.changeType), oldValue: Number(r.oldValue), newValue: Number(r.newValue), oldAddress: r.oldAddress as string, newAddress: r.newAddress as string })
      } catch {
        setRuleChange(null)
      }

      // sponsorship
      try {
        const s = await publicClient.readContract({ address: pmAddr, abi: proposalDraftAbi, functionName: 'getSponsorshipStatus', args: [proposalId], authorizationList : [] })
        setSponsorship({ sponsorCount: Number(s[0]), partyCount: Number(s[1]), thresholdMet: Boolean(s[2]) })
      } catch { setSponsorship(null) }

      // voting results
      try {
        const v:any = await publicClient.readContract({ address: votingAddr, abi: votingAbi, functionName: 'getFullVotingResult', args: [proposalId], authorizationList : [] })
        setVoteResult({ approvalVotes: Number(v.approvalVotes), rejectionVotes: Number(v.rejectionVotes), totalVotesCast: Number(v.totalVotesCast), quorumMet: Boolean(v.quorumMet), approvalThresholdMet: Boolean(v.approvalThresholdMet), approved: Boolean(v.approved) })
      } catch{ setVoteResult(null) }

      // canExecute
      try {
        const c = await publicClient.readContract({ address: execAddr, abi: executionAbi, functionName: 'canExecuteProposal', args: [proposalId], authorizationList : [] })
        setCanExecute({ canExecute: Boolean(c[0]), reason: String(c[1]) })
      } catch{ setCanExecute(null) }

    } catch (e: unknown) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, proposalId, pmAddr, proposalDraftAbi, votingAddr, votingAbi, execAddr, executionAbi])

  useEffect(() => { void refresh() }, [refresh])

  return { proposal, actionData, ruleChange, sponsorship, voteResult, canExecute, isLoading, error, refresh }
}
