/**
 * Party mapping from genesis state
 * Provides consistent party ID to name mapping throughout the application
 */

export const PARTY_MAP: Record<number, string> = {
  1: "Golkar",
  2: "PDIP",
  3: "Democrat",
  4: "Nasdem",
  5: "Gerindra"
}

export function getPartyName(partyId: number | bigint): string {
  const id = typeof partyId === 'bigint' ? Number(partyId) : partyId
  return PARTY_MAP[id] ?? `Unknown Party (${id})`
}

export function getAllParties() {
  return Object.entries(PARTY_MAP).map(([id, name]) => ({
    id: Number(id),
    name,
  }))
}
