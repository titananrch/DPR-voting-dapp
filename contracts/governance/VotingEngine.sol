// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../models/ProposalModels.sol";
import "./SeatNFT.sol";
import "./GovernanceConfig.sol";
import "./ProposalDraftManager.sol";

/**
 * @title VotingEngine
 * @notice Transparent, seat-based voting for governance proposals
 * 
 * Governance layer: Voting execution
 * 
 * Key features:
 * - Transparent voting: seatId → vote option is publicly queryable
 * - One vote per seat per proposal (enforced)
 * - Requires seat ownership for voting eligibility
 * - Vote counts aggregated for easy result calculation
 * - All votes logged immutably in events
 */
contract VotingEngine {
    
    // ═══════════════════════════════════════════════════════════════════════
    // DEPENDENCIES
    // ═══════════════════════════════════════════════════════════════════════
    
    SeatNFT public immutable seatNft;
    GovernanceConfig public immutable governanceConfig;
    ProposalDraftManager public immutable proposalManager;
    
    // ═══════════════════════════════════════════════════════════════════════
    // STATE: VOTING RECORDS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice TRANSPARENT: Vote record - proposalId → seatId → optionId (publicly queryable)
    mapping(uint256 => mapping(uint256 => uint256)) public voteRecord;
    
    /// @notice Track if a seat has voted on a proposal (for deduplication)
    mapping(uint256 => mapping(uint256 => bool)) public hasVoted;
    
    /// @notice Vote counts aggregated by option: proposalId → optionId → count
    mapping(uint256 => mapping(uint256 => uint256)) public voteCount;
    
    /// @notice Total votes cast on each proposal
    mapping(uint256 => uint256) public totalVotesCast;
    
    // ═══════════════════════════════════════════════════════════════════════
    // STATE: VOTING HISTORY (Immutable log)
    // ═══════════════════════════════════════════════════════════════════════
    
    struct VoteAction {
        uint256 proposalId;
        uint256 seatId;
        address voter;
        uint256 optionId;
        uint256 blockNumber;
        uint256 timestamp;
    }
    
    VoteAction[] public voteHistory;
    
    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Emitted when a vote is cast
    event VoteCast(
        uint256 indexed proposalId,
        uint256 indexed seatId,
        address indexed voter,
        uint256 optionId,
        uint256 blockNumber
    );
    
    /// @notice Emitted when a vote is recorded in the immutable history
    event VoteRecorded(
        uint256 indexed proposalId,
        uint256 indexed seatId,
        uint256 optionId,
        uint256 totalVotes
    );
    
    // ═══════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Require caller to own a seat
    modifier requiresSeatOwnership(uint256 seatId) {
        require(seatNft.ownerOf(seatId) == msg.sender, "You do not own this seat");
        _;
    }
    
    /// @notice Require proposal to be in voting status
    modifier proposalIsVoting(uint256 proposalId) {
        Proposal memory proposal = proposalManager.getProposal(proposalId);
        require(proposal.id > 0, "Proposal does not exist");
        require(proposal.status == ProposalStatus.Voting, "Proposal is not open for voting");
        require(block.timestamp < proposal.votingEndedAt, "Voting period has ended");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    constructor(
        address _seatNft,
        address _governanceConfig,
        address _proposalManager
    ) {
        require(_seatNft != address(0), "Invalid SeatNFT address");
        require(_governanceConfig != address(0), "Invalid GovernanceConfig address");
        require(_proposalManager != address(0), "Invalid ProposalManager address");
        
        seatNft = SeatNFT(_seatNft);
        governanceConfig = GovernanceConfig(_governanceConfig);
        proposalManager = ProposalDraftManager(_proposalManager);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // CORE: VOTING
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Cast a vote using a seat
     * @param proposalId ID of the proposal to vote on
     * @param seatId ID of the seat casting the vote
     * @param optionId The option being voted for (0 for RuleChange: Approve, 1: Reject)
     */
    function vote(
        uint256 proposalId,
        uint256 seatId,
        uint256 optionId
    ) 
        external 
        requiresSeatOwnership(seatId)
        proposalIsVoting(proposalId)
    {
        // Deduplication: ensure seat hasn't voted yet
        require(!hasVoted[proposalId][seatId], "This seat has already voted on this proposal");
        
        // Record the vote
        voteRecord[proposalId][seatId] = optionId;
        hasVoted[proposalId][seatId] = true;
        voteCount[proposalId][optionId]++;
        totalVotesCast[proposalId]++;
        
        // Log in immutable history
        voteHistory.push(VoteAction({
            proposalId: proposalId,
            seatId: seatId,
            voter: msg.sender,
            optionId: optionId,
            blockNumber: block.number,
            timestamp: block.timestamp
        }));
        
        // Emit events
        emit VoteCast(proposalId, seatId, msg.sender, optionId, block.number);
        emit VoteRecorded(proposalId, seatId, optionId, totalVotesCast[proposalId]);
    }
    
    /**
     * @notice Cast votes using multiple seats in a single transaction
     * @param proposalId ID of the proposal to vote on
     * @param seatIds Array of seat IDs casting votes
     * @param optionId The option being voted for (same for all seats)
     */
    function voteWithMultipleSeats(
        uint256 proposalId,
        uint256[] calldata seatIds,
        uint256 optionId
    ) 
        external 
        proposalIsVoting(proposalId)
    {
        require(seatIds.length > 0, "Must provide at least one seat");
        
        for (uint256 i = 0; i < seatIds.length; i++) {
            uint256 seatId = seatIds[i];
            
            // Verify ownership
            require(seatNft.ownerOf(seatId) == msg.sender, "You do not own all provided seats");
            
            // Deduplication
            require(!hasVoted[proposalId][seatId], "One of these seats has already voted");
            
            // Record the vote
            voteRecord[proposalId][seatId] = optionId;
            hasVoted[proposalId][seatId] = true;
            voteCount[proposalId][optionId]++;
            totalVotesCast[proposalId]++;
            
            // Log in history
            voteHistory.push(VoteAction({
                proposalId: proposalId,
                seatId: seatId,
                voter: msg.sender,
                optionId: optionId,
                blockNumber: block.number,
                timestamp: block.timestamp
            }));
            
            emit VoteCast(proposalId, seatId, msg.sender, optionId, block.number);
        }
        
        emit VoteRecorded(proposalId, seatIds[0], optionId, totalVotesCast[proposalId]);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // GETTERS: VOTE DATA
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get how a specific seat voted on a proposal (TRANSPARENT)
     * @param proposalId ID of the proposal
     * @param seatId ID of the seat
     * @return optionId The option voted for, or 0 if not voted
     */
    function getVote(uint256 proposalId, uint256 seatId) 
        external 
        view 
        returns (uint256 optionId) 
    {
        if (!hasVoted[proposalId][seatId]) {
            return type(uint256).max; // Indicate not voted
        }
        return voteRecord[proposalId][seatId];
    }
    
    /**
     * @notice Check if a seat has voted on a proposal
     * @param proposalId ID of the proposal
     * @param seatId ID of the seat
     * @return True if the seat has voted
     */
    function hasSeatsVoted(uint256 proposalId, uint256 seatId) 
        external 
        view 
        returns (bool) 
    {
        return hasVoted[proposalId][seatId];
    }
    
    /**
     * @notice Get vote count for a specific option
     * @param proposalId ID of the proposal
     * @param optionId ID of the option
     * @return Count of votes for this option
     */
    function getOptionVoteCount(uint256 proposalId, uint256 optionId) 
        external 
        view 
        returns (uint256) 
    {
        return voteCount[proposalId][optionId];
    }
    
    /**
     * @notice Get total votes cast on a proposal
     * @param proposalId ID of the proposal
     * @return Total number of votes cast
     */
    function getTotalVotes(uint256 proposalId) 
        external 
        view 
        returns (uint256) 
    {
        return totalVotesCast[proposalId];
    }
    
    /**
     * @notice Get voting results for a proposal (simplified version)
     * @param proposalId ID of the proposal
     * @return approvalVotes Number of votes for option 0 (Approve)
     * @return rejectionVotes Number of votes for option 1 (Reject)
     */
    function getVotingResults(uint256 proposalId) 
        external 
        view 
        returns (uint256 approvalVotes, uint256 rejectionVotes) 
    {
        approvalVotes = voteCount[proposalId][0];
        rejectionVotes = voteCount[proposalId][1];
    }
    
    /**
     * @notice Get voting result with full details
     * @param proposalId ID of the proposal
     * @return result VotingResult struct with all details
     */
    function getFullVotingResult(uint256 proposalId) 
        external 
        view 
        returns (VotingResult memory result) 
    {
        uint256 totalVotes = totalVotesCast[proposalId];
        uint256 approvalVotes = voteCount[proposalId][0];
        uint256 totalSeats = seatNft.totalSupply();
        uint256 quorum = governanceConfig.quorum();
        uint256 approvalThreshold = governanceConfig.approvalThreshold();
        
        bool quorumMet = totalSeats * quorum / 10000 <= totalVotes;
        bool approvalThresholdMet = totalVotes > 0 && approvalVotes * 10000 >= totalVotes * approvalThreshold;
        
        result = VotingResult({
            proposalId: proposalId,
            totalVotesCast: totalVotes,
            approvalVotes: approvalVotes,
            rejectionVotes: voteCount[proposalId][1],
            totalSeatsIssued: totalSeats,
            quorumMet: quorumMet,
            approvalThresholdMet: approvalThresholdMet,
            approved: quorumMet && approvalThresholdMet
        });
    }
    
    /**
     * @notice Get the voting history (immutable log)
     * @return Array of all vote actions
     */
    function getVoteHistory() external view returns (VoteAction[] memory) {
        return voteHistory;
    }
    
    /**
     * @notice Get voting history for a specific proposal
     * @param proposalId ID of the proposal
     * @return Array of vote actions for this proposal
     */
    function getProposalVoteHistory(uint256 proposalId) 
        external 
        view 
        returns (VoteAction[] memory) 
    {
        uint256 count = 0;
        for (uint256 i = 0; i < voteHistory.length; i++) {
            if (voteHistory[i].proposalId == proposalId) {
                count++;
            }
        }
        
        VoteAction[] memory result = new VoteAction[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < voteHistory.length; i++) {
            if (voteHistory[i].proposalId == proposalId) {
                result[index] = voteHistory[i];
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Get the total number of votes ever cast
     * @return Count of all vote actions
     */
    function getTotalVotesCastEver() external view returns (uint256) {
        return voteHistory.length;
    }
}
