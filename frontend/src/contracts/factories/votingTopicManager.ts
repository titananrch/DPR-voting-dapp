import { Contract } from "ethers";
import VotingTopicManagerABI from "../abi/VotingTopicManager.json";
import addresses from "../addresses.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getVotingTopicManager(provider: any) {
  if (!provider) return null;

  const address = addresses.localhost.topicManager;
  if (!address) {
    throw new Error("VotingTopicManager address missing");
  }
  return new Contract(address, VotingTopicManagerABI, provider);
}
