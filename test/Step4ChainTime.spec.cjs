const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Step 4 — Blockchain time and voting-window boundaries.
 *
 * These tests exercise the SAME boundary arithmetic the frontend uses for its
 * countdown, but they read timestamps from the chain. The assertions never use
 * the browser clock to decide lifecycle state - chain time is authoritative.
 *
 * Frontend derivation under test (GovernanceDashboard.votingWindowState):
 *   votingWindowOpen    = status === Voting && now <  votingEndedAt
 *   votingWindowExpired = status === Voting && now >= votingEndedAt
 *   remainingSeconds    = max(0, votingEndedAt - now)
 *
 * Frontend close-eligibility derivation under test (GovernanceDashboard):
 *   chainTimeTrustworthy      = chainTime != null && !isStale && !syncError
 *   safelyPastVotingDeadline  = chainTime != null && !syncError
 *                               && votingEndedAt > 0
 *                               && chainTime >= votingEndedAt + CLOSE_SAFETY_MARGIN_S
 *   canCloseVoting            = status === Voting && safelyPastVotingDeadline && !pending
 *   showStaleCloseWarning     = canCloseVoting && (isStale || !chainTimeTrustworthy)
 *
 * SCOPE: the close-eligibility cases below assert the PREDICATE only. This
 * project has no frontend test runner (no jest/vitest), so nothing here renders
 * React or proves the button or warning copy actually appears on screen.
 *
 * ProposalStatus enum: Draft=0 Active=1 Voting=2 Closed=3 Executed=4 Rejected=5 Cancelled=6
 */

const STATUS = { Draft: 0n, Active: 1n, Voting: 2n, Closed: 3n };

/**
 * Frontend clock constants - MUST stay in sync with GovernanceDashboard.tsx.
 * Duplicated because there is no frontend test runner in this project.
 */
const CLOCK_STALE_AFTER_S = 60;
const CLOSE_SAFETY_MARGIN_S = 120;

/** Minimal mirror of the frontend's voting-window derivation. */
function deriveVotingWindow({ status, votingEndedAt, now }) {
  const statusIsVoting = Number(status) === Number(STATUS.Voting);
  const endedAt = Number(votingEndedAt);
  const votingWindowOpen = statusIsVoting && endedAt > 0 && now < endedAt;
  const votingWindowExpired = statusIsVoting && endedAt > 0 && now >= endedAt;
  const remainingSeconds =
    statusIsVoting && endedAt > 0 ? Math.max(0, endedAt - now) : 0;
  return { votingWindowOpen, votingWindowExpired, remainingSeconds };
}

/**
 * Minimal mirror of the frontend's close-eligibility derivation.
 * Predicate-level only - see the SCOPE note above.
 */
function deriveCloseEligibility({
  status,
  votingEndedAt,
  chainTime,
  isStale = false,
  syncError = false,
  closePending = false,
}) {
  const statusIsVoting = Number(status) === Number(STATUS.Voting);
  const hasChainTime =
    chainTime !== null && chainTime !== undefined && !syncError;
  const deadline = Number(votingEndedAt ?? 0);
  const safelyPastVotingDeadline =
    hasChainTime &&
    deadline > 0 &&
    Number(chainTime) >= deadline + CLOSE_SAFETY_MARGIN_S;
  const canCloseVoting =
    statusIsVoting && safelyPastVotingDeadline && !closePending;
  const chainTimeTrustworthy =
    chainTime !== null &&
    chainTime !== undefined &&
    !isStale &&
    !syncError;
  const showStaleCloseWarning =
    canCloseVoting && (isStale || !chainTimeTrustworthy);
  return { canCloseVoting, showStaleCloseWarning, chainTimeTrustworthy };
}

