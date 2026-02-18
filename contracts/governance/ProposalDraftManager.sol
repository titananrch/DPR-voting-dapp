// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../models/ProposalModels.sol";
import "./SeatNFT.sol";
import "./GovernanceConfig.sol";

/**
 * @title ProposalDraftManager
 * @notice Manages proposal lifecycle with cross-party sponsorship for spam control
 * 
 * Governance layer: Proposal creation and activation
 * 
 * Sponsorship Model:
 * - Proposer creates a draft proposal
 * - Draft requires ≥3 sponsors from ≥2 different parties to activate
 * - Only activated proposals can enter voting
 * - This prevents spam without cooldowns
 * 
 * Proposal Lifecycle:
 * Draft → (sponsorship threshold met) → Active → (minProposalDelay passed) → Voting → Closed
 */
contract ProposalDraftManager {
    
    // ═══════════════════════════════════════════════════════════════════════
    // DEPENDENCIES
    // ═══════════════════════════════════════════════════════════════════════
    
    SeatNFT public immutable seatNft;
    GovernanceConfig public immutable governanceConfig;
    
    // ═══════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════
    
    uint256 public constant MIN_SPONSORS_REQUIRED = 3;
    uint256 public constant MIN_PARTIES_REQUIRED = 2;
    uint256 public constant DRAFT_EXPIRATION_PERIOD = 30 days; // Drafts expire if not activated
    
    // ═══════════════════════════════════════════════════════════════════════
    // STATE: PROPOSALS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Next proposal ID to assign
    uint256 private nextProposalId = 1;
    
    /// @notice All proposals by ID
    mapping(uint256 => Proposal) private proposals;
    
    /// @notice RuleChange data for proposals
    mapping(uint256 => RuleChangeData) private ruleChangeData;
    
    /// @notice Action data for proposals
    mapping(uint256 => ActionData) private actionData;
    
    // ═══════════════════════════════════════════════════════════════════════
    // STATE: SPONSORSHIP
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Sponsors for each proposal: proposalId → seatIds
    mapping(uint256 => uint256[]) public proposalSponsors;
    
    /// @notice Track if a seat has already sponsored a proposal
    mapping(uint256 => mapping(uint256 => bool)) public hasSponsoredProposal;
    
    /// @notice Track unique parties that have sponsored: proposalId → partyIds
    mapping(uint256 => uint256[]) private sponsorParties;
    
    /// @notice Track if a party has already sponsored a proposal (to avoid duplicates in array)
    mapping(uint256 => mapping(uint256 => bool)) private partyHasSponsoredProposal;
    
    // ═══════════════════════════════════════════════════════════════════════
    // STATE: TRACKING
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice All draft proposal IDs (for filtering)
    uint256[] public draftProposalIds;
    
    /// @notice All active proposal IDs (ready for voting)
    uint256[] public activeProposalIds;
    
    /// @notice All voting proposal IDs
    uint256[] public votingProposalIds;
    
    /// @notice All closed proposal IDs
    uint256[] public closedProposalIds;
    
    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Emitted when a proposal is created in Draft status
    event DraftProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType indexed proposalType,
        string title,
        uint256 blockNumber
    );
    
    /// @notice Emitted when a seat supports a draft proposal
    event ProposalSupported(
        uint256 indexed proposalId,
        uint256 indexed seatId,
        address indexed supporter,
        uint256 supportCount,
        uint256 uniquePartyCount
    );
    
    /// @notice Emitted when a draft proposal is activated (ready for voting)
    event DraftActivated(
        uint256 indexed proposalId,
        uint256 sponsorCount,
        uint256 partyCount,
        uint256 votingStartTime,
        uint256 blockNumber
    );
    
    /// @notice Emitted when voting begins on an active proposal
    event VotingStarted(
        uint256 indexed proposalId,
        uint256 votingEndTime,
        uint256 blockNumber
    );
    
    /// @notice Emitted when voting closes on a proposal
    event VotingClosed(
        uint256 indexed proposalId,
        ProposalStatus newStatus,
        uint256 blockNumber
    );
    
    /// @notice Emitted when a draft expires without reaching sponsorship threshold
    event DraftExpired(
        uint256 indexed proposalId,
        uint256 finalSponsorCount
    );
    
    // ═══════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Require caller to hold at least one seat
    modifier onlySeatHolder() {
        require(seatNft.balanceOf(msg.sender) > 0, "Must hold a seat to propose");
        _;
    }
    
    /// @notice Require proposal exists
    modifier proposalExists(uint256 proposalId) {
        require(proposals[proposalId].id > 0, "Proposal does not exist");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    constructor(address _seatNft, address _governanceConfig) {
        require(_seatNft != address(0), "Invalid SeatNFT address");
        require(_governanceConfig != address(0), "Invalid GovernanceConfig address");
        
        seatNft = SeatNFT(_seatNft);
        governanceConfig = GovernanceConfig(_governanceConfig);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // CORE: PROPOSAL CREATION
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Create a new draft proposal (RuleChange type)
     * @param title Proposal title
     * @param description Proposal description
     * @param changeType Type of rule change (Quorum, Duration, etc.)
     * @param newValue New value for the rule parameter
     * @return proposalId ID of the newly created proposal
     */
    function createDraftProposal(
        string calldata title,
        string calldata description,
        RuleChangeType changeType,
        uint256 newValue
    ) external onlySeatHolder returns (uint256) {
        return _createDraftProposalInternal(
            title,
            description,
            ProposalType.RuleChange,
            changeType,
            newValue,
            msg.sender
        );
    }
    
    /**
     * @notice Create a new draft proposal (RuleChange with address, e.g., for authority changes)
     * @param title Proposal title
     * @param description Proposal description
     * @param changeType Type of rule change (ElectionAuthority, RecallAuthority, etc.)
     * @param newAddress New address for the authority
     * @return proposalId ID of the newly created proposal
     */
    function createDraftProposalWithAddress(
        string calldata title,
        string calldata description,
        RuleChangeType changeType,
        address newAddress
    ) external onlySeatHolder returns (uint256) {
        require(changeType == RuleChangeType.ElectionAuthority || 
                changeType == RuleChangeType.RecallAuthority, 
                "This change type requires a uint256, not address");
        
        uint256 proposalId = nextProposalId++;
        
        Proposal memory newProposal = Proposal({
            id: proposalId,
            proposer: msg.sender,
            proposalType: ProposalType.RuleChange,
            title: title,
            description: description,
            status: ProposalStatus.Draft,
            createdAt: block.timestamp,
            votingStartedAt: 0,
            votingEndedAt: 0,
            executedAt: 0,
            blockNumber: block.number
        });
        
        proposals[proposalId] = newProposal;
        draftProposalIds.push(proposalId);
        
        // Store rule change data with address
        ruleChangeData[proposalId] = RuleChangeData({
            changeType: changeType,
            oldValue: 0,
            newValue: 0,
            oldAddress: address(0),
            newAddress: newAddress
        });
        
        emit DraftProposalCreated(
            proposalId,
            msg.sender,
            ProposalType.RuleChange,
            title,
            block.number
        );
        
        return proposalId;
    }
    
    /**
     * @notice Create a new draft proposal (Action type)
     * @param title Proposal title
     * @param description Proposal description
     * @param targetContract Target contract for the action
     * @param functionSelector Function selector to call
     * @param encodedParams Encoded parameters for the function
     * @return proposalId ID of the newly created proposal
     */
    function createActionProposal(
        string calldata title,
        string calldata description,
        address targetContract,
        bytes4 functionSelector,
        bytes calldata encodedParams
    ) external onlySeatHolder returns (uint256) {
        require(targetContract != address(0), "Invalid target contract");
        
        uint256 proposalId = nextProposalId++;
        
        Proposal memory newProposal = Proposal({
            id: proposalId,
            proposer: msg.sender,
            proposalType: ProposalType.Action,
            title: title,
            description: description,
            status: ProposalStatus.Draft,
            createdAt: block.timestamp,
            votingStartedAt: 0,
            votingEndedAt: 0,
            executedAt: 0,
            blockNumber: block.number
        });
        
        proposals[proposalId] = newProposal;
        draftProposalIds.push(proposalId);
        
        // Store action data
        actionData[proposalId] = ActionData({
            targetContract: targetContract,
            functionSelector: functionSelector,
            encodedParams: encodedParams,
            description: description
        });
        
        emit DraftProposalCreated(
            proposalId,
            msg.sender,
            ProposalType.Action,
            title,
            block.number
        );
        
        return proposalId;
    }
    
    /**
     * @notice Internal function to create a draft proposal (RuleChange with uint256)
     */
    function _createDraftProposalInternal(
        string calldata title,
        string calldata description,
        ProposalType proposalType,
        RuleChangeType changeType,
        uint256 newValue,
        address proposer
    ) internal returns (uint256) {
        uint256 proposalId = nextProposalId++;
        
        Proposal memory newProposal = Proposal({
            id: proposalId,
            proposer: proposer,
            proposalType: proposalType,
            title: title,
            description: description,
            status: ProposalStatus.Draft,
            createdAt: block.timestamp,
            votingStartedAt: 0,
            votingEndedAt: 0,
            executedAt: 0,
            blockNumber: block.number
        });
        
        proposals[proposalId] = newProposal;
        draftProposalIds.push(proposalId);
        
        // Store rule change data with explicit changeType for deterministic execution
        ruleChangeData[proposalId] = RuleChangeData({
            changeType: changeType,
            oldValue: 0,
            newValue: newValue,
            oldAddress: address(0),
            newAddress: address(0)
        });
        
        emit DraftProposalCreated(
            proposalId,
            proposer,
            proposalType,
            title,
            block.number
        );
        
        return proposalId;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // CORE: SPONSORSHIP
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Support a draft proposal with a seat
     * @param proposalId ID of the proposal to support
     * @param seatId ID of the seat providing support
     */
    function supportProposal(uint256 proposalId, uint256 seatId) 
        external 
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        
        // Validation
        require(proposal.status == ProposalStatus.Draft, "Proposal is not in Draft status");
        require(block.timestamp < proposal.createdAt + DRAFT_EXPIRATION_PERIOD, "Draft has expired");
        require(seatNft.ownerOf(seatId) == msg.sender, "You do not own this seat");
        require(!hasSponsoredProposal[proposalId][seatId], "This seat has already sponsored this proposal");
        
        // Add sponsor
        proposalSponsors[proposalId].push(seatId);
        hasSponsoredProposal[proposalId][seatId] = true;
        
        // Track party
        uint256 partyId = seatNft.seatParty(seatId);
        if (!partyHasSponsoredProposal[proposalId][partyId]) {
            sponsorParties[proposalId].push(partyId);
            partyHasSponsoredProposal[proposalId][partyId] = true;
        }
        
        uint256 supportCount = proposalSponsors[proposalId].length;
        uint256 uniquePartyCount = sponsorParties[proposalId].length;
        
        emit ProposalSupported(proposalId, seatId, msg.sender, supportCount, uniquePartyCount);
        
        // Check if sponsorship threshold is met
        if (supportCount >= MIN_SPONSORS_REQUIRED && uniquePartyCount >= MIN_PARTIES_REQUIRED) {
            _activateDraft(proposalId);
        }
    }
    
    /**
     * @notice Manually activate a draft proposal if sponsorship threshold is met
     * (Can be called permissionlessly; useful if auto-activation doesn't trigger)
     * @param proposalId ID of the proposal to activate
     */
    function activateDraft(uint256 proposalId) 
        external 
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Draft, "Proposal is not in Draft status");
        
        uint256 sponsorCount = proposalSponsors[proposalId].length;
        uint256 partyCount = sponsorParties[proposalId].length;
        
        require(
            sponsorCount >= MIN_SPONSORS_REQUIRED && partyCount >= MIN_PARTIES_REQUIRED,
            "Sponsorship threshold not met"
        );
        
        _activateDraft(proposalId);
    }
    
    /**
     * @notice Internal function to activate a draft proposal
     */
    function _activateDraft(uint256 proposalId) internal {
        Proposal storage proposal = proposals[proposalId];
        proposal.status = ProposalStatus.Active;
        
        uint256 sponsorCount = proposalSponsors[proposalId].length;
        uint256 partyCount = sponsorParties[proposalId].length;
        uint256 votingStartTime = block.timestamp + governanceConfig.minProposalDelay();
        proposal.votingStartedAt = votingStartTime;
        
        activeProposalIds.push(proposalId);
        
        emit DraftActivated(proposalId, sponsorCount, partyCount, votingStartTime, block.number);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // CORE: VOTING TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Transition an active proposal to voting status
     * (Can be called permissionlessly once minProposalDelay has passed)
     * @param proposalId ID of the proposal to transition
     */
    function startVoting(uint256 proposalId) 
        external 
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Active, "Proposal is not in Active status");
        require(block.timestamp >= proposal.votingStartedAt, "Voting delay period not yet passed");
        
        proposal.status = ProposalStatus.Voting;
        proposal.votingEndedAt = block.timestamp + governanceConfig.votingDuration();
        votingProposalIds.push(proposalId);
        
        emit VotingStarted(proposalId, proposal.votingEndedAt, block.number);
    }
    
    /**
     * @notice Transition a voting proposal to closed status
     * (Can be called permissionlessly once voting period has expired)
     * @param proposalId ID of the proposal to close
     */
    function closeVoting(uint256 proposalId) 
        external 
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Voting, "Proposal is not in Voting status");
        require(block.timestamp >= proposal.votingEndedAt, "Voting period not yet ended");
        
        proposal.status = ProposalStatus.Closed;
        closedProposalIds.push(proposalId);
        
        emit VotingClosed(proposalId, ProposalStatus.Closed, block.number);
    }
    
    /**
     * @notice Expire a draft proposal that hasn't reached sponsorship threshold
     * @param proposalId ID of the proposal to expire
     */
    function expireDraft(uint256 proposalId) 
        external 
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Draft, "Proposal is not in Draft status");
        require(
            block.timestamp >= proposal.createdAt + DRAFT_EXPIRATION_PERIOD,
            "Draft expiration period not yet reached"
        );
        
        proposal.status = ProposalStatus.Cancelled;
        
        emit DraftExpired(proposalId, proposalSponsors[proposalId].length);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // GETTERS: PROPOSAL DATA
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get all sponsors of a proposal
     * @param proposalId ID of the proposal
     * @return Array of seat IDs that supported this proposal
     */
    function getProposalSponsors(uint256 proposalId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return proposalSponsors[proposalId];
    }
    
    /**
     * @notice Get all sponsor parties of a proposal
     * @param proposalId ID of the proposal
     * @return Array of party IDs represented in sponsorship
     */
    function getProposalSponsorParties(uint256 proposalId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return sponsorParties[proposalId];
    }
    
    /**
     * @notice Get sponsorship status of a proposal
     * @param proposalId ID of the proposal
     * @return sponsorCount Number of sponsors
     * @return partyCount Number of unique parties represented
     * @return thresholdMet Whether sponsorship threshold is met
     */
    function getSponsorshipStatus(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId)
        returns (uint256 sponsorCount, uint256 partyCount, bool thresholdMet) 
    {
        sponsorCount = proposalSponsors[proposalId].length;
        partyCount = sponsorParties[proposalId].length;
        thresholdMet = sponsorCount >= MIN_SPONSORS_REQUIRED && partyCount >= MIN_PARTIES_REQUIRED;
    }
    
    /**
     * @notice Get proposal data (safe struct return with dynamic types)
     * @param proposalId ID of the proposal
     * @return Proposal struct data
     */
    function getProposal(uint256 proposalId) 
        external 
        view 
        returns (Proposal memory) 
    {
        return proposals[proposalId];
    }
    
    /**
     * @notice Get all draft proposals
     * @return Array of draft proposal IDs
     */
    function getDraftProposals() external view returns (uint256[] memory) {
        return draftProposalIds;
    }
    
    /**
     * @notice Get all active proposals
     * @return Array of active proposal IDs
     */
    function getActiveProposals() external view returns (uint256[] memory) {
        return activeProposalIds;
    }
    
    /**
     * @notice Get all voting proposals
     * @return Array of voting proposal IDs
     */
    function getVotingProposals() external view returns (uint256[] memory) {
        return votingProposalIds;
    }
    
    /**
     * @notice Get all closed proposals
     * @return Array of closed proposal IDs
     */
    function getClosedProposals() external view returns (uint256[] memory) {
        return closedProposalIds;
    }
    
    /**
     * @notice Get the total number of proposals created
     * @return Count of proposals (nextProposalId - 1)
     */
    function getProposalCount() external view returns (uint256) {
        return nextProposalId - 1;
    }
    
    /**
     * @notice Get RuleChange data for a proposal
     * @param proposalId ID of the proposal
     * @return RuleChangeData struct
     */
    function getRuleChangeData(uint256 proposalId) 
        external 
        view 
        returns (RuleChangeData memory) 
    {
        return ruleChangeData[proposalId];
    }
    
    /**
     * @notice Get Action data for a proposal
     * @param proposalId ID of the proposal
     * @return ActionData struct
     */
    function getActionData(uint256 proposalId) 
        external 
        view 
        returns (ActionData memory) 
    {
        return actionData[proposalId];
    }
}
