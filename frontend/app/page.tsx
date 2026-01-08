/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { getParties, getMembersByParty, getTopics } from "../src/hooks/useReadContracts"

export default function HomePage() {
  const [parties, setParties] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [members, setMembers] = useState<Record<number, string[]>>({})

  console.log("Parties:", parties)
  console.log("Members:", members)
  console.log("Topics:", topics)

  useEffect(() => {
    async function load() {
      const partiesData = await getParties()
      setParties(partiesData)

      const topicsData = await getTopics()
      setTopics(topicsData)

      const membersMap: Record<number, string[]> = {}
      for (const party of partiesData) {
        membersMap[party.id] = await getMembersByParty(party.id)
      }
      setMembers(membersMap)
    }

    load()
  }, [])

  return (
    <main className="p-6 space-y-6">
      <section>
        <h2 className="text-xl font-bold">Parties & Members</h2>
        {parties.map(p => (
          <div key={p.id} className="border p-3 mt-2">
            <p><strong>{p.id}. {p.name}</strong> ({ p.active ? "Active" : "Not Active" })</p>
            <ul className="ml-4 list-disc">
              {members[p.id]?.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-xl font-bold">Topics</h2>
        {topics.map(t => (
          <div key={t.id} className="border p-3 mt-2">
            <p><strong>{t.title}</strong></p>
            <p>Status: {t.isActive ? "Available" : "Not Available"}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
