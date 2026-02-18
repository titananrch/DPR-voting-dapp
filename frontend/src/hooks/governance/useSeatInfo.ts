import { useCallback, useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { type Address, type Abi } from 'viem'
import { CONTRACTS } from '../../contracts/addresses'
import SeatNFTABI from '../../contracts/abi/SeatNFT.json'

export type SeatAction = {
  seatId: number
  from: string
  to: string
  partyId: number
  blockNumber: number
  timestamp: number
}

export function useSeatInfo(userAddress?: string) {
  const publicClient = usePublicClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [userSeatCount, setUserSeatCount] = useState<number>(0)
  const [userSeats, setUserSeats] = useState<number[]>([])
  const [totalSeatsIssued, setTotalSeatsIssued] = useState<number>(0)
  const [maxSupply, setMaxSupply] = useState<number | null>(null)
  const seatABI = SeatNFTABI as Abi
  const contract = CONTRACTS.seatNft as Address

  const refresh = useCallback(async () => {
    if (!publicClient) return
    setIsLoading(true)
    setError(null)
    try {
      const calls: Promise<unknown>[] = []
      calls.push(publicClient.readContract({ address: contract, abi: seatABI, functionName: 'totalSupply', authorizationList: userAddress ? [{ account: userAddress }] : undefined }))
      calls.push(publicClient.readContract({ address: contract, abi: seatABI, functionName: 'maxSupply', authorizationList: userAddress ? [{ account: userAddress }] : undefined  }))

      if (userAddress) {
        calls.push(publicClient.readContract({ address: contract, abi: seatABI, functionName: 'balanceOf', args: [userAddress], authorizationList: [{ account: userAddress }] }))
        calls.push(publicClient.readContract({ address: contract, abi: seatABI, functionName: 'getSeatsOfHolder', args: [userAddress], authorizationList: [{ account: userAddress }] }))
      }

      const results = await Promise.all(calls)
      let idx = 0
      const totalSupply = Number(results[idx++])
      const maxSup = Number(results[idx++])
      setTotalSeatsIssued(totalSupply)
      setMaxSupply(maxSup)

      if (userAddress) {
        const balance = Number(results[idx++])
        const seats = (results[idx++] as unknown[]).map((v) => Number(v))
        setUserSeatCount(balance)
        setUserSeats(seats)
      }

    } catch (e: unknown) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [contract, publicClient, seatABI, userAddress])

  useEffect(() => { void refresh() }, [refresh])

  async function getSeatHistory(): Promise<SeatAction[]> {
    if (!publicClient) return []
    // seat history getter exists - call it
    try {
      const res = await publicClient.readContract({ address: contract, abi: seatABI, functionName: 'getSeatHistory', args: userAddress ? [userAddress] : [], authorizationList: userAddress ? [{ account: userAddress }] : undefined })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (res as any[]).map((r) => ({ seatId: Number(r.seatId), from: r.from, to: r.to, partyId: Number(r.partyId), blockNumber: Number(r.blockNumber), timestamp: Number(r.timestamp) }))
    } catch (e: unknown) {
      setError(e as Error)
      return []
    }
  }

  return {
    userSeatCount,
    userSeats,
    totalSeatsIssued,
    maxSupply,
    isLoading,
    error,
    refresh,
    getSeatHistory,
  }
}
