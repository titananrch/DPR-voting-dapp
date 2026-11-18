/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from "react";
import type { Address } from "viem";
import type { PreparedProposal } from "../domain/governance/types";
import type { ProposalData } from "../domain/governance/types";
import type { SponsorSeatInfo } from "../hooks/governance/queries/useProposalSponsorsMap";
import { useAccount } from "wagmi";
import { useGovernanceParameters } from "../hooks/governance/queries/useGovernanceParameters";
import { useSeatInfo } from "../hooks/governance/queries/useSeatInfo";
import { useTotalSeatsIssued } from "../hooks/governance/queries/useTotalSeatsIssued";
import { useProposalList } from "../hooks/governance/queries/useProposalList";
import { useProposalDetailsMap } from "../hooks/governance/queries/useProposalDetailsMap";
import { useProposalSponsorsMap } from "../hooks/governance/queries/useProposalSponsorsMap";
import { useUserProposalSupportMap } from "../hooks/governance/queries/useUserProposalSupportMap";
import { useUserProposalVoteMap } from "../hooks/governance/queries/useUserProposalVoteMap";
import { useCastVote } from "../hooks/governance/mutations/useCastVote";
import { useSupportProposal } from "../hooks/governance/mutations/useSupportProposal";
import { useStartVoting } from "../hooks/governance/mutations/useStartVoting";
import { useCloseVoting } from "../hooks/governance/mutations/useCloseVoting";
import { useExecuteProposal } from "../hooks/governance/mutations/useExecuteProposal";
import { useSeatDetails } from "../hooks/governance/queries/useSeatDetails";
import { useUserActivityMetrics } from "../hooks/governance/queries/useUserActivityMetrics";
import { publicClient } from "../domain/governance/aggregator";
import {
  PROPOSAL_STATUS_ACTIVE,
  PROPOSAL_STATUS_CANCELLED,
  PROPOSAL_STATUS_CLOSED,
  PROPOSAL_STATUS_DRAFT,
  PROPOSAL_STATUS_EXECUTED,
  PROPOSAL_STATUS_REJECTED,
  PROPOSAL_STATUS_VOTING,
} from "../domain/governance/aggregator";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Vote,
  Loader2,
  Play,
  X,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ProposalForm } from "./governance/ProposalForm";

const CLOCK_TICK_MS = 1000;
const CLOCK_SYNC_MS = 15_000;
const CLOCK_STALE_AFTER_S = 60;

/**
 * Extra margin applied before offering the Close Voting action.
 *
 * The projected chain time can drift behind the real chain time while the local
 * chain is idle (no new block to re-anchor against). Requiring the deadline plus
 * this margin keeps the button from inviting a revert, WITHOUT treating a stale
 * projection as a reason to withhold a contract-authorized action entirely.
 *
 * Must remain greater than CLOCK_STALE_AFTER_S so that a stale clock is always
 * "past deadline" rather than "unknown".
 */
const CLOSE_SAFETY_MARGIN_S = 120;

export type ChainClock = {
  /** Estimated chain time in seconds, or null while unsynchronised. */
  chainTime: number | null;
  /** True when no new block has been observed recently, so the estimate is a
   *  projection rather than an observation. */
  isStale: boolean;
  /** True when the last block-timestamp read failed (RPC/wallet unavailable). */
  syncError: boolean;
};

/**
 * Chain time sourced from the blockchain, not the browser clock.
 *
 * The browser clock is only used to interpolate BETWEEN observed blocks. The
 * anchor is re-established exclusively when a NEW block is mined. This matters
 * on a local Hardhat node, where an idle chain keeps returning the same frozen
 * block timestamp: re-anchoring to it would drag the displayed chain time
 * backwards and make a countdown reset instead of advancing.
 */
