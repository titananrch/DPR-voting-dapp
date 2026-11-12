import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { getUserSeats } from '../../../domain/governance/aggregator'
import { publicClient } from '../../../domain/governance/aggregator'
import SeatNFTABI from '../../../contracts/abi/SeatNFT.json'
import addresses from '../../../contracts/addresses.json'
import { getPartyName } from '../../../domain/governance/parties'

export interface SeatDetail {
  seatId: number
  partyId: number
  partyName: string
}

const getAddr = (key: keyof typeof addresses.localhost) =>
  addresses.localhost[key] as Address

/**
 * Get detailed seat information with party names
 * @param address User's wallet address (required)
 * @param seatIds Optional: pre-fetched seat IDs (if not provided, will fetch via getUserSeats)
 */
export function useSeatDetails(address?: Address, seatIds?: number[]) {
  return useQuery<SeatDetail[]>({
    queryKey: [
      'governance',
      'seat-details',
      address ?? null,
      seatIds ? seatIds.map(s => s.toString()).join(',') : 'fetch'
    ],
    queryFn: async () => {
      if (!address) return []

      let seats = seatIds
      if (!seatIds) {
        console.debug('useSeatDetails: Fetching seats (seatIds not provided)')
        seats = await getUserSeats(address)
      } else {
        console.debug('useSeatDetails: Using provided seatIds', { count: seatIds.length })
      }

      if (!seats || seats.length === 0) return []

      // Fetch party for each seat
      const parties = await Promise.all(
        seats.map((seatId) =>
          publicClient.readContract({
            address: getAddr('seatNft'),
            abi: SeatNFTABI,
            functionName: 'getPartyOfSeat',
            args: [BigInt(seatId)],
            authorizationList: undefined
          }) as Promise<bigint>
        )
      )

      return seats.map((seatId, index) => {
        const partyId = Number(parties[index])
        return {
          seatId,
          partyId,
          partyName: getPartyName(partyId)
        }
      })
    },
    enabled: !!address,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: 10_000,
  })
}
