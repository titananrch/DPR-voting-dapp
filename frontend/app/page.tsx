"use client"

import { useAccount, useConnect, useDisconnect } from "wagmi"
import { injected } from "wagmi/connectors"
import GovernanceDashboard from "../src/components/GovernanceDashboard"
import Background from "../src/components/Background"

export default function HomePage() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <main className="relative flex flex-col min-h-screen">
      <Background />

      {/* Header */}
      <header className="border-b border-white/10 py-6 px-10 sticky top-0 z-50 bg-[#0E0E0E] flex justify-between items-center">
        {!isConnected && !isConnecting && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Not connected to wallet</p>
            <button
              onClick={() => connect({ connector: injected() })}
              className="px-4 py-2 border border-white/20 text-sm rounded hover:bg-white/10 cursor-pointer"
            >
              Connect MetaMask
            </button>
          </div>
        )}

        {isConnecting && (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-sm text-gray-600">Connecting wallet...</p>
          </div>
        )}

        {isConnected && (
          <div className="flex items-center justify-between w-full">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Wallet Connected</p>
              <p className="text-sm text-[#a1a1a1] font-mono">{address}</p>
            </div>
            <button
              onClick={() => disconnect()}
              className="px-3 py-1 border border-white/20 text-xs rounded hover:bg-white/10 cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      {!isConnected ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white text-md">Connect Wallet to Continue</p>
        </div>
      ) : (
        <div className="flex-1 py-8">
          <GovernanceDashboard />
        </div>
      )}

      {/* Footer */}
      {isConnected && (
        <footer className="border-t border-white/10 bg-black/10 p-6 text-center text-sm text-white/50 flex mx-auto w-full justify-center gap-1">
          <p>&copy; 2026 Democratic Parliament Voting System.</p>
          <a
            href="https://github.com/titananrch"
            className="hover:text-white hover:underline"
          >
            titananrch
          </a>
        </footer>
      )}
    </main>
  )
}
