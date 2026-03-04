import React, { ReactNode } from 'react'
import { useGovernancePermissions } from '../../../hooks/governance/useGovernancePermissions'

type SeatHolderGateProps = {
  children: ReactNode
  fallback?: ReactNode
}

export function SeatHolderGate({
  children,
  fallback = <p>Must hold a SeatNFT to perform this action.</p>,
}: SeatHolderGateProps) {
  const { isSeatHolder, isLoading } = useGovernancePermissions()

  // Loading state
  if (isLoading) {
    return <div>Checking permissions...</div>
  }

  // Not a seat holder
  if (!isSeatHolder) {
    return <>{fallback}</>
  }

  // Authorized
  return <>{children}</>
}