function useBlockchainSyncedTime(): ChainClock {
  const { chain } = useAccount();

  const [anchor, setAnchor] = React.useState<{
    blockTimestamp: number;
    localTimestamp: number;
    blockNumber: bigint;
  } | null>(null);
  const [currentLocalTime, setCurrentLocalTime] = React.useState<number>(() =>
    Math.floor(Date.now() / 1000),
  );
  const [syncError, setSyncError] = React.useState(false);
  const lastBlockNumberRef = React.useRef<bigint | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function sync() {
      try {
        const block = await publicClient.getBlock();
        if (!mounted || !block?.timestamp) return;

        const blockTimestamp = Number(block.timestamp);
        const localTimestamp = Math.floor(Date.now() / 1000);
        const blockNumber = block.number ?? 0n;

        setSyncError(false);

        const previousBlockNumber = lastBlockNumberRef.current;
        const isFirstSync = previousBlockNumber === null;
        const hasNewBlock =
          previousBlockNumber !== null && blockNumber > previousBlockNumber;

        lastBlockNumberRef.current = blockNumber;

        if (isFirstSync || hasNewBlock) {
          setAnchor({ blockTimestamp, localTimestamp, blockNumber });
        }
      } catch {
        if (mounted) {
          setSyncError(true);
        }
      }
    }

    // Reset when the connected chain changes so stale timestamps from a
    // previous network are never reused.
    setAnchor(null);
    lastBlockNumberRef.current = null;
    void sync();

    const syncInterval = setInterval(sync, CLOCK_SYNC_MS);
    const tickInterval = setInterval(() => {
      setCurrentLocalTime(Math.floor(Date.now() / 1000));
    }, CLOCK_TICK_MS);

    return () => {
      mounted = false;
      clearInterval(syncInterval);
      clearInterval(tickInterval);
    };
  }, [chain?.id]);

  const chainTime = React.useMemo(() => {
    if (!anchor) return null;
    const elapsed = Math.max(0, currentLocalTime - anchor.localTimestamp);
    return anchor.blockTimestamp + elapsed;
  }, [anchor, currentLocalTime]);

  const isStale = React.useMemo(() => {
    if (!anchor) return false;
    return currentLocalTime - anchor.localTimestamp > CLOCK_STALE_AFTER_S;
  }, [anchor, currentLocalTime]);

  return { chainTime, isStale, syncError };
}

