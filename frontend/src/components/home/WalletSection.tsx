"use client";

import { Dispatch, SetStateAction, useEffect, useRef } from "react";

interface WalletSectionProps {
  connectionState: "idle" | "connecting" | "connected";
  account: string | null;
  walletError: string | null;
  connectWallet: () => void;
  isAdminUser: boolean;
  setShowAdminModal: Dispatch<SetStateAction<boolean>>;
}

export default function WalletSection({
  connectionState,
  account,
  walletError,
  connectWallet,
  isAdminUser,
  setShowAdminModal,
}: WalletSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (sectionRef.current) {
        const height = sectionRef.current.offsetHeight;
        document.documentElement.style.setProperty("--header-height", `${height}px`);
      }
    };

    // Initial measurement
    updateHeaderHeight();

    // Handle window resize
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    if (sectionRef.current) {
      resizeObserver.observe(sectionRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="border-b border-white/10 py-6 px-10 sticky top-0 z-50 bg-[#0E0E0E] flex justify-between items-center"
    >
      {connectionState === "idle" && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Not connected to wallet</p>
          <button
            onClick={connectWallet}
            className="px-4 py-2 border border-white/20 text-sm rounded hover:bg-white/10 cursor-pointer"
          >
            Connect MetaMask
          </button>
          {walletError && (
            <p className="text-sm text-red-600 mt-2">Error: {walletError}</p>
          )}
        </div>
      )}

      {connectionState === "connecting" && (
        <div className="flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="text-sm text-gray-600">Connecting wallet...</p>
        </div>
      )}

      {connectionState === "connected" && (
        <div className="flex items-center justify-between w-full">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Wallet Connected</p>
            <p className="text-sm text-[#a1a1a1] font-mono">{account}</p>
            {isAdminUser && (
              <p className="text-sm text-green-600 font-semibold">👤 Admin Account</p>
            )}
          </div>

          {isAdminUser && (
            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowAdminModal(true)}
                className="ml-4 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
              >
                Manage Parliament
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
