"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, createConfig, http } from "wagmi"
import { localhost } from "wagmi/chains"
import { injected } from "wagmi/connectors"
import { useState, type ReactNode } from "react"
import { ToastContainer } from "../src/components/Toast"

const wagmiConfig = createConfig({
  chains: [localhost],
  connectors: [injected()],
  transports: {
    [localhost.id]: http(process.env.NEXT_PUBLIC_RPC_URL ?? "http://localhost:8545"),
  },
})

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ToastContainer />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
