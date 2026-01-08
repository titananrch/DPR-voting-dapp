"use client";

import { useEffect, useState } from "react";
import { getPartyRegistry } from "../contracts/factories/partyRegistry";
import { useEthersProvider } from "../lib/useProvider";

export function useReadParties() {
  const { provider } = useEthersProvider();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!provider) return;

    const load = async () => {
      const contract = getPartyRegistry(provider);
      if (!contract) return;

      const count = await contract.partyCount();
      const results = [];

      for (let i = 1; i <= Number(count); i++) {
        const party = await contract.parties(i);
        results.push(party);
      }

      setParties(results);
      setLoading(false);
    };

    load();
  }, [provider]);

  return { parties, loading };
}