"use client";

import { useEffect, useState } from "react";
import { getMemberRegistry } from "../contracts/factories/memberRegistry";
import { useEthersProvider } from "../lib/useProvider";

export function useReadMembers(partyId?: number) {
  const { provider } = useEthersProvider();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!provider) return;

    const load = async () => {
      const contract = getMemberRegistry(provider);
      if (!contract) return;

      // If contract exposes an event or lookup, we can query; fallback: try to read sequentially if count exists
      try {
        // Try to read by listening to MemberRegistered events
        const filter = partyId ? contract.filters.MemberRegistered(null, partyId) : contract.filters.MemberRegistered();
        const events = await contract.queryFilter(filter, 0, "latest");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = events.map((ev: any) => ({ member: ev.args[0], partyId: Number(ev.args[1]) }));
        setMembers(results);
      } catch (err) {
        console.error("useReadMembers error", err);
        setMembers([]);
      }

      setLoading(false);
    };

    load();
  }, [provider, partyId]);

  return { members, loading };
}
