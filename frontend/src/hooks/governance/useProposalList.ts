/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { type Abi, Address } from 'viem'
import ProposalDraftABI from '../../contracts/abi/ProposalDraftManager.json'
import { CONTRACTS } from '../../contracts/addresses'
import type { Proposal } from './useProposal'

export function useProposalList() {
  const publicClient = usePublicClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [allProposals, setAllProposals] = useState<Proposal[]>([])
  const [draftProposals, setDraftProposals] = useState<Proposal[]>([])
  const [votingProposals, setVotingProposals] = useState<Proposal[]>([])
  const [closedProposals, setClosedProposals] = useState<Proposal[]>([])
  const [proposalCount, setProposalCount] = useState<number>(0)
  const { address } = useAccount()

  const proposalDraftABI = ProposalDraftABI as Abi
  const contract = CONTRACTS.proposalDraftManager as Address
    
  const refresh = useCallback(async () => {
    if (!publicClient) return
    setIsLoading(true)
    setError(null)
    try {
      const count = Number(await publicClient.readContract({ address: contract, abi: proposalDraftABI, functionName: 'getProposalCount', account: address, authorizationList: [{ account: address }] }))
      setProposalCount(count)

      // fetch lists
      const [draftIds, votingIds, closedIds] = await Promise.all([
        publicClient.readContract({ address: contract, abi: proposalDraftABI, functionName: 'getDraftProposals', account: address, authorizationList: [{ account: address }] }) as Promise<any[]>,
        publicClient.readContract({ address: contract, abi: proposalDraftABI, functionName: 'getVotingProposals', account: address, authorizationList: [{ account: address }] }) as Promise<any[]>,
        publicClient.readContract({ address: contract, abi: proposalDraftABI, functionName: 'getClosedProposals', account: address, authorizationList: [{ account: address }] }) as Promise<any[]>,
      ])

      const toProposals = async (ids: any[]): Promise<Proposal[]> => {
        const res = await Promise.all(ids.map(async (id: any) => {
          const p: any = await publicClient.readContract({ address: contract, abi: proposalDraftABI, functionName: 'getProposal', args: [Number(id)], account: address, authorizationList: [{ account: address }] })
          return { id: Number(p.id), proposer: p.proposer, proposalType: Number(p.proposalType), title: p.title, description: p.description, status: Number(p.status), createdAt: Number(p.createdAt), votingStartedAt: Number(p.votingStartedAt), votingEndedAt: Number(p.votingEndedAt), executedAt: Number(p.executedAt), blockNumber: Number(p.blockNumber) } as Proposal
        }))
        return res
      }

      const [drafts, votings, closeds] = await Promise.all([toProposals(draftIds || []), toProposals(votingIds || []), toProposals(closedIds || [])])
      setDraftProposals(drafts)
      setVotingProposals(votings)
      setClosedProposals(closeds)

      setAllProposals([...drafts, ...votings, ...closeds].sort((a,b)=> b.id - a.id))

    } catch (e: unknown) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [address, contract, proposalDraftABI, publicClient])

  useEffect(() => { void refresh() }, [refresh])

  return { allProposals, draftProposals, votingProposals, closedProposals, proposalCount, isLoading, error, refresh }
}
