// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../models/ProposalModels.sol";
import "./SeatNFT.sol";
import "./GovernanceConfig.sol";
import "./ProposalDraftManager.sol";
import "./VotingEngine.sol";
import "./ActionExecutor.sol";

/**
 * @title ExecutionEngine
 * @notice Executes approved governance proposals
 *
 * Governance layer: Proposal execution and rule enforcement
 *
 * Key responsibilities:
 * - Check if proposal meets quorum and approval threshold
 * - Execute RuleChange proposals by updating GovernanceConfig
 * - Execute Action proposals by calling ActionExecutor
 * - Respect emergency pause (blocks execution, not voting)
 * - Prevent re-execution (idempotence)
 * - Immutable execution history
 */
contract ExecutionEngine {
    // ═══════════════════════════════════════════════════════════════════════
    // DEPENDENCIES
    // ═══════════════════════════════════════════════════════════════════════

    SeatNFT public immutable seatNft;
    GovernanceConfig public immutable governanceConfig;
    ProposalDraftManager public immutable proposalManager;
    VotingEngine public immutable votingEngine;
    ActionExecutor public actionExecutor;

    // ═══════════════════════════════════════════════════════════════════════
    // STATE: EXECUTION TRACKING
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Track if a proposal has been executed
    mapping(uint256 => bool) public executed;

    /// @notice Track execution result for each proposal
    mapping(uint256 => ExecutionResult) public executionResults;

    // ═══════════════════════════════════════════════════════════════════════
    // STATE: IMMUTABLE HISTORY
    // ═══════════════════════════════════════════════════════════════════════

    struct ExecutionResult {
        bool approved;
        bool executed;
        string reason;
        uint256 blockNumber;
        uint256 timestamp;
    }

    ExecutionResult[] public executionHistory;

    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Emitted when a proposal is checked for execution (before executing)
    event ProposalEvaluated(
        uint256 indexed proposalId,
        uint256 totalVotes,
        uint256 approvalVotes,
        uint256 quorumRequired,
        bool quorumMet,
        bool approvalMet,
        uint256 blockNumber
    );

    /// @notice Emitted when a RuleChange proposal is executed successfully
    event RuleChangeExecuted(
        uint256 indexed proposalId,
        RuleChangeType indexed changeType,
        uint256 oldValue,
        uint256 newValue,
        address oldAddress,
        address newAddress,
        uint256 blockNumber
    );

    /// @notice Emitted when an Action proposal is executed successfully
    event ActionExecuted(
        uint256 indexed proposalId,
        address indexed targetContract,
        bytes4 functionSelector,
        uint256 blockNumber
    );

    /// @notice Emitted when a proposal is rejected (failed checks)
    event ProposalRejected(
        uint256 indexed proposalId,
        string reason,
        uint256 blockNumber
    );

    /// @notice Emitted when execution is blocked by emergency pause
    event ExecutionPausedByEmergency(
        uint256 indexed proposalId,
        uint256 blockNumber
    );

    /// @notice Emitted when a proposal is executed
    event ProposalExecuted(
        uint256 indexed proposalId,
        bool approved,
        string reason,
        uint256 blockNumber
    );

    // ═══════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Require proposal to be closed and not yet executed
    modifier proposalIsClosed(uint256 proposalId) {
        Proposal memory proposal = proposalManager.getProposal(proposalId);
        require(proposal.id > 0, "Proposal does not exist");
        require(
            proposal.status == ProposalStatus.Closed,
            "Proposal is not closed"
        );
        require(!executed[proposalId], "Proposal has already been executed");
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    constructor(
        address _seatNft,
        address _governanceConfig,
        address _proposalManager,
        address _votingEngine,
        address _actionExecutor
    ) {
        require(_seatNft != address(0), "Invalid SeatNFT address");
        require(
            _governanceConfig != address(0),
            "Invalid GovernanceConfig address"
        );
        require(
            _proposalManager != address(0),
            "Invalid ProposalManager address"
        );
        require(_votingEngine != address(0), "Invalid VotingEngine address");
        require(
            _actionExecutor != address(0),
            "Invalid ActionExecutor address"
        );

        seatNft = SeatNFT(_seatNft);
        governanceConfig = GovernanceConfig(_governanceConfig);
        proposalManager = ProposalDraftManager(_proposalManager);
        votingEngine = VotingEngine(_votingEngine);
        actionExecutor = ActionExecutor(_actionExecutor);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CORE: EXECUTION CHECKS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Check if a proposal can be executed
     * @param proposalId ID of the proposal to check
     * @return canExecute True if proposal meets all execution criteria
     * @return reason Reason if proposal cannot be executed
     */
    function canExecuteProposal(
        uint256 proposalId
    ) external view returns (bool canExecute, string memory reason) {
        Proposal memory proposal = proposalManager.getProposal(proposalId);

        if (proposal.id == 0) {
            return (false, "Proposal does not exist");
        }

        if (proposal.status != ProposalStatus.Closed) {
            return (false, "Proposal is not closed");
        }

        if (executed[proposalId]) {
            return (false, "Proposal has already been executed");
        }

        if (governanceConfig.emergencyPause()) {
            return (false, "Emergency pause is active");
        }

        // Check quorum
        uint256 totalVotes = votingEngine.totalVotesCast(proposalId);
        uint256 totalSeats = seatNft.totalSupply();
        uint256 quorumRequired = (totalSeats * governanceConfig.quorum()) /
            10000;

        // Ensure at least 1 vote required
        if (quorumRequired == 0) {
            quorumRequired = 1;
        }

        if (totalVotes < quorumRequired) {
            return (false, "Quorum not met");
        }

        // Check approval threshold
        uint256 approvalVotes = votingEngine.voteCount(proposalId, 0);
        uint256 approvalThreshold = governanceConfig.approvalThreshold();

        if (
            totalVotes > 0 &&
            (approvalVotes * 10000) < (totalVotes * approvalThreshold)
        ) {
            return (false, "Approval threshold not met");
        }

        return (true, "");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CORE: PROPOSAL EXECUTION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Execute a closed proposal (RuleChange or Action)
     * @param proposalId ID of the proposal to execute
     * @return success True if execution was successful
     */
    function executeProposal(
        uint256 proposalId
    ) external proposalIsClosed(proposalId) returns (bool success) {
        Proposal memory proposal = proposalManager.getProposal(proposalId);

        // Check execution criteria
        uint256 totalVotes = votingEngine.totalVotesCast(proposalId);
        uint256 totalSeats = seatNft.totalSupply();
        uint256 quorumRequired = (totalSeats * governanceConfig.quorum()) /
            10000;
        uint256 approvalVotes = votingEngine.voteCount(proposalId, 0);
        uint256 approvalThreshold = governanceConfig.approvalThreshold();

        // Emit evaluation event
        bool quorumMet = totalVotes >= quorumRequired;
        bool approvalMet = totalVotes > 0 &&
            (approvalVotes * 10000) >= (totalVotes * approvalThreshold);

        emit ProposalEvaluated(
            proposalId,
            totalVotes,
            approvalVotes,
            quorumRequired,
            quorumMet,
            approvalMet,
            block.number
        );

        // Check emergency pause
        // A pause is a TEMPORARY condition, not a governance decision. Revert so
        // that no terminal state is committed: the proposal stays Closed, its
        // execution flag is not consumed, no execution result is written, and it
        // remains retryable once the pause is lifted.
        if (governanceConfig.emergencyPause()) {
            revert("Emergency pause active");
        }

        // Check quorum and approval
        if (!quorumMet || !approvalMet) {
            string memory reason = !quorumMet
                ? "Quorum not met"
                : "Approval threshold not met";

            // Persist the authoritative terminal status FIRST. The proposal did
            // not meet governance requirements, so it is Rejected - and this is
            // final because the votes are already cast and counted.
            proposalManager.markProposalRejected(proposalId);

            executed[proposalId] = true;
            executionResults[proposalId] = ExecutionResult({
                approved: false,
                executed: false,
                reason: reason,
                blockNumber: block.number,
                timestamp: block.timestamp
            });

            // ProposalExecuted is intentionally NOT emitted here: the proposal was
            // not executed. ProposalRejected plus ProposalStatusUpdated describe
            // this outcome accurately.
            emit ProposalRejected(proposalId, reason, block.number);

            return false;
        }

        // Execute based on proposal type
        // A failure here reverts the entire transaction, so no terminal status,
        // execution flag, or execution result can be committed for a failed action.
        if (proposal.proposalType == ProposalType.RuleChange) {
            _executeRuleChange(proposalId);
        } else if (proposal.proposalType == ProposalType.Action) {
            _executeAction(proposalId);
        } else {
            revert("Unknown proposal type");
        }

        // Persist the authoritative terminal status in ProposalDraftManager.
        // This must happen AFTER the execution above so that a reverted execution
        // can never leave behind an Executed proposal.
        proposalManager.markProposalExecuted(proposalId);

        executed[proposalId] = true;
        executionResults[proposalId] = ExecutionResult({
            approved: true,
            executed: true,
            reason: "Executed successfully",
            blockNumber: block.number,
            timestamp: block.timestamp
        });

        emit ProposalExecuted(
            proposalId,
            true,
            "Executed successfully",
            block.number
        );

        return true;
    }

    /**
     * @notice Internal function to execute a RuleChange proposal
     * @dev Validates that changeType matches payload fields to prevent mismatches
     */
    function _executeRuleChange(uint256 proposalId) internal {
        RuleChangeData memory changeData = proposalManager.getRuleChangeData(
            proposalId
        );
        address oldAddress = address(0);
        address newAddress = address(0);

        // Get old values for logging
        uint256 oldValue = 0;
        uint256 newValue = changeData.newValue;

        // Validate payload matches changeType
        if (changeData.changeType == RuleChangeType.Quorum) {
            require(
                changeData.newAddress == address(0),
                "Quorum change must not have address"
            );
            oldValue = governanceConfig.quorum();
            governanceConfig.updateQuorum(newValue, proposalId);
        } else if (changeData.changeType == RuleChangeType.VotingDuration) {
            require(
                changeData.newAddress == address(0),
                "VotingDuration change must not have address"
            );
            oldValue = governanceConfig.votingDuration();
            governanceConfig.updateVotingDuration(newValue, proposalId);
        } else if (changeData.changeType == RuleChangeType.ApprovalThreshold) {
            require(
                changeData.newAddress == address(0),
                "ApprovalThreshold change must not have address"
            );
            oldValue = governanceConfig.approvalThreshold();
            governanceConfig.updateApprovalThreshold(newValue, proposalId);
        } else if (changeData.changeType == RuleChangeType.MinProposalDelay) {
            require(
                changeData.newAddress == address(0),
                "MinProposalDelay change must not have address"
            );
            oldValue = governanceConfig.minProposalDelay();
            governanceConfig.updateMinProposalDelay(newValue, proposalId);
        } else if (changeData.changeType == RuleChangeType.EmergencyPause) {
            require(
                changeData.newAddress == address(0),
                "EmergencyPause change must not have address"
            );
            oldValue = governanceConfig.emergencyPause() ? 1 : 0;
            governanceConfig.setEmergencyPause(newValue == 1, proposalId);
        } else if (changeData.changeType == RuleChangeType.ElectionAuthority) {
            require(
                changeData.newValue == 0,
                "ElectionAuthority change must not have uint256 value"
            );
            require(
                changeData.newAddress != address(0),
                "ElectionAuthority must have valid address"
            );
            oldAddress = governanceConfig.electionAuthority();
            newAddress = changeData.newAddress;
            governanceConfig.updateElectionAuthority(newAddress, proposalId);
        } else if (changeData.changeType == RuleChangeType.RecallAuthority) {
            require(
                changeData.newValue == 0,
                "RecallAuthority change must not have uint256 value"
            );
            require(
                changeData.newAddress != address(0),
                "RecallAuthority must have valid address"
            );
            oldAddress = governanceConfig.recallAuthority();
            newAddress = changeData.newAddress;
            governanceConfig.updateRecallAuthority(newAddress, proposalId);
        } else {
            revert("Unknown RuleChangeType");
        }

        emit RuleChangeExecuted(
            proposalId,
            changeData.changeType,
            oldValue,
            newValue,
            oldAddress,
            newAddress,
            block.number
        );
    }

    /**
     * @notice Internal function to execute an Action proposal
     * @dev ActionExecutor.execute() performs a low-level call and returns whether
     *      it succeeded. That boolean MUST be enforced here - otherwise a failed
     *      external call would still be recorded as a successful execution
     *      (violating "failed execution must never be represented as successful").
     *
     *      The revert rolls back the whole transaction, so no Executed status,
     *      execution flag, execution result, or ActionExecuted event can be
     *      committed for an action that failed.
     *
     *      ActionExecutor.execute() also reverts for non-whitelisted targets, which
     *      propagates here for the same reason.
     */
    function _executeAction(uint256 proposalId) internal {
        ActionData memory actionData = proposalManager.getActionData(
            proposalId
        );

        bool success = actionExecutor.execute(
            proposalId,
            actionData.targetContract,
            actionData.functionSelector,
            actionData.encodedParams
        );

        require(success, "Action execution failed");

        emit ActionExecuted(
            proposalId,
            actionData.targetContract,
            actionData.functionSelector,
            block.number
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GETTERS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Get execution result for a proposal
     * @param proposalId ID of the proposal
     * @return result ExecutionResult struct
     */
    function getExecutionResult(
        uint256 proposalId
    ) external view returns (ExecutionResult memory result) {
        return executionResults[proposalId];
    }

    /**
     * @notice Get the execution history
     * @return Array of all execution results
     */
    function getExecutionHistory()
        external
        view
        returns (ExecutionResult[] memory)
    {
        return executionHistory;
    }

    /**
     * @notice Get the total number of proposals executed
     * @return Count of executed proposals
     */
    function getTotalExecutedProposals() external view returns (uint256) {
        return executionHistory.length;
    }
}
