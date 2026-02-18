import React, { useEffect, useState } from "react"
import {
  getProposalsByStatus,
  getProposalVotingResults,
  getSeatCount,
  getTotalSeatsIssued,
  getGovernanceParameters,
} from "../../hooks/useGovernanceRead"
import {
  supportProposal,
  vote,
  startVoting,
  closeVoting,
  executeProposal,
} from "../../hooks/useGovernanceWrite"
import { CheckCircle, Clock, AlertCircle, Play, CheckCheck, Vote } from "lucide-react"

interface Proposal {
  id: number
  title: string
  description: string
  status: number
  statusLabel: string
  sponsorCount: number
  partyCount: number
  thresholdMet: boolean
  isVoting: boolean
  isClosed: boolean
  votingEndedAt: number
}

interface GovernanceParameters {
  quorum: number
  votingDuration: number
  approvalThreshold: number
  minProposalDelay: number
  emergencyPause: boolean
}

export default function GovernanceDashboard({ userAddress }: { userAddress: string | null }) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [params, setParams] = useState<GovernanceParameters | null>(null)
  const [seatCount, setSeatCount] = useState(0)
  const [totalSeats, setTotalSeats] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<"draft" | "voting" | "passed">("voting")

  useEffect(() => {
    loadGovernanceData()
  }, [userAddress])

  async function loadGovernanceData() {
    try {
      setLoading(true)

      // Load governance parameters
      const govParams = await getGovernanceParameters()
      setParams(govParams)

      // Load seat info
      if (userAddress) {
        const seats = await getSeatCount(userAddress)
        setSeatCount(seats)
      }

      const total = await getTotalSeatsIssued()
      setTotalSeats(total)

      // Load proposals
      const allProposals = await getProposalsByStatus()
      setProposals(allProposals)
    } catch (error) {
      console.error("Error loading governance data:", error)
    } finally {
      setLoading(false)
    }
  }

  const draftProposals = proposals.filter((p) => p.status === 0)
  const votingProposals = proposals.filter((p) => p.status === 2)
  const passedProposals = proposals.filter((p) => p.status >= 3)

  const getTabProposals = () => {
    switch (selectedTab) {
      case "draft":
        return draftProposals
      case "voting":
        return votingProposals
      case "passed":
        return passedProposals
      default:
        return []
    }
  }

  const canVoteOrSupport = seatCount > 0

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Emergency Pause Alert */}
      {params?.emergencyPause && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
            <div>
              <p className="font-bold text-red-900">Emergency Pause Active</p>
              <p className="text-sm text-red-700">Proposal execution is temporarily blocked</p>
            </div>
          </div>
        </div>
      )}

      {/* Governance Parameters Card */}
      {params && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-lg mb-3">Governance Parameters</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Quorum:</span>{" "}
              <span className="font-mono font-bold">{params.quorum / 100}%</span>
            </div>
            <div>
              <span className="text-gray-600">Approval Threshold:</span>{" "}
              <span className="font-mono font-bold">{params.approvalThreshold / 100}%</span>
            </div>
            <div>
              <span className="text-gray-600">Voting Duration:</span>{" "}
              <span className="font-mono font-bold">{params.votingDuration / 86400} days</span>
            </div>
            <div>
              <span className="text-gray-600">Min Proposal Delay:</span>{" "}
              <span className="font-mono font-bold">{params.minProposalDelay / 3600} hours</span>
            </div>
          </div>
        </div>
      )}

      {/* Seat Status */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Your Seats</p>
            <p className="text-2xl font-bold text-purple-700">{seatCount}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Total Seats Issued</p>
            <p className="text-2xl font-bold text-purple-700">{totalSeats}</p>
          </div>
          {canVoteOrSupport ? (
            <div className="text-green-600 font-semibold">✓ Eligible to vote & support</div>
          ) : (
            <div className="text-red-600 font-semibold">✗ No voting rights</div>
          )}
        </div>
      </div>

      {/* Proposals Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedTab("draft")}
            className={`px-4 py-2 font-medium ${
              selectedTab === "draft"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Draft ({draftProposals.length})
          </button>
          <button
            onClick={() => setSelectedTab("voting")}
            className={`px-4 py-2 font-medium ${
              selectedTab === "voting"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Voting ({votingProposals.length})
          </button>
          <button
            onClick={() => setSelectedTab("passed")}
            className={`px-4 py-2 font-medium ${
              selectedTab === "passed"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Executed ({passedProposals.length})
          </button>
        </div>
      </div>

      {/* Proposals List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading proposals...</p>
        </div>
      ) : getTabProposals().length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No proposals in this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {getTabProposals().map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              userAddress={userAddress}
              canVote={canVoteOrSupport}
              onRefresh={loadGovernanceData}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProposalCard({
  proposal,
  userAddress,
  canVote,
  onRefresh,
}: {
  proposal: Proposal
  userAddress: string | null
  canVote: boolean
  onRefresh: () => void
}) {
  const [voting, setVoting] = useState(false)
  const [voteOption, setVoteOption] = useState<0 | 1 | null>(null)
  const [votingResults, setVotingResults] = useState<any>(null)

  useEffect(() => {
    if (proposal.isVoting || proposal.isClosed) {
      loadVotingResults()
    }
  }, [proposal.id])

  async function loadVotingResults() {
    try {
      const results = await getProposalVotingResults(proposal.id)
      setVotingResults(results)
    } catch (error) {
      console.error("Error loading voting results:", error)
    }
  }

  async function handleVote(optionId: 0 | 1) {
    if (!userAddress || !canVote) return

    try {
      setVoting(true)
      // Note: In real implementation, would need to get seat IDs for user
      await vote(proposal.id, 1, optionId) // Placeholder seat ID
      setVoteOption(optionId)
      await loadVotingResults()
      onRefresh()
    } catch (error) {
      console.error("Error voting:", error)
    } finally {
      setVoting(false)
    }
  }

  const statusColor: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-800",
    Active: "bg-yellow-100 text-yellow-800",
    Voting: "bg-blue-100 text-blue-800",
    Closed: "bg-purple-100 text-purple-800",
    Executed: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
  }

  const statusIcon: Record<string, React.ReactNode> = {
    Draft: <Clock className="w-4 h-4" />,
    Voting: <Vote className="w-4 h-4" />,
    Executed: <CheckCircle className="w-4 h-4" />,
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg">{proposal.title}</h3>
          <p className="text-sm text-gray-600">{proposal.description}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
            statusColor[proposal.statusLabel] || "bg-gray-100"
          }`}
        >
          {statusIcon[proposal.statusLabel]}
          {proposal.statusLabel}
        </span>
      </div>

      {/* Sponsorship Status (Draft) */}
      {proposal.status === 0 && (
        <div className="bg-gray-50 p-3 rounded mb-3 text-sm">
          <div className="flex justify-between items-center">
            <span>
              Sponsors: <span className="font-bold">{proposal.sponsorCount}/3</span> from{" "}
              <span className="font-bold">{proposal.partyCount}/2</span> parties
            </span>
            {proposal.thresholdMet && (
              <span className="text-green-600 font-semibold">✓ Ready to activate</span>
            )}
          </div>
          {canVote && !proposal.thresholdMet && (
            <button className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
              Support
            </button>
          )}
        </div>
      )}

      {/* Voting Results */}
      {votingResults && (
        <div className="bg-gray-50 p-3 rounded mb-3 text-sm">
          <div className="flex justify-between mb-2">
            <span>
              Votes: <span className="font-bold">{votingResults.totalVotesCast}</span>
            </span>
            <span>
              Quorum: <span className="font-bold">{votingResults.quorumMet ? "✓" : "✗"}</span>
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2">
            {votingResults.totalVotesCast > 0 && (
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: `${(votingResults.approvalVotes / votingResults.totalVotesCast) * 100}%`,
                }}
              />
            )}
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span>For: {votingResults.approvalVotes}</span>
            <span>Against: {votingResults.rejectionVotes}</span>
          </div>
        </div>
      )}

      {/* Voting Actions */}
      {proposal.isVoting && canVote && voteOption === null && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handleVote(0)}
            disabled={voting}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {voting ? "Voting..." : "Vote For"}
          </button>
          <button
            onClick={() => handleVote(1)}
            disabled={voting}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {voting ? "Voting..." : "Vote Against"}
          </button>
        </div>
      )}

      {voteOption !== null && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
          ✓ You voted {voteOption === 0 ? "For" : "Against"}
        </div>
      )}
    </div>
  )
}