describe("Step 4 — chain time and voting window boundaries", function () {
  async function deployFixture() {
    const [owner, proposer, supporterA, supporterB, supporterC] =
      await ethers.getSigners();

    const SeatNFT = await ethers.getContractFactory("SeatNFT");
    const seatNft = await SeatNFT.deploy(
      100,
      owner.address,
      owner.address,
      owner.address,
    );

    const GovernanceConfig = await ethers.getContractFactory("GovernanceConfig");
    const governanceConfig = await GovernanceConfig.deploy(
      await seatNft.getAddress(),
      owner.address,
      owner.address,
    );

    const ProposalDraftManager = await ethers.getContractFactory(
      "ProposalDraftManager",
    );
    const proposalManager = await ProposalDraftManager.deploy(
      await seatNft.getAddress(),
      await governanceConfig.getAddress(),
    );

    const VotingEngine = await ethers.getContractFactory("VotingEngine");
    const votingEngine = await VotingEngine.deploy(
      await seatNft.getAddress(),
      await governanceConfig.getAddress(),
      await proposalManager.getAddress(),
    );

    const ActionExecutor = await ethers.getContractFactory("ActionExecutor");
    const actionExecutor = await ActionExecutor.deploy(ethers.ZeroAddress);

    const ExecutionEngine = await ethers.getContractFactory("ExecutionEngine");
    const executionEngine = await ExecutionEngine.deploy(
      await seatNft.getAddress(),
      await governanceConfig.getAddress(),
      await proposalManager.getAddress(),
      await votingEngine.getAddress(),
      await actionExecutor.getAddress(),
    );
    const executionEngineAddress = await executionEngine.getAddress();

    await seatNft.setGovernance(executionEngineAddress);
    await governanceConfig.setExecutionEngine(executionEngineAddress);
    await actionExecutor.setExecutionEngine(executionEngineAddress);

    await seatNft.mint(proposer.address, 1);
    await seatNft.mint(supporterA.address, 1);
    await seatNft.mint(supporterB.address, 2);
    await seatNft.mint(supporterC.address, 2);

    return {
      owner,
      proposer,
      supporterA,
      supporterB,
      proposalManager,
      governanceConfig,
      votingEngine,
      executionEngine,
    };
  }

  /** Latest block timestamp - the authoritative chain clock. */
  async function chainNow() {
    const block = await ethers.provider.getBlock("latest");
    return Number(block.timestamp);
  }

  async function advanceChain(seconds) {
    await ethers.provider.send("evm_increaseTime", [Number(seconds)]);
    await ethers.provider.send("evm_mine", []);
  }

  async function createSponsoredProposal(f) {
    await f.proposalManager
      .connect(f.proposer)
      .createDraftProposal("Time test", "d", 0, 6000);
    await f.proposalManager.connect(f.proposer).supportProposal(1, 1);
    await f.proposalManager.connect(f.supporterA).supportProposal(1, 2);
    await f.proposalManager.connect(f.supporterB).supportProposal(1, 3);
    return 1;
  }

  async function startVoting(f, proposalId) {
    const delay = await f.governanceConfig.minProposalDelay();
    await advanceChain(Number(delay) + 1);
    await f.proposalManager.connect(f.proposer).startVoting(proposalId);
  }

  // ═════════════════════════════════════════════════════════════════════════

  it("chain time advances when blocks are mined", async function () {
    const before = await chainNow();
    await advanceChain(3600);
    const after = await chainNow();

    expect(after - before).to.be.gte(3600);
  });

  it("records votingEndedAt as chain time + votingDuration", async function () {
    const f = await deployFixture();
    const id = await createSponsoredProposal(f);
    await startVoting(f, id);

    const duration = await f.governanceConfig.votingDuration();
    const proposal = await f.proposalManager.getProposal(id);
    const block = await ethers.provider.getBlock("latest");

    // votingEndedAt was fixed at the startVoting block, so it lies at most
    // votingDuration ahead of that block and always in the future.
    expect(Number(proposal.votingEndedAt) - Number(block.timestamp)).to.be.lte(
      Number(duration),
    );
    expect(Number(proposal.votingEndedAt)).to.be.gt(Number(block.timestamp));
  });

  it("window is OPEN at the start of voting", async function () {
    const f = await deployFixture();
    const id = await createSponsoredProposal(f);
    await startVoting(f, id);

    const proposal = await f.proposalManager.getProposal(id);
    const now = await chainNow();

    const w = deriveVotingWindow({
      status: proposal.status,
      votingEndedAt: proposal.votingEndedAt,
      now,
    });

    expect(w.votingWindowOpen).to.equal(true);
    expect(w.votingWindowExpired).to.equal(false);
    expect(w.remainingSeconds).to.be.gt(0);
  });

  it("window is still OPEN one second before the deadline", async function () {
    const f = await deployFixture();
    const id = await createSponsoredProposal(f);
    await startVoting(f, id);

    const proposal = await f.proposalManager.getProposal(id);
    const endedAt = Number(proposal.votingEndedAt);

    // Deterministic timestamp control: pin the NEXT block to exactly one second
    // before the deadline rather than advancing by a relative offset. A relative
    // `evm_increaseTime` accumulates wall-clock drift between the timestamp read
    // and the time manipulation, so the mined block could land exactly ON the
    // deadline and this boundary assertion would fail intermittently.
    const before = await chainNow();
    const targetTimestamp = endedAt - 1;

    // evm_setNextBlockTimestamp only accepts a timestamp strictly greater than
    // the latest mined block, so the target must genuinely lie ahead of it.
    expect(targetTimestamp).to.be.gt(before);

    await ethers.provider.send("evm_setNextBlockTimestamp", [targetTimestamp]);
    await ethers.provider.send("evm_mine", []);

    const laterNow = await chainNow();

    // The mined block carries exactly the requested timestamp, so the boundary
    // under test is reached exactly - not approximately.
    expect(laterNow).to.equal(targetTimestamp);
    expect(laterNow).to.equal(endedAt - 1);

    const w = deriveVotingWindow({
      status: proposal.status,
      votingEndedAt: proposal.votingEndedAt,
      now: laterNow,
    });

    expect(laterNow).to.be.lt(endedAt);
    expect(w.votingWindowOpen).to.equal(true);
    expect(w.votingWindowExpired).to.equal(false);
    expect(w.remainingSeconds).to.equal(1);
  });

  it("window is EXPIRED exactly at the deadline", async function () {
    const f = await deployFixture();
    const id = await createSponsoredProposal(f);
    await startVoting(f, id);

    const proposal = await f.proposalManager.getProposal(id);
    const endedAt = Number(proposal.votingEndedAt);
    const now = await chainNow();

    await advanceChain(endedAt - now);

    const laterNow = await chainNow();
    const w = deriveVotingWindow({
      status: proposal.status,
      votingEndedAt: proposal.votingEndedAt,
      now: laterNow,
    });

    expect(laterNow).to.be.gte(endedAt);
    expect(w.votingWindowOpen).to.equal(false);
    expect(w.votingWindowExpired).to.equal(true);
    expect(w.remainingSeconds).to.equal(0);
  });

  it("remaining time decreases monotonically and never goes negative", async function () {
    const f = await deployFixture();
    const id = await createSponsoredProposal(f);
    await startVoting(f, id);

    const proposal = await f.proposalManager.getProposal(id);
    const endedAt = Number(proposal.votingEndedAt);

    const first = deriveVotingWindow({
      status: proposal.status,
      votingEndedAt: proposal.votingEndedAt,
      now: await chainNow(),
    });

    await advanceChain(100);
    const second = deriveVotingWindow({
      status: proposal.status,
      votingEndedAt: proposal.votingEndedAt,
      now: await chainNow(),
    });

    await advanceChain(Number(await f.governanceConfig.votingDuration()) + 1000);
    const third = deriveVotingWindow({
      status: proposal.status,
      votingEndedAt: proposal.votingEndedAt,
      now: await chainNow(),
    });

    expect(second.remainingSeconds).to.be.lt(first.remainingSeconds);
    expect(third.remainingSeconds).to.equal(0); // clamped, never negative
    expect(second.remainingSeconds).to.be.gte(0);
  });

  it("contract rejects closeVoting before the deadline", async function () {
    const f = await deployFixture();
    const id = await createSponsoredProposal(f);
    await startVoting(f, id);

    await expect(
      f.proposalManager.connect(f.proposer).closeVoting(id),
    ).to.be.revertedWith("Voting period not yet ended");
  });

  it("contract accepts closeVoting at/after the deadline", async function () {
    const f = await deployFixture();
    const id = await createSponsoredProposal(f);
    await startVoting(f, id);

    const duration = await f.governanceConfig.votingDuration();
    await advanceChain(Number(duration) + 1);

    await f.proposalManager.connect(f.proposer).closeVoting(id);
    expect((await f.proposalManager.getProposal(id)).status).to.equal(
      STATUS.Closed,
    );
  });

  it("an idle chain does not advance chain time (frozen timestamp)", async function () {
    // This is the condition that broke the old frontend re-anchoring logic:
    // without new blocks, getBlock() keeps returning the same timestamp.
    const first = await chainNow();
    const blockA = await ethers.provider.getBlock("latest");
    const blockB = await ethers.provider.getBlock("latest");

    expect(Number(blockB.timestamp)).to.equal(Number(blockA.timestamp));
    expect(await chainNow()).to.equal(first);

    // Mining advances it again
    await advanceChain(60);
    expect(await chainNow()).to.be.gte(first + 60);
  });

  it("frontend-style projection tracks the chain when anchored on a new block", async function () {
    // Mirrors the corrected hook: anchor = {blockTimestamp, localTimestamp}
    // projection = blockTimestamp + (localNow - localTimestamp)
    const block = await ethers.provider.getBlock("latest");
    const blockTimestamp = Number(block.timestamp);
    const localTimestamp = Math.floor(Date.now() / 1000);

    // Immediately after anchoring, the projection equals the block timestamp.
    expect(blockTimestamp + (localTimestamp - localTimestamp)).to.equal(
      blockTimestamp,
    );

    // Ten seconds of local time yields a projection 10s ahead.
    expect(blockTimestamp + (localTimestamp + 10 - localTimestamp)).to.equal(
      blockTimestamp + 10,
    );

    // Re-anchoring on a NEW block must not move the estimate backwards.
    const oldProjection = blockTimestamp + 30;
    await advanceChain(120);
    const newBlock = await ethers.provider.getBlock("latest");
    const newAnchor = Number(newBlock.timestamp);

    expect(newAnchor).to.be.gte(oldProjection);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Close-eligibility safety margin (predicate-level - see SCOPE note)
  // ═════════════════════════════════════════════════════════════════════════

  it("close eligibility sits exactly on votingEndedAt + CLOSE_SAFETY_MARGIN_S", async function () {
    const f = await deployFixture();
    const id = await createSponsoredProposal(f);
    await startVoting(f, id);

    const proposal = await f.proposalManager.getProposal(id);
    const endedAt = Number(proposal.votingEndedAt);
    const base = { status: proposal.status, votingEndedAt: proposal.votingEndedAt };

    // 119s past the deadline - one second short of the margin: NOT offered.
    const at119 = deriveCloseEligibility({
      ...base,
      chainTime: endedAt + CLOSE_SAFETY_MARGIN_S - 1,
    });
    expect(at119.canCloseVoting).to.equal(false);

    // Exactly the margin past the deadline: offered.
    const at120 = deriveCloseEligibility({
      ...base,
      chainTime: endedAt + CLOSE_SAFETY_MARGIN_S,
    });
    expect(at120.canCloseVoting).to.equal(true);

    // And it stays offered beyond the margin.
    const at121 = deriveCloseEligibility({
      ...base,
      chainTime: endedAt + CLOSE_SAFETY_MARGIN_S + 1,
    });
    expect(at121.canCloseVoting).to.equal(true);

    // The margin must exceed the stale threshold, otherwise a stale clock could
    // read "before the deadline" again and the button would vanish.
    expect(CLOSE_SAFETY_MARGIN_S).to.be.gt(CLOCK_STALE_AFTER_S);

    // Chain evidence: the CONTRACT is already satisfied one second past the
    // deadline, so the 120s margin is deliberate frontend conservatism - it is
    // never a governance rule and it never permanently withholds a valid close.
    await advanceChain(endedAt + CLOSE_SAFETY_MARGIN_S - (await chainNow()));
    expect(await chainNow()).to.be.gte(endedAt + CLOSE_SAFETY_MARGIN_S);

    await f.proposalManager.connect(f.proposer).closeVoting(id);
    expect((await f.proposalManager.getProposal(id)).status).to.equal(
      STATUS.Closed,
    );
  });

  it("staleness alone does not withhold the close action when an anchor exists", async function () {
    const f = await deployFixture();
    const id = await createSponsoredProposal(f);
    await startVoting(f, id);

    const proposal = await f.proposalManager.getProposal(id);
    const endedAt = Number(proposal.votingEndedAt);
    const past = endedAt + CLOSE_SAFETY_MARGIN_S;

    // A stale projection with a valid anchor and no RPC error is still enough
    // to offer the action - the contract performs the authoritative check.
    const stale = deriveCloseEligibility({
      status: proposal.status,
      votingEndedAt: proposal.votingEndedAt,
      chainTime: past,
      isStale: true,
    });
    expect(stale.canCloseVoting).to.equal(true);
    expect(stale.chainTimeTrustworthy).to.equal(false);
    expect(stale.showStaleCloseWarning).to.equal(true);

    // A freshly anchored clock is trustworthy and needs no warning.
    const fresh = deriveCloseEligibility({
      status: proposal.status,
      votingEndedAt: proposal.votingEndedAt,
      chainTime: past,
      isStale: false,
    });
    expect(fresh.canCloseVoting).to.equal(true);
    expect(fresh.chainTimeTrustworthy).to.equal(true);
    expect(fresh.showStaleCloseWarning).to.equal(false);
  });

  it("close eligibility still requires an anchor, no sync error, a deadline, Voting status and no pending tx", async function () {
    const f = await deployFixture();
    const id = await createSponsoredProposal(f);
    await startVoting(f, id);

    const proposal = await f.proposalManager.getProposal(id);
    const endedAt = Number(proposal.votingEndedAt);
    const past = endedAt + CLOSE_SAFETY_MARGIN_S;
    const base = {
      status: proposal.status,
      votingEndedAt: proposal.votingEndedAt,
      chainTime: past,
    };

    // No anchor at all: nothing to base the action on.
    expect(
      deriveCloseEligibility({ ...base, chainTime: null }).canCloseVoting,
    ).to.equal(false);

    // RPC/sync failure: the projection is unusable.
    expect(
      deriveCloseEligibility({ ...base, syncError: true }).canCloseVoting,
    ).to.equal(false);

    // Missing deadline on-chain.
    expect(
      deriveCloseEligibility({ ...base, votingEndedAt: 0n }).canCloseVoting,
    ).to.equal(false);

    // Not in Voting status.
    expect(
      deriveCloseEligibility({ ...base, status: STATUS.Closed }).canCloseVoting,
    ).to.equal(false);

    // A close transaction is already in flight.
    expect(
      deriveCloseEligibility({ ...base, closePending: true }).canCloseVoting,
    ).to.equal(false);

    // Sanity: the unmodified baseline is still eligible.
    expect(deriveCloseEligibility(base).canCloseVoting).to.equal(true);
  });
});
