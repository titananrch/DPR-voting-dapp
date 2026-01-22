"use client";

import { useEffect, useState } from "react";
import { getVotingTopicManager } from "../contracts/factories/votingTopicManager";
import { useEthersProvider } from "../lib/useProvider";

export function UseReadTopics() {
  const { provider } = useEthersProvider();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [topics, setTopics] = useState<any[]>([]);

  useEffect(() => {
    if (!provider) return;

    const load = async () => {
      const contract = getVotingTopicManager(provider);
      if (!contract) return;

      try {
        const count = await contract.topicCount();
        const results = [];
        for (let i = 1; i <= Number(count); i++) {
          const t = await contract.getTopic(i);
          const options = await contract.getVoteOptions(i);
          results.push({ id: Number(t.id), title: t.title, status: t.status, options });
        }
        setTopics(results);
      } catch (err) {
        console.error("useReadTopics error", err);
        setTopics([]);
      }
    };

    load();
  }, [provider]);

  return topics;
}
