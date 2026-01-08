"use client";
import { useEffect, useState } from "react";
import type { BrowserProvider, JsonRpcProvider, Eip1193Provider } from "ethers";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: {
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

type ProviderType = BrowserProvider | JsonRpcProvider;

export function useEthersProvider() {
  const [provider, setProvider] = useState<ProviderType | null>(null);
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        const p = new ethers.BrowserProvider(window.ethereum as Eip1193Provider);
        setProvider(p);
        try {
          const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
          if (accounts && accounts.length) setAccount(accounts[0]);
        } catch (_err) {
          console.log("Error fetching accounts", _err);
        }
        window.ethereum.on?.("accountsChanged", (accounts: string[]) => {
          setAccount(accounts.length ? accounts[0] : null);
        });
      } else {
        setProvider(new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545"));
      }
    };
    init();
  }, []);

  return { provider, account };
}