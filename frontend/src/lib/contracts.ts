import addresses from "../contracts/addresses.json"

import ExecutionEngineABI from "../contracts/abi/ExecutionEngine.json"
import GovernanceConfigABI from "../contracts/abi/GovernanceConfig.json"
import ProposalDraftManagerABI from "../contracts/abi/ProposalDraftManager.json"
import SeatNFTABI from "../contracts/abi/SeatNFT.json"
import VotingEngineABI from "../contracts/abi/VotingEngine.json"

export const contracts = {
  executionEngine: {
    address: addresses.localhost.executionEngine as `0x${string}`,
    abi: ExecutionEngineABI
  },
  governanceConfig: {
    address: addresses.localhost.governanceConfig as `0x${string}`,
    abi: GovernanceConfigABI
  },
  proposalDraftManager: {
    address: addresses.localhost.proposalDraftManager as `0x${string}`,
    abi: ProposalDraftManagerABI
  },
  seatNft: {
    address: addresses.localhost.seatNft as `0x${string}`,
    abi: SeatNFTABI
  },
  votingEngine: {
    address: addresses.localhost.votingEngine as `0x${string}`,
    abi: VotingEngineABI
  }
}