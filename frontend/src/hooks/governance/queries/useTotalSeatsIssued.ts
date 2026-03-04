import { useQuery } from '@tanstack/react-query'
import { publicClient } from '../../../domain/governance/aggregator'
import SeatNFTABI from '../../../contracts/abi/SeatNFT.json'
import { CONTRACTS } from '../../../contracts/addresses'

export function useTotalSeatsIssued() {
  return useQuery<number>({
    queryKey: ['governance', 'seats', 'totalSupply'],
    queryFn: async () => {
      const total = await publicClient.readContract({
        address: CONTRACTS.seatNft,
        abi: SeatNFTABI,
        functionName: 'totalSupply',
      })
      return Number(total)
    },
    staleTime: 5 * 60 * 1000,
  })
}
