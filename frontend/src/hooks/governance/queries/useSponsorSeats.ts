import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { getProposalSponsors } from '../../../domain/governance/aggregator'
import { getPartyName } from '../../../domain/governance/parties'
import { publicClient } from '../../../domain/governance/aggregator'
import SeatNFTABI from '../../../contracts/abi/SeatNFT.json'
import addresses from '../../../contracts/addresses.json'

export interface SponsorSeatInfo {
  seatId: number
  partyId: number
  partyName: string
}

const getAddr = (key: keyof typeof addresses.localhost) =>
  addresses.localhost[key] as Address

export function useSponsorSeats(proposalId: bigint | number | undefined) {
  const queryKey = [
    'governance',
    'sponsorSeats',
    proposalId !== undefined ? proposalId.toString() : null
  ] as const
  const enabled = proposalId !== undefined && proposalId !== null

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!enabled) {
        return []
      }

      const seatIds = await getProposalSponsors(proposalId!)
      if (seatIds.length === 0) {
        return []
      }

      const seatsWithParties = await Promise.all(
        seatIds.map(async (seatId) => {
          try {
            const partyId = await publicClient.readContract({
              address: getAddr('seatNft'),
              abi: SeatNFTABI,
              functionName: 'getPartyOfSeat',
              args: [BigInt(seatId)],
              authorizationList: undefined
            }) as bigint

            return {
              seatId: Number(seatId),
              partyId: Number(partyId),
              partyName: getPartyName(partyId),
            }
          } catch (error) {
            console.error(`Error fetching party for seat ${seatId}:`, error)
            return null
          }
        })
      )

      return seatsWithParties.filter(Boolean) as SponsorSeatInfo[]
    },
    enabled,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  })
}