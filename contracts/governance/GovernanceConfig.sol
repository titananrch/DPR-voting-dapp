// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GovernanceConfig
 * @notice Mutable governance parameters and rules
 * 
 * Part of the governance layer:
 * - Stores rules (quorum, voting duration, approval threshold)
 * - Stores authorities (election, recall)
 * - Can only be updated by ExecutionEngine (after successful vote)
 * - All changes are immutably logged in events
 * - Provides centralized lookup for all governance parameters
 */
contract GovernanceConfig {
    
    // ═══════════════════════════════════════════════════════════════════════
    // IMMUTABLE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice SeatNFT contract (immutable reference to constitutional layer)
    address public immutable seatNftAddress;
    
    /** 
    * @notice ExecutionEngine contract changes, shouldn't be immutable:
    * ExecutionEngine is operational.
    * GovernanceConfig is constitutional.
    *
    * Execution should be dependent.
    * Constitution should not be mutable to execution.)
    */
    address public executionEngineAddress;
    
    /// @notice Constitution version (unchangeable)
    uint256 public immutable constitutionVersion = 1;
    
    // ═══════════════════════════════════════════════════════════════════════
    // MUTABLE GOVERNANCE PARAMETERS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Quorum requirement: percentage of issued seats needed to vote (0-10000, where 5100 = 51%)
    uint256 public quorum = 5100; // Default: 51%
    
    /// @notice Voting duration: time window for voting in seconds
    uint256 public votingDuration = 604800; // Default: 7 days
    
    /// @notice Approval threshold: percentage of votes cast needed for approval (0-10000, where 5000 = 50%)
    uint256 public approvalThreshold = 5000; // Default: 50%
    
    /// @notice Minimum delay: time before a draft proposal becomes votable (seconds)
    uint256 public minProposalDelay = 86400; // Default: 24 hours
    
    /// @notice Emergency pause: blocks execution (but not voting) when true
    bool public emergencyPause = false;
    
    // ═══════════════════════════════════════════════════════════════════════
    // MUTABLE AUTHORITIES
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Address authorized to mint seats (election authority)
    address public electionAuthority;
    
    /// @notice Address authorized to burn seats (recall authority)
    address public recallAuthority;

    /// @notice Anchor Constitution.md on-chain
    bytes32 public constitutionHash;
    // ═══════════════════════════════════════════════════════════════════════
    // IMMUTABLE HISTORY
    // ═══════════════════════════════════════════════════════════════════════
    
    struct ConfigChange {
        string parameterName;
        uint256 oldValue;
        uint256 newValue;
        uint256 blockNumber;
        uint256 timestamp;
        uint256 proposalId; // Proposal that triggered this change
    }
    
    struct AuthorityChange {
        string authorityType; // "election" or "recall"
        address oldAddress;
        address newAddress;
        uint256 blockNumber;
        uint256 timestamp;
        uint256 proposalId;
    }
    
    ConfigChange[] public configHistory;
    AuthorityChange[] public authorityHistory;
    
    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Emitted when a governance parameter is updated
    event ConfigUpdated(
        string indexed parameterName,
        uint256 oldValue,
        uint256 newValue,
        uint256 indexed proposalId,
        uint256 blockNumber
    );
    
    /// @notice Emitted when an authority is updated
    event AuthorityUpdated(
        string indexed authorityType,
        address indexed oldAddress,
        address indexed newAddress,
        uint256 proposalId,
        uint256 blockNumber
    );
    
    // ═══════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════
    
    error OnlyExecutionEngine(address caller);
    error InvalidParameterValue(string param);
    error InvalidAuthority(string reason);
    
    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @param _seatNftAddress SeatNFT contract address
     * @param _electionAuthority Initial election authority
     * @param _recallAuthority Initial recall authority
     */
    constructor(
        address _seatNftAddress,
        address _electionAuthority,
        address _recallAuthority
    ) {
        require(_seatNftAddress != address(0), "Invalid SeatNFT address");
        require(_electionAuthority != address(0), "Invalid election authority");
        require(_recallAuthority != address(0), "Invalid recall authority");
        
        seatNftAddress = _seatNftAddress;
        electionAuthority = _electionAuthority;
        recallAuthority = _recallAuthority;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // UPDATE FUNCTIONS: EXECUTION ENGINE ONLY
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Update quorum requirement
     * @param _newQuorum New quorum percentage (0-10000)
     * @param _proposalId Proposal that authorized this change
     */
    function updateQuorum(uint256 _newQuorum, uint256 _proposalId) external {
        if (msg.sender != executionEngineAddress) {
            revert OnlyExecutionEngine(msg.sender);
        }
        if (_newQuorum > 10000) {
            revert InvalidParameterValue("quorum must be <= 10000");
        }
        
        uint256 oldQuorum = quorum;
        quorum = _newQuorum;
        
        configHistory.push(ConfigChange({
            parameterName: "quorum",
            oldValue: oldQuorum,
            newValue: _newQuorum,
            blockNumber: block.number,
            timestamp: block.timestamp,
            proposalId: _proposalId
        }));
        
        emit ConfigUpdated("quorum", oldQuorum, _newQuorum, _proposalId, block.number);
    }
    
    /**
     * @notice Update voting duration
     * @param _newDuration New voting duration in seconds
     * @param _proposalId Proposal that authorized this change
     */
    function updateVotingDuration(uint256 _newDuration, uint256 _proposalId) external {
        if (msg.sender != executionEngineAddress) {
            revert OnlyExecutionEngine(msg.sender);
        }
        if (_newDuration < 3600 || _newDuration > 30 days) {
            revert InvalidParameterValue("votingDuration must be between 1 hour and 30 days");
        }
        
        uint256 oldDuration = votingDuration;
        votingDuration = _newDuration;
        
        configHistory.push(ConfigChange({
            parameterName: "votingDuration",
            oldValue: oldDuration,
            newValue: _newDuration,
            blockNumber: block.number,
            timestamp: block.timestamp,
            proposalId: _proposalId
        }));
        
        emit ConfigUpdated("votingDuration", oldDuration, _newDuration, _proposalId, block.number);
    }
    
    /**
     * @notice Update approval threshold
     * @param _newThreshold New approval threshold percentage (0-10000)
     * @param _proposalId Proposal that authorized this change
     */
    function updateApprovalThreshold(uint256 _newThreshold, uint256 _proposalId) external {
        if (msg.sender != executionEngineAddress) {
            revert OnlyExecutionEngine(msg.sender);
        }
        if (_newThreshold > 10000) {
            revert InvalidParameterValue("approvalThreshold must be <= 10000");
        }
        
        uint256 oldThreshold = approvalThreshold;
        approvalThreshold = _newThreshold;
        
        configHistory.push(ConfigChange({
            parameterName: "approvalThreshold",
            oldValue: oldThreshold,
            newValue: _newThreshold,
            blockNumber: block.number,
            timestamp: block.timestamp,
            proposalId: _proposalId
        }));
        
        emit ConfigUpdated("approvalThreshold", oldThreshold, _newThreshold, _proposalId, block.number);
    }
    
    /**
     * @notice Update minimum proposal delay
     * @param _newDelay New minimum delay in seconds
     * @param _proposalId Proposal that authorized this change
     */
    function updateMinProposalDelay(uint256 _newDelay, uint256 _proposalId) external {
        if (msg.sender != executionEngineAddress) {
            revert OnlyExecutionEngine(msg.sender);
        }
        if (_newDelay < 0 || _newDelay > 30 days) {
            revert InvalidParameterValue("minProposalDelay must be between 0 and 30 days");
        }
        
        uint256 oldDelay = minProposalDelay;
        minProposalDelay = _newDelay;
        
        configHistory.push(ConfigChange({
            parameterName: "minProposalDelay",
            oldValue: oldDelay,
            newValue: _newDelay,
            blockNumber: block.number,
            timestamp: block.timestamp,
            proposalId: _proposalId
        }));
        
        emit ConfigUpdated("minProposalDelay", oldDelay, _newDelay, _proposalId, block.number);
    }
    
    /**
     * @notice Set emergency pause status
     * @param _paused True to pause, false to unpause
     * @param _proposalId Proposal that authorized this change
     */
    function setEmergencyPause(bool _paused, uint256 _proposalId) external {
        if (msg.sender != executionEngineAddress) {
            revert OnlyExecutionEngine(msg.sender);
        }
        
        bool oldPause = emergencyPause;
        emergencyPause = _paused;
        
        configHistory.push(ConfigChange({
            parameterName: _paused ? "emergencyPause_ON" : "emergencyPause_OFF",
            oldValue: oldPause ? 1 : 0,
            newValue: _paused ? 1 : 0,
            blockNumber: block.number,
            timestamp: block.timestamp,
            proposalId: _proposalId
        }));
        
        string memory pauseEvent = _paused ? "emergencyPause_ON" : "emergencyPause_OFF";
        emit ConfigUpdated(
            pauseEvent,
            oldPause ? 1 : 0,
            _paused ? 1 : 0,
            _proposalId,
            block.number
        );
    }
    
    /**
     * @notice Set the ExecutionEngine address (called during deployment)
     * @param _executionEngine ExecutionEngine contract address
     * @dev Can only be called once (executionEngineAddress must be zero)
     */
    function setExecutionEngine(address _executionEngine) external {
        require(_executionEngine != address(0), "Invalid ExecutionEngine address");
        require(executionEngineAddress == address(0), "ExecutionEngine already set");
        executionEngineAddress = _executionEngine;
    }
    
    /**
     * @notice Update election authority
     * @param _newAuthority New election authority address
     * @param _proposalId Proposal that authorized this change
     */
    function updateElectionAuthority(address _newAuthority, uint256 _proposalId) external {
        if (msg.sender != executionEngineAddress) {
            revert OnlyExecutionEngine(msg.sender);
        }
        if (_newAuthority == address(0)) {
            revert InvalidAuthority("New election authority cannot be zero address");
        }
        
        address oldAuthority = electionAuthority;
        electionAuthority = _newAuthority;
        
        authorityHistory.push(AuthorityChange({
            authorityType: "election",
            oldAddress: oldAuthority,
            newAddress: _newAuthority,
            blockNumber: block.number,
            timestamp: block.timestamp,
            proposalId: _proposalId
        }));
        
        emit AuthorityUpdated("election", oldAuthority, _newAuthority, _proposalId, block.number);
    }
    
    /**
     * @notice Update recall authority
     * @param _newAuthority New recall authority address
     * @param _proposalId Proposal that authorized this change
     */
    function updateRecallAuthority(address _newAuthority, uint256 _proposalId) external {
        if (msg.sender != executionEngineAddress) {
            revert OnlyExecutionEngine(msg.sender);
        }
        if (_newAuthority == address(0)) {
            revert InvalidAuthority("New recall authority cannot be zero address");
        }
        
        address oldAuthority = recallAuthority;
        recallAuthority = _newAuthority;
        
        authorityHistory.push(AuthorityChange({
            authorityType: "recall",
            oldAddress: oldAuthority,
            newAddress: _newAuthority,
            blockNumber: block.number,
            timestamp: block.timestamp,
            proposalId: _proposalId
        }));
        
        emit AuthorityUpdated("recall", oldAuthority, _newAuthority, _proposalId, block.number);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // HISTORY VIEWS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get all configuration changes
     */
    function getConfigHistory() external view returns (ConfigChange[] memory) {
        return configHistory;
    }
    
    /**
     * @notice Get all authority changes
     */
    function getAuthorityHistory() external view returns (AuthorityChange[] memory) {
        return authorityHistory;
    }
    
    /**
     * @notice Get configuration history length
     */
    function getConfigHistoryLength() external view returns (uint256) {
        return configHistory.length;
    }
    
    /**
     * @notice Get authority history length
     */
    function getAuthorityHistoryLength() external view returns (uint256) {
        return authorityHistory.length;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // PARAMETER GETTERS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get current quorum percentage
     */
    function getQuorum() external view returns (uint256) {
        return quorum;
    }
    
    /**
     * @notice Get current voting duration
     */
    function getVotingDuration() external view returns (uint256) {
        return votingDuration;
    }
    
    /**
     * @notice Get current approval threshold
     */
    function getApprovalThreshold() external view returns (uint256) {
        return approvalThreshold;
    }
    
    /**
     * @notice Get minimum proposal delay
     */
    function getMinProposalDelay() external view returns (uint256) {
        return minProposalDelay;
    }
    
    /**
     * @notice Check if execution is paused
     */
    function isExecutionPaused() external view returns (bool) {
        return emergencyPause;
    }
}
