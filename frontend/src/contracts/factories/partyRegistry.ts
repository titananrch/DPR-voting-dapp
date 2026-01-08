import { Contract } from "ethers";
import PartyRegistryABI from "../abi/PartyRegistry.json";
import addresses from "../addresses.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPartyRegistry(provider: any) {
  if (!provider) return null;

  const address = addresses.localhost.partyRegistry;
  if (!address) {
    throw new Error("PartyRegistry address missing");
  }
  return new Contract(address, PartyRegistryABI, provider);
}
