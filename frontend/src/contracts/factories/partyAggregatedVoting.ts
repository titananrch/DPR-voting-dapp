import { Contract } from "ethers";
import PartyAggregatedVotingABI from "../abi/PartyAggregatedVoting.json";
import addresses from "../addresses.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPartyAggregatedVoting(provider: any) {
  if (!provider) return null;

  const address = addresses.localhost.partyVoting;
  if (!address) {
    throw new Error("PartyAggregatedVoting address missing");
  }
  return new Contract(address, PartyAggregatedVotingABI, provider);
}
