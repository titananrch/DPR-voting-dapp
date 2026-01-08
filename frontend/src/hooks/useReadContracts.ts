import { ethers } from "ethers"
import { contracts } from "../lib/contracts"

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545")



export async function getParties() {
  const partyRegistry = new ethers.Contract(
    contracts.partyRegistry.address,
    contracts.partyRegistry.abi,
    provider
  )  

  const count = await partyRegistry.partyCount()
  const parties = []

  for (let i = 1; i < count; i++) {
    const party = await partyRegistry.parties(i)
    parties.push({
        id: Number(party[0]),      // BigInt → number
        name: party[1],            // string
        active: party[2],          // boolean
    })
    console.log("Party raw:", party)
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

    topics.push({
      id: Number(t[0]),
      title: t[1],
      isActive: Boolean(t[2]),
    })
  }

  return topics
}