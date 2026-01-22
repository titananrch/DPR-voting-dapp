import { ethers } from "ethers"
import { contracts } from "../lib/contracts"

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545")

// Sentinel value to indicate "not voted" (-1 since option IDs are 0+)
const NOT_VOTED = -1;

export async function getParties() {
  const partyRegistry = new ethers.Contract(
    contracts.partyRegistry.address,
    contracts.partyRegistry.abi,
    provider
  )  
  const count = await partyRegistry.partyCount()
  const parties = []
  for (let i = 1; i <= count; i++) {
    const party = await partyRegistry.parties(i)
    parties.push({
        id: Number(party[0]),      // BigInt → number
        name: party[1],            // string
        active: party[2],          // boolean
    })
  }
  return parties
}

export async function getMembersByParty(partyId: number) {
  const memberRegistry = new ethers.Contract(
    contracts.memberRegistry.address,
    contracts.memberRegistry.abi,
    provider
  )
  return await memberRegistry.getMembersByParty(partyId)
}

export async function getTopics() {
  const topicManager = new ethers.Contract(
    contracts.topicManager.address,
    contracts.topicManager.abi,
    provider
  )

  const count = await topicManager.topicCount()
  const topics = []

  for (let i = 1; i <= Number(count); i++) {
    const t = await topicManager.topics(i)
    const rawOptions = await topicManager.getVoteOptions(i)

    const status = Number(t.status ?? t[2])
    const isActive = status === 1

    topics.push({
      id: Number(t.id ?? t[0]),
      title: t.title ?? t[1],
      status,
      statusLabel: topicStatusLabel(status),
      isActive,

      options: rawOptions.map((opt) => ({
        id: Number(opt.id),
        label: opt.label,
      })),
    })
  }

  return topics
}

// Status Helper
export function topicStatusLabel(status: number) {
  switch (status) {
    case 0:
      return "Early"
    case 1:
      return "Active"
    case 2:
      return "Closed"
    default:
      return "Unknown"
  }
}

export async function getUserVote(
  topicId: number,
  user: string
): Promise<number> {
  const partyVoting = new ethers.Contract(
    contracts.partyAggregatedVoting.address,
    contracts.partyAggregatedVoting.abi,
    provider
  );

  try {
    // Ensure address is checksummed and properly formatted
    const checksummedUser = ethers.getAddress(user);
    
    const optionId = await partyVoting.userVote(topicId, checksummedUser);
    const result = Number(optionId);
    
    // Return the actual option ID (even if it's 0)
    return result;
  } catch (error) {
    console.error(`Error getting user vote for topic ${topicId}:`, error);
    return NOT_VOTED;
  }
}

export async function getResults(topicId: number) {
  const partyVoting = new ethers.Contract(
    contracts.partyAggregatedVoting.address,
    contracts.partyAggregatedVoting.abi,
    provider
  );

  const partyRegistry = new ethers.Contract(
    contracts.partyRegistry.address,
    contracts.partyRegistry.abi,
    provider
  );

  const topicManager = new ethers.Contract(
    contracts.topicManager.address,
    contracts.topicManager.abi,
    provider
  );

  try {
    // Get all options for this topic
    const options = await topicManager.getVoteOptions(topicId);
    const optionCount = options.length;

    // Get all parties
    const partyCount = await partyRegistry.partyCount();

    // Initialize results array
    const results = new Array(optionCount).fill(0);

    // Sum votes across all parties
    for (let optionId = 0; optionId < optionCount; optionId++) {
      for (let partyId = 1; partyId <= partyCount; partyId++) {
        const votes = await partyVoting.voteCounts(topicId, partyId, optionId);
        results[optionId] += Number(votes);
      }
    }
    return results;
  } catch (error) {
    console.error(`Error getting results for topic ${topicId}:`, error);
    return [];
  }
}