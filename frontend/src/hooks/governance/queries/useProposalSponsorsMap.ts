import { useQuery } from '@tanstack/react-query'
import { getProposalSponsorParty, getProposalSponsors } from '../../../domain/governance/aggregator'
import { getPartyName } from '../../../domain/governance/parties'

export interface SponsorSeatInfo {
  seatId: number
  partyId: number | null
  partyName: string
}

/**
 * Fetch sponsor data for multiple proposals at once.
 * Centralized at dashboard level to avoid per-card fetches on expand.
 *
 * Returns a map of proposalId -> SponsorSeat[]
 *
 * @param proposalIds List of proposal IDs to fetch sponsors for
 * @returns Record<proposalId, SponsorSeatInfo[]>
 */
export function useProposalSponsorsMap(proposalIds: number[]) {
  // Create stable query key
  const idsKey = proposalIds.length > 0 ? proposalIds.join(',') : 'empty'

  return useQuery<Record<number, SponsorSeatInfo[]>>({
    queryKey: [
      'governance',
      'proposal-sponsors-map',
      idsKey,
    ],
    queryFn: async () => {
      if (proposalIds.length === 0) {
        return {}
      }

      // Fetch sponsor data for all proposals in parallel.
      // Let the query fail visibly instead of silently converting sponsor fetch
      // failures into an empty array that looks like "no sponsors".
      const results = await Promise.all(
        proposalIds.map(async (proposalId) => {
          const seatIds = await getProposalSponsors(BigInt(proposalId))

          if (seatIds.length === 0) {
            return [proposalId, []] as const
          }

          const seatsWithParties = await Promise.all(
            seatIds.map(async (seatId) => {
              const partyId = await getProposalSponsorParty(
                BigInt(proposalId),
                BigInt(seatId),
              )

              return {
                seatId: Number(seatId),
                partyId,
                partyName:
                  partyId === null
                    ? 'Historical party unavailable'
                    : getPartyName(partyId),
              }
            })
          )

          return [proposalId, seatsWithParties] as const
        })
      )

      return Object.fromEntries(results) as Record<number, SponsorSeatInfo[]>
    },
    enabled: proposalIds.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: 10_000,
  })
}