export default function GovernanceDashboard() {
  const [selectedTab, setSelectedTab] = useState<"draft" | "voting" | "passed">(
    "voting",
  );
  const [expandedProposalId, setExpandedProposalId] = useState<number | null>(
    null,
  );

  const { address } = useAccount();

  const { data: params, isLoading: paramsLoading } = useGovernanceParameters();
  const { data: seats = [] } = useSeatInfo(address);
  const { data: seatDetails } = useSeatDetails(address, seats);
  const { data: allProposals, isLoading: proposalsLoading } =
    useProposalList(null);

  const { data: activityMetrics } = useUserActivityMetrics(
    allProposals ?? [],
    address,
  );
  const { data: totalSeats } = useTotalSeatsIssued();

  // Centralized proposal detail fetching for ALL proposals
  const { data: proposalDetailsMap } = useProposalDetailsMap(
    allProposals?.map((p) => p.id) ?? [],
    address,
  );

  // Centralized sponsor data fetching for all proposals that may display supporters.
  // Keep the existing proposal -> sponsorSeats flow, but do not restrict funding
  // to draft/active proposals only.
  const proposalIdsForSupporterDisplay =
    allProposals?.map((proposal) => proposal.id) ?? [];
  const {
    data: sponsorSeatsMap,
    isLoading: sponsorSeatsLoading,
    isError: sponsorSeatsError,
  } = useProposalSponsorsMap(proposalIdsForSupporterDisplay);

  const loading = paramsLoading || proposalsLoading;

  const seatCount = seats?.length ?? 0;
  const canVoteOrSupport = seatCount > 0;

  // Tab buckets are derived from authoritative on-chain status ordinals.
  // Draft and Active are both pre-voting so they share the Draft tab; every
  // terminal outcome (Closed, Executed, Rejected, Cancelled) belongs to the
  // final tab. They remain individually labelled by statusLabel when rendered.
  const draftProposals =
    allProposals
      ?.filter(
        (p) =>
          p.status === PROPOSAL_STATUS_DRAFT ||
          p.status === PROPOSAL_STATUS_ACTIVE,
      )
      .sort((a, b) => b.status - a.status) ?? [];
  const votingProposals =
    allProposals?.filter((p) => p.status === PROPOSAL_STATUS_VOTING) ?? [];
  const passedProposals =
    allProposals?.filter(
      (p) =>
        p.status === PROPOSAL_STATUS_CLOSED ||
        p.status === PROPOSAL_STATUS_EXECUTED ||
        p.status === PROPOSAL_STATUS_REJECTED ||
        p.status === PROPOSAL_STATUS_CANCELLED,
    ) ?? [];

  const draftProposalIds = draftProposals.map((proposal) => proposal.id);
  const votingProposalIds = votingProposals.map((proposal) => proposal.id);

  const { data: userSupportMap } = useUserProposalSupportMap(
    draftProposalIds,
    address,
    seats,
  );
  const { data: userVoteMap } = useUserProposalVoteMap(
    votingProposalIds,
    address,
    seats,
  );

  // Blockchain synced time - single instance at dashboard level.
  // chainTime is the authoritative estimate; isStale flags a projection that has
  // not been re-anchored by a new block; syncError flags an unavailable source.
  const { chainTime, isStale: chainTimeStale, syncError: chainTimeError } =
    useBlockchainSyncedTime();

  const getTabProposals = React.useMemo(() => {
    switch (selectedTab) {
      case "draft":
        return draftProposals;
      case "voting":
        return votingProposals;
      case "passed":
        return passedProposals;
      default:
        return [];
    }
  }, [selectedTab, draftProposals, votingProposals, passedProposals]);

  // Stable callback for toggling proposal expansion
  const handleToggleExpand = React.useCallback((proposalId: number) => {
    setExpandedProposalId((prev) => (prev === proposalId ? null : proposalId));
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Emergency Pause Alert */}
      {params?.emergencyPause && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
            <div>
              <p className="font-bold text-red-900">Emergency Pause Active</p>
              <p className="text-sm text-red-700">
                Proposal execution is temporarily blocked
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Governance Parameters Card */}
      {params && (
        <div className="bg-[#0E0E0E] border border-white/5 rounded-lg p-6">
          <h3 className="font-bold text-lg mb-3">Governance Parameters</h3>
          <div className="grid grid-cols-2 gap-3 text-sm bg-[#131313] rounded-lg px-3 py-4 hover:bg-[#11111a] transition-colors">
            <div>
              <span className="text-gray-600">Quorum:</span>{" "}
              <span className="font-mono font-bold">
                {Number(params.quorum) / 100}%
              </span>
            </div>
            <div>
              <span className="text-gray-600">Approval Threshold:</span>{" "}
              <span className="font-mono font-bold">
                {Number(params.approvalThreshold) / 100}%
              </span>
            </div>
            <div>
              <span className="text-gray-600">Voting Duration:</span>{" "}
              <span className="font-mono font-bold">
                {Number(params.votingDuration) / 86400} days
              </span>
            </div>
            <div>
              <span className="text-gray-600">Min Proposal Delay:</span>{" "}
              <span className="font-mono font-bold">
                {Number(params.minProposalDelay) / 3600} hours
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Seat Status */}
      <div className="border-white/5 border bg-[#0E0E0E] rounded-lg p-6 space-y-4">
        {/* Header */}
        <div>
          <h3 className="font-bold text-lg mb-4">Seat Status</h3>
        </div>

        {/* Main Seat Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Seat Count */}
          <div className="bg-[#131313] rounded-lg p-3 hover:bg-[#11111a] transition-colors">
            <p className="text-gray-500 text-sm mb-1">Your Seats</p>
            <p className="text-3xl font-bold text-indigo-600">{seatCount}</p>
          </div>

          {/* Voting Power */}
          <div className="bg-[#131313] rounded-lg p-3 hover:bg-[#11111a] transition-colors">
            <p className="text-gray-500 text-sm mb-1">Voting Power</p>
            <p className="text-3xl font-bold text-indigo-600">{seatCount}</p>
            <p className="text-xs text-gray-600 mt-1">(1 vote per seat)</p>
          </div>

          {/* Total Seats */}
          <div className="bg-[#131313] rounded-lg p-3 hover:bg-[#11111a] transition-colors">
            <p className="text-gray-500 text-sm mb-1">Total Seats Issued</p>
            <p className="text-3xl font-bold text-emerald-600">
              {totalSeats ?? 0}
            </p>
          </div>

          {/* Voting Status */}
          <div className="bg-[#131313] rounded-lg p-3 hover:bg-[#11111a] transition-colors">
            {canVoteOrSupport ? (
              <div>
                <p className="text-emerald-600 font-semibold text-sm">
                  ✓ Eligible
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  Can vote & support
                </p>
              </div>
            ) : (
              <div>
                <p className="text-shadow-red-700 font-semibold text-sm">
                  ✗ No Rights
                </p>
                <p className="text-xs text-shadow-red-700 mt-1">
                  Hold no seats
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Seat Details */}
        {seatDetails && seatDetails.length > 0 && (
          <div className="border-t border-white/5 pt-4">
            <p className="text-sm text-gray-600 mb-2">Seat Details</p>
            <div className="space-y-2">
              {seatDetails.map((seat) => (
                <div
                  key={seat.seatId.toString()}
                  className="flex justify-between items-center bg-[#131313] rounded-lg p-2 text-sm hover:bg-[#11111a] transition-colors"
                >
                  <span className="text-gray-400">
                    Seat{" "}
                    <span className="font-mono font-bold text-white">
                      #{Number(seat.seatId)}
                    </span>
                  </span>
                  <span className="px-2 py-1 bg-white/10 text-gray-300 rounded text-xs font-medium">
                    {seat.partyName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Governance Activity (global proposal counts, not per-wallet) */}
        {activityMetrics && (
          <div className="border-t border-white/5 pt-4">
            <p className="text-sm text-gray-600 mb-3">
              Governance Activity
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Proposals In Voting */}
              <div className="bg-[#131313] rounded-lg p-3 hover:bg-[#11111a] transition-colors">
                <p className="text-gray-500 text-xs mb-1">
                  Proposals In Voting
                </p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-emerald-500">
                    {activityMetrics.votingProposalCount}
                  </p>
                  <p className="text-gray-600 text-xs">on-chain</p>
                </div>
              </div>

              {/* Proposals Awaiting Execution */}
              <div className="bg-[#131313] rounded-lg p-3 hover:bg-[#11111a] transition-colors">
                <p className="text-gray-500 text-xs mb-1">
                  Awaiting Execution
                </p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-amber-500">
                    {activityMetrics.closedProposalCount}
                  </p>
                  <p className="text-gray-600 text-xs">on-chain</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 Detailed voting and support history requires on-chain indexing
            </p>
          </div>
        )}
      </div>

      {/* Create Proposal Button */}
      <div className="flex justify-between items-center">
        <p className="text-lg text-white font-bold pl-6">Proposals</p>
        <ProposalForm onSuccess={() => setSelectedTab("draft")} />
      </div>

      {/* Proposals Tabs */}
      <div className="border-b border-white/5 mb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedTab("draft")}
            className={`px-4 py-2 font-medium ${
              selectedTab === "draft"
                ? "text-white border-b-2 border-white"
                : "text-gray-500 hover:text-gray-600 hover:cursor-pointer"
            }`}
          >
            Draft ({draftProposals.length})
          </button>
          <button
            onClick={() => setSelectedTab("voting")}
            className={`px-4 py-2 font-medium ${
              selectedTab === "voting"
                ? "text-white border-b-2 border-white"
                : "text-gray-500 hover:text-gray-600 hover:cursor-pointer"
            }`}
          >
            Voting ({votingProposals.length})
          </button>
          <button
            onClick={() => setSelectedTab("passed")}
            className={`px-4 py-2 font-medium ${
              selectedTab === "passed"
                ? "text-white border-b-2 border-white"
                : "text-gray-500 hover:text-gray-600 hover:cursor-pointer"
            }`}
          >
            Concluded ({passedProposals.length})
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-600 -mt-2">
        The final tab lists all concluded proposals (Closed, Executed, Rejected,
        Cancelled). Each card shows its authoritative on-chain status.
      </p>

      {/* Proposals List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading proposals...</p>
        </div>
      ) : getTabProposals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No proposals in this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {getTabProposals.map((proposal) => (
            <ProposalCard
              key={String(proposal.id)}
              proposal={proposal}
              proposalDetail={proposalDetailsMap?.[proposal.id]}
              sponsorSeats={sponsorSeatsMap?.[proposal.id]}
              supporterDataLoading={sponsorSeatsLoading}
              supporterDataError={sponsorSeatsError}
              userAddress={address}
              canVote={canVoteOrSupport}
              userSeats={seats ?? []}
              userVote={userVoteMap?.[proposal.id] ?? null}
              userSupported={userSupportMap?.[proposal.id] ?? false}
              currentTime={chainTime}
              chainTimeStale={chainTimeStale}
              chainTimeError={chainTimeError}
              isExpanded={expandedProposalId === proposal.id}
              onToggleExpand={() => handleToggleExpand(proposal.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProposalCard({
  proposal,
  proposalDetail,
  sponsorSeats,
  supporterDataLoading,
  supporterDataError,
  userAddress,
  canVote,
  userSeats,
  userVote,
  userSupported,
  currentTime,
  chainTimeStale,
  chainTimeError,
  isExpanded,
  onToggleExpand,
}: {
  proposal: PreparedProposal;
  proposalDetail?: ProposalData;
  sponsorSeats?: SponsorSeatInfo[];
  supporterDataLoading: boolean;
  supporterDataError: boolean;
  userAddress: Address | undefined;
  canVote: boolean;
  userSeats: number[];
  userVote?: 0 | 1 | null;
  userSupported?: boolean;
  currentTime: number | null;
  chainTimeStale: boolean;
  chainTimeError: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  // Local vote state for optimistic UI
  const [voteOption, setVoteOption] = useState<0 | 1 | null>(
    () => userVote ?? null,
  );

  const castVote = useCastVote();
  const support = useSupportProposal();
  const startVoting = useStartVoting();
  const closeVoting = useCloseVoting();
  const executeProposal = useExecuteProposal();

  // Sync vote option with prop updates
  React.useEffect(() => {
    if (userVote !== undefined) {
      setVoteOption(userVote);
    }
  }, [userVote]);

  // Extract data from preloaded proposalDetail
  const votingResults = proposalDetail?.votes ?? {
    totalVotes: 0,
    approvalVotes: 0,
    rejectionVotes: 0,
    quorumMet: false,
    approved: false,
    approvalThresholdMet: false,
  };
  const totalVotes = Number(votingResults.totalVotes ?? 0);
  const approvalVotes = Number(votingResults.approvalVotes ?? 0);
  const rejectionVotes = Number(votingResults.rejectionVotes ?? 0);
  const quorumMet = Boolean(votingResults.quorumMet);
  const approved = Boolean(votingResults.approved);
  const approvalThresholdMet = Boolean(votingResults.approvalThresholdMet);
  const executionStatus = proposalDetail?.execution;

  // Group sponsor data (already fetched at dashboard level)
  const groupedSponsors = React.useMemo(() => {
    if (!sponsorSeats || sponsorSeats.length === 0) return {};

    return sponsorSeats.reduce((acc, seat) => {
      const partyIdStr =
        seat.partyId === null
          ? "historical-party-unavailable"
          : seat.partyId.toString();
      if (!acc[partyIdStr]) {
        acc[partyIdStr] = {
          partyName: seat.partyName,
          seatIds: [],
        };
      }
      acc[partyIdStr].seatIds.push(seat.seatId);
      return acc;
    }, {} as Record<string, { partyName: string; seatIds: number[] }>);
  }, [sponsorSeats]);

  const sponsorEntries = Object.entries(groupedSponsors);
  const canDisplaySupporters = true;

  // Safely convert to numbers, ensuring no NaN values
  const votingStartedAt = Number(proposal.votingStartedAt ?? 0);
  const syncedTime =
    currentTime !== null && currentTime !== undefined ? Number(currentTime) : 0;
  const remainingTime = Math.max(
    0,
    !isNaN(votingStartedAt) && !isNaN(syncedTime)
      ? votingStartedAt - syncedTime
      : 0,
  );

  const votingWindowState = React.useMemo(() => {
    const votingEndedAt = Number(proposal.votingEndedAt ?? 0);
    const now =
      currentTime !== null && currentTime !== undefined
        ? Number(currentTime)
        : null;
    const statusIsVoting = proposal.status === PROPOSAL_STATUS_VOTING;
    const votingWindowOpen =
      statusIsVoting &&
      now !== null &&
      votingEndedAt > 0 &&
      now < votingEndedAt;
    const votingWindowExpired =
      statusIsVoting &&
      now !== null &&
      votingEndedAt > 0 &&
      now >= votingEndedAt;
    const remainingSeconds =
      statusIsVoting && votingEndedAt > 0 && now !== null
        ? Math.max(0, votingEndedAt - now)
        : 0;

    return {
      statusIsVoting,
      votingWindowOpen,
      votingWindowExpired,
      remainingSeconds,
      votingEndedAt,
      now,
    };
  }, [proposal.status, proposal.votingEndedAt, currentTime]);

  // Frontend timing is presentation only. An authoritative "expired" claim is
  // only made when the chain clock is actually available and freshly anchored -
  // a stale projection or a failed sync is never treated as authoritative.
  const chainTimeTrustworthy =
    currentTime !== null && !chainTimeStale && !chainTimeError;

  const displayStatusLabel =
    proposal.status === PROPOSAL_STATUS_VOTING &&
    chainTimeTrustworthy &&
    votingWindowState.votingWindowExpired
      ? "Voting expired"
      : proposal.statusLabel;

  // Closing voting is a real transaction that ProposalDraftManager validates
  // itself via `block.timestamp >= votingEndedAt`, so the contract - not this
  // projection - decides eligibility. A stale projection must therefore NOT
  // withhold the action; it only means we require a conservative margin beyond
  // the deadline. No anchor or a failed sync means there is no basis at all.
  const hasChainTimeAnchor = currentTime !== null && !chainTimeError;
  const votingDeadline = votingWindowState.votingEndedAt;
  const safelyPastVotingDeadline =
    hasChainTimeAnchor &&
    votingDeadline > 0 &&
    Number(currentTime) >= votingDeadline + CLOSE_SAFETY_MARGIN_S;

  const canCloseVoting =
    proposal.status === PROPOSAL_STATUS_VOTING &&
    safelyPastVotingDeadline &&
    !closeVoting.isPending;

  // Stale but past the conservative threshold: the action is offered, with a
  // warning that the contract performs the real check.
  const showStaleCloseWarning =
    canCloseVoting && (chainTimeStale || !chainTimeTrustworthy);

  function formatTime(seconds: number) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(" : ");
  }

  async function handleVote(optionId: 0 | 1) {
    if (!userAddress || !canVote || userSeats.length === 0) return;

    castVote.mutate(
      {
        proposalId: BigInt(proposal.id),
        seatId: BigInt(userSeats[0]),
        optionId,
      },
      { onSuccess: () => setVoteOption(optionId) },
    );
  }

  const [optimisticSupported, setOptimisticSupported] = React.useState(false);

  React.useEffect(() => {
    setOptimisticSupported(false);
  }, [userAddress, proposal.id]);

  async function handleSupport() {
    if (!userAddress || !canVote || userSeats.length === 0) return;

    try {
      await support.mutateAsync({
        proposalId: BigInt(proposal.id),
        seatId: BigInt(userSeats[0]),
      });
      setOptimisticSupported(true);
    } catch {
      setOptimisticSupported(false);
    }
  }

  const isSupporting = support.isPending;
  const isSupported = (userSupported ?? false) || optimisticSupported;

  function handleStartVoting() {
    if (!userAddress) return;
    startVoting.mutate({ proposalId: BigInt(proposal.id) });
  }

  function handleCloseVoting() {
    if (!userAddress) return;
    closeVoting.mutate({ proposalId: BigInt(proposal.id) });
  }

  function handleExecute() {
    if (!userAddress) return;
    executeProposal.mutate({ proposalId: BigInt(proposal.id) });
  }

  const approvalPercentage = React.useMemo(() => {
    if (totalVotes <= 0) return 0;
    return (approvalVotes / totalVotes) * 100;
  }, [approvalVotes, totalVotes]);

  const statusColor: Record<string, string> = {
    Draft: "bg-gray-600/20 text-gray-600",
    Active: "bg-yellow-100 text-yellow-800",
    Voting: "bg-orange-400/5 text-orange-400",
    "Voting expired": "bg-amber-500/10 text-amber-300",
    Closed: "bg-purple-500/5 text-purple-500",
    Executed: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
  };

  const statusIcon: Record<string, React.ReactNode> = {
    Draft: <Clock className="w-4 h-4" />,
    Active: <Clock className="w-4 h-4" />,
    Voting: <Vote className="w-4 h-4" />,
    "Voting expired": <AlertCircle className="w-4 h-4" />,
    Executed: <CheckCircle className="w-4 h-4" />,
  };

  const getActionButton = () => {
    const baseClasses =
      "px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors";
    const primaryClasses = `${baseClasses} bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50`;
    const successClasses = `${baseClasses} bg-green-500 text-white hover:bg-green-600 disabled:opacity-50`;
    const disabledClasses = `${baseClasses} bg-gray-300 text-gray-600 cursor-not-allowed`;

    // Draft status - ready to activate
    if (
      proposal.status === PROPOSAL_STATUS_DRAFT &&
      proposal.thresholdMet &&
      !startVoting.isPending
    ) {
      return (
        <button
          onClick={handleStartVoting}
          disabled={startVoting.isPending}
          className={startVoting.isPending ? disabledClasses : successClasses}
        >
          {startVoting.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Activating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Activate Proposal
            </>
          )}
        </button>
      );
    }

    // Active status - waiting for voting delay (automatically transitions)
    if (proposal.status === PROPOSAL_STATUS_ACTIVE) {
      return (
        <div className="text-sm text-gray-600">
          ⏳ Waiting for voting delay...
        </div>
      );
    }

    // Voting status - close voting when the period has expired
    if (canCloseVoting) {
      return (
        <button
          onClick={handleCloseVoting}
          disabled={closeVoting.isPending}
          className={closeVoting.isPending ? disabledClasses : primaryClasses}
        >
          {closeVoting.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Closing...
            </>
          ) : (
            <>
              <X className="w-4 h-4" />
              Close Voting
            </>
          )}
        </button>
      );
    }

    // Terminal statuses are derived from authoritative on-chain status, not
    // from a stale "isExecuted" heuristic. Steps 1-2 made Executed (4) and
    // Rejected (5) reachable, so each is rendered explicitly.
    if (proposal.status === PROPOSAL_STATUS_EXECUTED) {
      return (
        <div className="text-sm text-green-600 flex items-center gap-2">
          <Check className="w-4 h-4" />
          Executed
        </div>
      );
    }

    if (proposal.status === PROPOSAL_STATUS_REJECTED) {
      return (
        <div className="text-sm text-red-600 flex items-center gap-2">
          <X className="w-4 h-4" />
          Rejected by governance
        </div>
      );
    }

    if (proposal.status === PROPOSAL_STATUS_CANCELLED) {
      return <div className="text-sm text-gray-500">Cancelled</div>;
    }

    // Closed status - awaiting an execution attempt
    if (proposal.status === PROPOSAL_STATUS_CLOSED) {
      if (executionStatus?.canExecute && !executeProposal.isPending) {
        return (
          <button
            onClick={handleExecute}
            disabled={executeProposal.isPending}
            className={
              executeProposal.isPending ? disabledClasses : successClasses
            }
          >
            {executeProposal.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Execute Proposal
              </>
            )}
          </button>
        );
      }

      if (!executionStatus?.canExecute) {
        return (
          <div className="text-sm text-red-600">
            ✗ {executionStatus?.reason || "Cannot execute"}
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div
      className={`rounded-lg p-4 hover:shadow-md transition-shadow border ${
        proposal.status === PROPOSAL_STATUS_ACTIVE ? "border-yellow-400/30" : "border-white/5"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg">{proposal.title}</h3>
          <p className="text-sm text-gray-600">{proposal.description}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 whitespace-nowrap ${
            statusColor[displayStatusLabel] || "bg-gray-500"
          }`}
        >
          {statusIcon[displayStatusLabel]}
          {proposal.status === PROPOSAL_STATUS_ACTIVE ? "Waiting for Voting" : displayStatusLabel}
        </span>
      </div>

      {proposal.status === PROPOSAL_STATUS_VOTING && (
        <div className="mb-3 text-xs text-gray-400">
          {currentTime === null ? (
            <span className="text-gray-500">Awaiting chain time…</span>
          ) : chainTimeError ? (
            <span className="text-amber-300 font-medium">
              Chain time unavailable — retrying
            </span>
          ) : showStaleCloseWarning ? (
            // Past the deadline plus the safety margin while the projection is
            // stale: the action is offered, but the contract makes the real call.
            <span className="text-amber-300 font-medium">
              Chain time is stale — the contract will verify whether voting can be
              closed
            </span>
          ) : chainTimeStale ? (
            <span className="text-gray-500">
              Syncing with chain… (estimate may be behind)
            </span>
          ) : votingWindowState.votingWindowExpired ? (
            <span className="text-amber-300 font-medium">
              Voting period expired — awaiting closure
            </span>
          ) : (
            <span>
              Voting closes in {formatTime(votingWindowState.remainingSeconds)}
            </span>
          )}
        </div>
      )}

      {/* Sponsorship Status (Draft / Active) */}
      {(proposal.status === PROPOSAL_STATUS_DRAFT || proposal.status === PROPOSAL_STATUS_ACTIVE) && (
        <div className="bg-[#131313] p-3 rounded-lg mb-3 text-sm hover:bg-[#11111a] transition-colors">
          <div className="flex justify-between items-center mb-2">
            <span>
              Sponsors:{" "}
              <span className="font-bold text-emerald-500">
                {proposal.sponsorCount}/3
              </span>{" "}
              from{" "}
              <span className="font-bold text-orange-400">
                {proposal.partyCount}/2
              </span>{" "}
              parties
            </span>
            {proposal.status === PROPOSAL_STATUS_DRAFT && proposal.thresholdMet && (
              <span className="text-green-600 font-semibold">
                ✓ Ready to activate
              </span>
            )}
            {proposal.status === PROPOSAL_STATUS_ACTIVE && (
              <span className="text-yellow-300 font-semibold">
                ⏳ Voting starts soon
              </span>
            )}
          </div>

          {proposal.status === PROPOSAL_STATUS_ACTIVE && (
            <div className="mb-3 text-xs text-gray-400">
              <p>Support phase completed</p>
              <p>Waiting for voting to begin</p>
              {currentTime === null ? (
                <p className="mt-1 font-semibold text-slate-200">
                  Awaiting chain time…
                </p>
              ) : chainTimeError ? (
                <p className="mt-1 font-semibold text-amber-300">
                  Chain time unavailable — retrying
                </p>
              ) : (
                <p className="mt-1 font-semibold text-slate-200">
                  Voting starts in {formatTime(remainingTime)}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="flex-1 mr-3">
              <div className="w-full bg-gray-800/60 rounded-full h-2">
                <div
                  className="bg-blue-700/50 h-2 rounded-full transition-all"
                  style={{ width: `${(proposal.sponsorCount / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voting Results */}
      {canDisplaySupporters && (
        <div className="bg-[#131313] p-3 rounded mb-3 text-sm">
          {/* Header */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-4">
              <span>
                Votes: <span className="font-bold">{totalVotes}</span>
              </span>

              <span>
                Quorum:{" "}
                <span className="font-bold">{quorumMet ? "✓" : "✗"}</span>
              </span>

              <span>
                Approved:{" "}
                <span className="font-bold">{approved ? "✓" : "✗"}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={onToggleExpand}
              aria-expanded={isExpanded}
              aria-controls={`supporting-parties-${proposal.id}`}
              aria-label={
                isExpanded ? "Collapse voting details" : "Expand voting details"
              }
              className="text-gray-400 transition-colors p-1 rounded-lg border border-white/5"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {/* )} */}
          </div>

          {/* Approval progress */}
          <div className="w-full bg-gray-800/60 rounded-full h-2">
            {totalVotes > 0 && (
              <div
                className="bg-blue-700/50 h-2 rounded-full transition-all"
                style={{ width: `${approvalPercentage}%` }}
              />
            )}
          </div>

          {/* Vote breakdown */}
          <div className="flex justify-between mt-2 text-xs">
            <span>For: {approvalVotes}</span>
            <span>Against: {rejectionVotes}</span>
            <span>
              Threshold: {approvalThresholdMet ? "✓ Met" : "✗ Not met"}
            </span>
          </div>

          {/* Expandable details */}
          <div
            id={`supporting-parties-${proposal.id}`}
            className={`overflow-hidden transition-all duration-300 ${
              isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-gray-500 mb-2 font-semibold">
                Supporting Parties & Seats:
              </p>

              {supporterDataLoading ? (
                <p className="text-xs text-gray-400">Loading supporters...</p>
              ) : supporterDataError ? (
                <p className="text-xs text-amber-300">
                  Supporter data is temporarily unavailable.
                </p>
              ) : sponsorEntries.length > 0 ? (
                <div className="space-y-2">
                  {sponsorEntries.map(([partyId, data]) => (
                    <div
                      key={partyId}
                      className="flex justify-between items-center"
                    >
                      <span className="text-blue-300 px-2 py-1 bg-blue-700/10 rounded border border-blue-300/5 text-xs">
                        {data.partyName}
                      </span>

                      <div className="flex gap-1">
                        {data.seatIds.map((seatId) => (
                          <span
                            key={seatId}
                            className="px-2 py-1 bg-white/10 text-gray-300 rounded text-xs font-mono"
                          >
                            #{seatId}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  No supporting seats recorded for this proposal.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {proposal.status === PROPOSAL_STATUS_ACTIVE ? (
        <div className="flex justify-end items-end my-3 mr-2">
          <div
            className={`text-xs px-2 py-1 border rounded-lg bg-slate-800/30 whitespace-nowrap ${
              isSupported
                ? "text-green-400 border-green-500/20"
                : "text-gray-400 border-white/10"
            }`}
          >
            {isSupported
              ? "✓ You supported this proposal"
              : "Support phase finished"}
          </div>
        </div>
      ) : proposal.status === PROPOSAL_STATUS_DRAFT &&
        canVote &&
        !proposal.thresholdMet &&
        !isSupported ? (
        <div className="flex justify-end items-end mt-3">
          <button
            onClick={handleSupport}
            disabled={isSupporting}
            className="px-4 py-2 bg-emerald-600/40 text-emerald-100 text-sm rounded-lg hover:bg-emerald-700/40 hover:cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {isSupporting ? "Supporting..." : "Support Proposal"}
          </button>
        </div>
      ) : isSupported && !isSupporting ? (
        <div className="flex justify-end items-end my-3 mr-2">
          <div className="text-xs text-green-400 px-2 py-1 border border-white/5 rounded-lg bg-green-800/20 whitespace-nowrap">
            ✓ You Supported this Proposal
          </div>
        </div>
      ) : null}

      {/* Voting Actions */}
      {votingWindowState.votingWindowOpen && canVote && voteOption === null && (
        <div className="flex gap-2 mt-3 mb-3">
          <button
            onClick={() => handleVote(0)}
            disabled={castVote.isPending}
            className="flex-1 px-4 py-2 bg-emerald-600/50 text-emerald-100 font-semibold border border-white/5 rounded-lg hover:cursor-pointer hover:bg-emerald-700/70 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {castVote.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Voting...
              </>
            ) : (
              "Vote For"
            )}
          </button>
          <button
            onClick={() => handleVote(1)}
            disabled={castVote.isPending}
            className="flex-1 px-4 py-2 bg-red-600/50 text-red-100 font-semibold border border-white/5 rounded-lg hover:cursor-pointer hover:bg-red-700/70 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {castVote.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Voting...
              </>
            ) : (
              "Vote Against"
            )}
          </button>
        </div>
      )}

      {voteOption !== null && (
        <div className="mt-2 mb-3 p-2 bg-[#131313] border border-white/5 rounded text-sm">
          ✓ You voted{" "}
          <span
            className={`font-bold ${
              voteOption === 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {voteOption === 0 ? "For" : "Against"}
          </span>
        </div>
      )}

      {/* Lifecycle Action Buttons */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
        <div className="text-xs text-gray-500">
          {proposal.statusLabel === "Draft" &&
            `Created at proposal #${proposal.id}`}
          {proposal.statusLabel === "Voting" &&
            `Voting ends at #${String(proposal.votingEndedAt) ?? "?"}`}
        </div>
        <div>{getActionButton()}</div>
      </div>
    </div>
  );
}
