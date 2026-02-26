export type GovernancePermissions = {
  isSeatHolder: boolean
  canVote: boolean
  canPropose: boolean
  canExecute: boolean
  seatCount: number
  seats: bigint[]
}

export function derivePermissions(seats?: bigint[]): GovernancePermissions {
  const hasSeat = (seats?.length ?? 0) > 0
  return {
    isSeatHolder: hasSeat,
    canVote: hasSeat,
    canPropose: hasSeat,
    canExecute: hasSeat,
    seatCount: seats?.length ?? 0,
    seats: seats ?? []
  }
}
