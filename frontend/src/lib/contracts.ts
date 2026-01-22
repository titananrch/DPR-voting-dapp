import addresses from "../contracts/addresses.json"

import PartyRegistryABI from "../contracts/abi/PartyRegistry.json"
import MemberRegistryABI from "../contracts/abi/MemberRegistry.json"
import VotingTopicManagerABI from "../contracts/abi/VotingTopicManager.json"
import PartyAggregatedVotingABI from "../contracts/abi/PartyAggregatedVoting.json"

export const contracts = {
  partyRegistry: {
    address: addresses.localhost.partyRegistry as `0x${string}`,
    abi: PartyRegistryABI
  },
  memberRegistry: {
    address: addresses.localhost.memberRegistry as `0x${string}`,
    abi: MemberRegistryABI
  },
  topicManager: {
    address: addresses.localhost.topicManager as `0x${string}`,
    abi: VotingTopicManagerABI
  },
  partyAggregatedVoting: {
    address: addresses.localhost.partyVoting as `0x${string}`,
    abi: PartyAggregatedVotingABI
  }
}