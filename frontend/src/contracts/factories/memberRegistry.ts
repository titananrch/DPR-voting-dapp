import { Contract } from "ethers";
import MemberRegistryABI from "../abi/MemberRegistry.json";
import addresses from "../addresses.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMemberRegistry(provider: any) {
  if (!provider) return null;

  const address = addresses.localhost.memberRegistry;
  if (!address) {
    throw new Error("MemberRegistry address missing");
  }
  return new Contract(address, MemberRegistryABI, provider);
}
