"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PartiesSectionProps {
  parties: any[];
  members: Record<number, string[]>;
  selectedPartyId: number | null;
}

export default function PartiesSection({
  parties,
  members,
  selectedPartyId,
}: PartiesSectionProps) {
  const visibleParties = selectedPartyId
    ? parties.filter((p) => p.id === selectedPartyId)
    : parties;

  const selectedParty = selectedPartyId
    ? parties.find((p) => p.id === selectedPartyId)
    : null;

  return (
    <section className="">
      {/* CONTEXTUAL H2 */}
      <h2 className="text-xl font-bold mt-6">
        {selectedParty ? `${selectedParty.id}. ${selectedParty.name}` : ""}
        <span className="text-gray-500"> {selectedParty ? (selectedParty.active ? "(Active)" : "(Not Active)") : ""}</span>
      </h2>

      {visibleParties.map((p) => (
        <div key={p.id}>
          {!selectedParty && (
            <h2 className="font-bold text-xl">
              {p.id}. {p.name}{" "}
              <span className="text-gray-500">
                ({p.active ? "Active" : "Not Active"})
              </span>
            </h2>
          )}
          <div className="border border-white/10 bg-[#171717] rounded-lg mt-2 mb-6 px-4 py-2">
            {/* MEMBERS */}
            <ol className="mt-2 ml-5 list-decimal text-sm font-mono text-[#a1a1a1]">
              {members[p.id]?.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ol>
          </div>
        </div>
      ))}
    </section>
  );
}
