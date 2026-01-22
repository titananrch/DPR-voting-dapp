/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
  getParties,
  getMembersByParty,
  getTopics,
  getUserVote,
  getResults,
} from "../src/hooks/useReadContracts";
import { vote } from "../src/hooks/useWriteContracts";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function HomePage() {
  const [account, setAccount] = useState<string | null>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [members, setMembers] = useState<Record<number, string[]>>({});

  // Get wallet address
  useEffect(() => {
    async function loadAccount() {
      if (!window.ethereum) return;

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      setAccount(accounts[0]);
    }

    loadAccount();
  }, []);

  async function loadData(account: string) {
    // Parties
    const partiesData = await getParties();
    setParties(partiesData);

    // Members
    const membersMap: Record<number, string[]> = {};
    for (const party of partiesData) {
      membersMap[party.id] = await getMembersByParty(party.id);
    }
    setMembers(membersMap);

    // Check membership
    const isMember = Object.values(membersMap)
      .flat()
      .some((addr) => addr.toLowerCase() === account.toLowerCase());

    // Topics
    const rawTopics = await getTopics();

    const enrichedTopics = await Promise.all(
      rawTopics.map(async (t) => {
        const votedOptionId = await getUserVote(t.id, account);
        const hasVoted = votedOptionId !== -1; // Changed from !== 0 to !== -1

        console.log(`Topic ${t.id}: votedOptionId = ${votedOptionId}, hasVoted = ${hasVoted}`); // DEBUG

        // RESULTS (only if CLOSED)
        let results = null;

        if (t.status === 2) {
          const counts = await getResults(t.id);
          const totalVotes = counts.reduce((a, b) => a + b, 0);

          results = t.options.map((opt, idx) => {
            const count = counts[idx] ?? 0;
            const percentage =
              totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);

            return {
              optionId: opt.id,
              label: opt.label,
              count,
              percentage,
            };
          });
        }

        return {
          ...t,
          hasVoted,
          votedOptionId: hasVoted ? votedOptionId : null,
          canVote: t.isActive && isMember && !hasVoted,
          results,
        };
      }),
    );

    setTopics(enrichedTopics);
  }

  useEffect(() => {
    if (!account) return;

    (async () => {
      await loadData(account);
    })();
  }, [account]);

  async function handleVote(topicId: number, optionId: number) {
    try {
      await vote(topicId, optionId);

      // reload everything after tx
      await loadData(account!);
    } catch (err: any) {
      alert(err.message ?? "Voting failed");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <p className="text-sm text-gray-500">
        Connected as: {account ?? "Not connected"}
      </p>

      {/* PARTIES */}
      <section>
        <h2 className="text-xl font-bold">Parties & Members</h2>
        {parties.map((p) => (
          <div key={p.id} className="border p-3 mt-2">
            <p>
              <strong>
                {p.id}. {p.name}
              </strong>{" "}
              ({p.active ? "Active" : "Not Active"})
            </p>
            <ul className="ml-4 list-disc">
              {members[p.id]?.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* TOPICS */}
      <section>
        <h2 className="text-xl font-bold">Topics</h2>

        {topics.map((t) => (
          <div key={t.id} className="border p-3 mt-2">
            <p>
              <strong>{t.title}</strong>
            </p>

            <p>Status: {t.statusLabel}</p>

            {/* EARLY */}
            {t.status === 0 && (
              <div className="mt-2 text-sm text-gray-600">
                <p className="font-medium">Options:</p>
                <ul className="list-disc ml-5">
                  {t.options.map((o) => (
                    <li key={o.id}>{o.label}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* OPEN */}
            {t.status === 1 && (
              <div className="flex flex-col gap-2 mt-3">
                {t.hasVoted && (
                  <p className="text-sm text-green-600">
                    You voted:{" "}
                    <strong>
                      {t.options.find((o) => o.id === t.votedOptionId)?.label}
                    </strong>
                  </p>
                )}

                <div className="flex gap-2">
                  {t.options.map((option) => {
                    const isSelected = option.id === t.votedOptionId;

                    return (
                      <button
                        key={option.id}
                        disabled={t.hasVoted}
                        onClick={() => handleVote(t.id, option.id)}
                        className={`px-4 py-2 border rounded
              ${t.hasVoted ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
              ${isSelected ? "border-green-600 bg-green-100" : ""}
            `}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CLOSED */}
            {t.status === 2 && t.results && (
              <div className="mt-3 space-y-2">
                {t.results.map((r) => {
                  const isUserChoice = r.optionId === t.votedOptionId;

                  return (
                    <div key={r.optionId}>
                      <div className="flex justify-between text-sm">
                        <span
                          className={
                            isUserChoice ? "font-semibold text-green-700" : ""
                          }
                        >
                          {r.label}
                          {isUserChoice && " (your vote)"}
                        </span>
                        <span>{r.percentage}%</span>
                      </div>

                      <div className="w-full h-2 bg-gray-200 rounded">
                        <div
                          className={`h-2 rounded ${
                            isUserChoice ? "bg-green-500" : "bg-gray-500"
                          }`}
                          style={{ width: `${r.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
