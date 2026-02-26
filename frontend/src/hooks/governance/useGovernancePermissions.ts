import { useAccount } from 'wagmi'
import { derivePermissions } from '../../domain/governance/permissions'
import { useSeatInfo } from './queries/useSeatInfo'
import type { Address } from 'viem'

export function useGovernancePermissions() {
  const { address, isConnected } = useAccount()
  const addr = (address ?? undefined) as Address | undefined

  const seatsQuery = useSeatInfo(addr)
  const seats = seatsQuery.data ?? []

  const perms = derivePermissions(seats)

  return {
    isConnected,
    address,
    isSeatHolder: perms.isSeatHolder,
    canVote: perms.canVote,
    canPropose: perms.canPropose,
    canExecute: perms.canExecute,
    seats: perms.seats,
    isLoading: seatsQuery.isLoading
  }
}
