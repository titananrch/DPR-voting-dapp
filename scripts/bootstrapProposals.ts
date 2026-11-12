import { ethers } from 'hardhat'

async function main() {
  const [owner, addr1, addr2, addr3, addr4, addr5, ...addrs] = await ethers.getSigners()

  // Get contract addresses from deployment
  const deploymentFile = require('../frontend/src/contracts/addresses.json')
  const addresses = deploymentFile.localhost

  console.log('Connecting to contracts...')
  const seatNFT = await ethers.getContractAt('SeatNFT', addresses.seatNft)
  const proposalManager = await ethers.getContractAt('ProposalDraftManager', addresses.proposalDraftManager)
  const votingEngine = await ethers.getContractAt('VotingEngine', addresses.votingEngine)
  const governanceConfig = await ethers.getContractAt('GovernanceConfig', addresses.governanceConfig)

  console.log('\n========== CREATING TEST PROPOSALS ==========\n')

  // Get some test addresses from genesis (addresses with seats)
  // From genesis-state.json:
  // addr1 (0x70997970C51812dc3A010C7d01b50e0d17dc79C8) has seat 2 (Golkar)
  // addr2 (0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC) has seat 3 (Golkar)
  // addr3 (0x90F79bf6EB2c4f870365E785982E1f101E93b906) has seat 4 (Golkar)
  // addr4 (0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65) has seat 5 (PDIP)

  const signer1 = addr1
  const signer2 = addr2
  const signer3 = addr3
  const signer4 = addr4

  // Get minProposalDelay for time advancing
  const minProposalDelay = await governanceConfig.minProposalDelay()
  console.log('Min Proposal Delay:', ethers.formatUnits(minProposalDelay, 0), 'seconds')

  // ============================================
  // TEST PROPOSAL 1: IN VOTING PHASE
  // ============================================
  console.log('\n--- PROPOSAL 1: IN VOTING PHASE ---')

  // Create draft proposal
  const tx1 = await proposalManager.connect(signer1).createDraftProposal(
    'Increase Quorum to 60%',
    'This proposal aims to increase the quorum requirement from 50% to 60% to ensure broader participation.',
    0, // Quorum change
    6000 // 60%
  )
  const receipt1 = await tx1.wait()
  console.log('✅ Test Proposal 1 created')

  // Get the proposal ID (should be 1)
  const proposalCount = await proposalManager.getProposalCount()
  const proposalId1 = Number(proposalCount)
  console.log('Proposal ID 1:', proposalId1)

  // Get seat IDs for sponsors (from genesis)
  const seatIds1 = await seatNFT.getSeatsOfHolder(signer1.address)
  const seatIds2 = await seatNFT.getSeatsOfHolder(signer2.address)
  const seatIds3 = await seatNFT.getSeatsOfHolder(signer3.address)
  const seatIds4 = await seatNFT.getSeatsOfHolder(signer4.address)

  console.log('Seat IDs:')
  console.log('  Signer1 (Golkar):', seatIds1.map(s => Number(s)))
  console.log('  Signer2 (Golkar):', seatIds2.map(s => Number(s)))
  console.log('  Signer3 (Golkar):', seatIds3.map(s => Number(s)))
  console.log('  Signer4 (PDIP):', seatIds4.map(s => Number(s)))

  // Support from 3 sponsors (2 Golkar + 1 PDIP = 2 parties)
  if (seatIds1.length > 0) {
    const supportTx1 = await proposalManager.connect(signer1).supportProposal(proposalId1, seatIds1[0])
    await supportTx1.wait()
    console.log('✅ Sponsor 1 (Golkar): Supported')
  }

  if (seatIds2.length > 0) {
    const supportTx2 = await proposalManager.connect(signer2).supportProposal(proposalId1, seatIds2[0])
    await supportTx2.wait()
    console.log('✅ Sponsor 2 (Golkar): Supported')
  }

  if (seatIds4.length > 0) {
    const supportTx3 = await proposalManager.connect(signer4).supportProposal(proposalId1, seatIds4[0])
    await supportTx3.wait()
    console.log('✅ Sponsor 3 (PDIP): Supported')
  }

  // Check sponsorship status
  const [sponsorCount, partyCount, thresholdMet] = await proposalManager.getSponsorshipStatus(proposalId1)
  console.log(`Sponsorship Status: ${Number(sponsorCount)} sponsors, ${Number(partyCount)} parties, Threshold Met: ${thresholdMet}`)

  // Proposal should now be Active - advance time to voting
  console.log('\n⏭️  Advancing time past minProposalDelay...')
  await ethers.provider.send('hardhat_mine', ['0x1000']) // Mine many blocks
  await ethers.provider.send('evm_increaseTime', [Number(minProposalDelay) + 1])
  await ethers.provider.send('hardhat_mine', ['0x1']) // Mine a block to update timestamp

  // Start voting
  const startVotingTx = await proposalManager.connect(signer1).startVoting(proposalId1)
  await startVotingTx.wait()
  console.log('✅ Voting started for Proposal 1')

  // ============================================
  // TEST PROPOSAL 2: DRAFT WITH 1 SUPPORTER
  // ============================================
  console.log('\n--- PROPOSAL 2: DRAFT (WAITING FOR SUPPORT) ---')

  const tx2 = await proposalManager.connect(signer3).createDraftProposal(
    'Change Voting Duration to 7 days',
    'Extend the voting period from 3 days to 7 days to allow more time for informed decisions.',
    1, // Voting Duration change
    604800 // 7 days in seconds
  )
  const receipt2 = await tx2.wait()
  console.log('✅ Test Proposal 2 created')

  const proposalId2 = Number(proposalCount) + 1
  console.log('Proposal ID 2:', proposalId2)

  // Add just 1 supporter (not enough for activation)
  if (seatIds3.length > 0) {
    const supportTx = await proposalManager.connect(signer3).supportProposal(proposalId2, seatIds3[0])
    await supportTx.wait()
    console.log('✅ Proposal 2: 1 supporter added (waiting for 2 more)')
  }

  const [sponsorCount2, partyCount2] = await proposalManager.getSponsorshipStatus(proposalId2)
  console.log(`Sponsorship Status: ${Number(sponsorCount2)} sponsors, ${Number(partyCount2)} parties`)

  // ============================================
  // TEST PROPOSAL 3: EXECUTED
  // ============================================
  console.log('\n--- PROPOSAL 3: EXECUTED ---')

  const tx3 = await proposalManager.connect(signer1).createDraftProposal(
    'Reduce Approval Threshold to 40%',
    'Lower the approval threshold from 50% to 40% to make it easier for proposals to pass.',
    2, // Approval Threshold change
    4000 // 40%
  )
  const receipt3 = await tx3.wait()
  console.log('✅ Test Proposal 3 created')

  const proposalId3 = Number(proposalCount) + 2
  console.log('Proposal ID 3:', proposalId3)

  // Support from 3 sponsors (2 Golkar + 1 PDIP = 2 parties)
  if (seatIds1.length > 0) {
    const supportTx1 = await proposalManager.connect(signer1).supportProposal(proposalId3, seatIds1[0])
    await supportTx1.wait()
    console.log('✅ Sponsor 1 (Golkar): Supported')
  }

  if (seatIds2.length > 0) {
    const supportTx2 = await proposalManager.connect(signer2).supportProposal(proposalId3, seatIds2[0])
    await supportTx2.wait()
    console.log('✅ Sponsor 2 (Golkar): Supported')
  }

  if (seatIds4.length > 0) {
    const supportTx3 = await proposalManager.connect(signer4).supportProposal(proposalId3, seatIds4[0])
    await supportTx3.wait()
    console.log('✅ Sponsor 3 (PDIP): Supported')
  }

  // Advance time to activate
  console.log('\n⏭️  Advancing time past minProposalDelay for Proposal 3...')
  await ethers.provider.send('hardhat_mine', ['0x1000'])
  await ethers.provider.send('evm_increaseTime', [Number(minProposalDelay) + 1])
  await ethers.provider.send('hardhat_mine', ['0x1'])

  // Start voting
  const startVotingTx3 = await proposalManager.connect(signer1).startVoting(proposalId3)
  await startVotingTx3.wait()
  console.log('✅ Voting started for Proposal 3')

  // Cast votes to ensure it passes
  const votingDuration = await governanceConfig.votingDuration()
  console.log('Voting Duration:', ethers.formatUnits(votingDuration, 0), 'seconds')

  // Vote with multiple seats to meet quorum
  if (seatIds1.length > 0) {
    const voteTx1 = await votingEngine.connect(signer1).vote(proposalId3, seatIds1[0], 0) // Vote For
    await voteTx1.wait()
    console.log('✅ Signer1 voted For')
  }

  if (seatIds2.length > 0) {
    const voteTx2 = await votingEngine.connect(signer2).vote(proposalId3, seatIds2[0], 0) // Vote For
    await voteTx2.wait()
    console.log('✅ Signer2 voted For')
  }

  if (seatIds3.length > 0) {
    const voteTx3 = await votingEngine.connect(signer3).vote(proposalId3, seatIds3[0], 0) // Vote For
    await voteTx3.wait()
    console.log('✅ Signer3 voted For')
  }

  if (seatIds4.length > 0) {
    const voteTx4 = await votingEngine.connect(signer4).vote(proposalId3, seatIds4[0], 0) // Vote For
    await voteTx4.wait()
    console.log('✅ Signer4 voted For')
  }

  // Advance time past voting duration
  console.log('\n⏭️  Advancing time past voting duration...')
  await ethers.provider.send('hardhat_mine', ['0x1000'])
  await ethers.provider.send('evm_increaseTime', [Number(votingDuration) + 1])
  await ethers.provider.send('hardhat_mine', ['0x1'])

  // Close voting
  const closeVotingTx3 = await proposalManager.connect(signer1).closeVoting(proposalId3)
  await closeVotingTx3.wait()
  console.log('✅ Voting closed for Proposal 3')

  // Check if can execute
  const executionEngine = await ethers.getContractAt('ExecutionEngine', addresses.executionEngine)
  const [canExecute, reason] = await executionEngine.canExecuteProposal(proposalId3)
  console.log(`Can Execute: ${canExecute}, Reason: ${reason}`)

  if (canExecute) {
    const executeTx = await executionEngine.connect(signer1).executeProposal(proposalId3)
    await executeTx.wait()
    console.log('✅ Proposal 3 executed successfully')
  } else {
    console.log('❌ Proposal 3 cannot be executed:', reason)
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n========== BOOTSTRAP COMPLETE ==========')
  console.log('\nTest Proposals Created:')
  console.log(`1. Proposal #${proposalId1}: "Increase Quorum to 60%" - STATUS: VOTING`)
  console.log(`   - 3 sponsors from 2 parties`)
  console.log(`   - Ready for voting`)
  console.log(`\n2. Proposal #${proposalId2}: "Change Voting Duration to 7 days" - STATUS: DRAFT`)
  console.log(`   - 1 sponsor (needs 2 more)`)
  console.log(`   - Waiting for support from other addresses`)
  console.log(`\n3. Proposal #${proposalId3}: "Reduce Approval Threshold to 40%" - STATUS: EXECUTED`)
  console.log(`   - Fully processed through the lifecycle`)
  console.log(`   - Executed successfully`)
  console.log('\nYou can now test:')
  console.log('✅ View all three proposals in the dashboard')
  console.log('✅ Vote on Proposal #1 (in voting phase)')
  console.log('✅ Support Proposal #2 (in draft phase)')
  console.log('✅ View executed Proposal #3')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
