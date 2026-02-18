// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Proposal Models
 * @notice Data structures for governance proposals
 */

/// @notice Proposal status enum
enum ProposalStatus {
    Draft,      // Just created; not yet votable (needs cross-party sponsorship)
    Active,     // Activated by sponsors; awaiting voting delay
    Voting,     // Voting window open
    Closed,     // Voting window closed; awaiting execution check
    Executed,   // Executed successfully
    Rejected,   // Execution failed checks or was blocked
    Cancelled   // Deleted/archived
}

/// @notice Proposal type: RuleChange or Action
enum ProposalType {
    RuleChange, // Mutates GovernanceConfig parameters
    Action      // Executes whitelisted system action
}

/// @notice RuleChange types
enum RuleChangeType {
    Quorum,              // Change quorum percentage
    VotingDuration,      // Change voting duration
    ApprovalThreshold,   // Change approval threshold
    MinProposalDelay,    // Change minimum delay
    EmergencyPause,      // Enable/disable emergency pause
    ElectionAuthority,   // Change election authority address
    RecallAuthority      // Change recall authority address
}

/**
 * @notice Core proposal data (shared by all types)
 */
struct Proposal {
    uint256 id;
    address proposer;
    ProposalType proposalType;
    string title;
    string description;
    ProposalStatus status;
    uint256 createdAt;
    uint256 votingStartedAt;
    uint256 votingEndedAt;
    uint256 executedAt;
    uint256 blockNumber;
}

/**
 * @notice RuleChange proposal data
 * - Specifies what governance parameter is being changed
 * - Stores old value and new value for transparency
 */
struct RuleChangeData {
    RuleChangeType changeType;
    uint256 oldValue;
    uint256 newValue;
    address oldAddress;
    address newAddress;
}

/**
 * @notice Action proposal data
 * - Specifies a whitelisted system action to execute
 * - Stores target contract, function selector, and encoded parameters
 */
struct ActionData {
    address targetContract;
    bytes4 functionSelector;
    bytes encodedParams;
    string description;
}

/**
 * @notice Voting result data
 */
struct VotingResult {
    uint256 proposalId;
    uint256 totalVotesCast;
    uint256 approvalVotes;
    uint256 rejectionVotes;
    uint256 totalSeatsIssued;
    bool quorumMet;
    bool approvalThresholdMet;
    bool approved;
}
