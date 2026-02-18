// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ActionExecutor
 * @notice Executes whitelisted system actions from governance proposals
 * 
 * Governance layer: Whitelisted action execution
 * 
 * Key features:
 * - Maintains whitelist of (targetContract, functionSelector) pairs
 * - Only ExecutionEngine can call execute()
 * - Prevents execution of non-whitelisted functions
 * - Logs all whitelisting changes immutably
 * - Whitelist can be extended via governance proposals
 */
contract ActionExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════
    // DEPENDENCIES
    // ═══════════════════════════════════════════════════════════════════════
    
    address public executionEngine;
    
    // ═══════════════════════════════════════════════════════════════════════
    // STATE: WHITELIST
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Whitelist of allowed target contracts and functions
    /// whitelist[targetContract][functionSelector] = true if allowed
    mapping(address => mapping(bytes4 => bool)) public whitelist;
    
    /// @notice Track all whitelisted targets
    address[] public whitelistedTargets;
    
    /// @notice Track all whitelisted selectors for a target
    mapping(address => bytes4[]) public whitelistedSelectors;
    
    // ═══════════════════════════════════════════════════════════════════════
    // STATE: IMMUTABLE HISTORY
    // ═══════════════════════════════════════════════════════════════════════
    
    struct WhitelistChange {
        address targetContract;
        bytes4 functionSelector;
        bool allowed;
        uint256 blockNumber;
        uint256 timestamp;
        uint256 proposalId;
    }
    
    WhitelistChange[] public whitelistHistory;
    
    struct ActionExecution {
        uint256 proposalId;
        address targetContract;
        bytes4 functionSelector;
        bool success;
        string errorReason;
        uint256 blockNumber;
        uint256 timestamp;
    }
    
    ActionExecution[] public executionHistory;
    
    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Emitted when a function is whitelisted
    event FunctionWhitelisted(
        address indexed targetContract,
        bytes4 indexed functionSelector,
        uint256 proposalId,
        uint256 blockNumber
    );
    
    /// @notice Emitted when a function is removed from whitelist
    event FunctionRemoved(
        address indexed targetContract,
        bytes4 indexed functionSelector,
        uint256 proposalId,
        uint256 blockNumber
    );
    
    /// @notice Emitted when an action is executed
    event ActionExecutionAttempted(
        uint256 indexed proposalId,
        address indexed targetContract,
        bytes4 indexed functionSelector,
        bool success,
        string errorReason,
        uint256 blockNumber
    );
    
    /// @notice Emitted when execution engine address is set
    event ExecutionEngineSet(address indexed executionEngine, uint256 blockNumber);
    
    // ═══════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Require caller to be the execution engine
    modifier onlyExecutionEngine() {
        require(msg.sender == executionEngine, "Only ExecutionEngine can call this");
        _;
    }
    
    /// @notice Require caller to be the execution engine or owner (for initialization)
    modifier onlyExecutionEngineOrOwner(address owner) {
        require(
            msg.sender == executionEngine || msg.sender == owner,
            "Only ExecutionEngine or owner can call this"
        );
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    constructor(address _executionEngine) {
        // Can be zero address initially (will be set via setExecutionEngine)
        executionEngine = _executionEngine;
        if (_executionEngine != address(0)) {
            emit ExecutionEngineSet(_executionEngine, block.number);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Set the ExecutionEngine address (called during deployment)
     * @param _executionEngine ExecutionEngine contract address
     * @dev Can only be called once (executionEngine must be zero)
     */
    function setExecutionEngine(address _executionEngine) external {
        require(_executionEngine != address(0), "Invalid ExecutionEngine address");
        require(executionEngine == address(0), "ExecutionEngine already set");
        executionEngine = _executionEngine;
        emit ExecutionEngineSet(_executionEngine, block.number);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // CORE: ACTION EXECUTION
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a whitelisted action (called only by ExecutionEngine)
     * @param proposalId ID of the proposal triggering this action
     * @param targetContract Target contract to call
     * @param functionSelector Function selector to call
     * @param encodedParams Encoded parameters for the function
     * @return success True if execution was successful
     */
    function execute(
        uint256 proposalId,
        address targetContract,
        bytes4 functionSelector,
        bytes calldata encodedParams
    ) 
        external 
        onlyExecutionEngine
        returns (bool success) 
    {
        require(targetContract != address(0), "Invalid target contract");
        require(isWhitelisted(targetContract, functionSelector), "Function not whitelisted");
        
        // Attempt to execute action
        (success, ) = targetContract.call(abi.encodePacked(functionSelector, encodedParams));
        
        string memory errorReason = success ? "" : "Execution failed";
        
        // Log execution
        executionHistory.push(ActionExecution({
            proposalId: proposalId,
            targetContract: targetContract,
            functionSelector: functionSelector,
            success: success,
            errorReason: errorReason,
            blockNumber: block.number,
            timestamp: block.timestamp
        }));
        
        emit ActionExecutionAttempted(
            proposalId,
            targetContract,
            functionSelector,
            success,
            errorReason,
            block.number
        );
        
        return success;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // CORE: WHITELIST MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Whitelist a function for execution
     * @param proposalId ID of the proposal authorizing this change (for history)
     * @param targetContract Target contract address
     * @param functionSelector Function selector (4-byte signature)
     */
    function whitelistFunction(
        uint256 proposalId,
        address targetContract,
        bytes4 functionSelector
    ) 
        external 
        onlyExecutionEngine
    {
        require(targetContract != address(0), "Invalid target contract");
        require(functionSelector != bytes4(0), "Invalid function selector");
        
        if (!whitelist[targetContract][functionSelector]) {
            whitelist[targetContract][functionSelector] = true;
            
            // Track targets
            if (whitelistedSelectors[targetContract].length == 0) {
                whitelistedTargets.push(targetContract);
            }
            
            // Track selectors
            whitelistedSelectors[targetContract].push(functionSelector);
            
            // Log in history
            whitelistHistory.push(WhitelistChange({
                targetContract: targetContract,
                functionSelector: functionSelector,
                allowed: true,
                blockNumber: block.number,
                timestamp: block.timestamp,
                proposalId: proposalId
            }));
            
            emit FunctionWhitelisted(targetContract, functionSelector, proposalId, block.number);
        }
    }
    
    /**
     * @notice Remove a function from the whitelist
     * @param proposalId ID of the proposal authorizing this change (for history)
     * @param targetContract Target contract address
     * @param functionSelector Function selector (4-byte signature)
     */
    function removeFromWhitelist(
        uint256 proposalId,
        address targetContract,
        bytes4 functionSelector
    ) 
        external 
        onlyExecutionEngine
    {
        require(targetContract != address(0), "Invalid target contract");
        require(functionSelector != bytes4(0), "Invalid function selector");
        
        if (whitelist[targetContract][functionSelector]) {
            whitelist[targetContract][functionSelector] = false;
            
            // Remove from selector list
            bytes4[] storage selectors = whitelistedSelectors[targetContract];
            for (uint256 i = 0; i < selectors.length; i++) {
                if (selectors[i] == functionSelector) {
                    selectors[i] = selectors[selectors.length - 1];
                    selectors.pop();
                    break;
                }
            }
            
            // Log in history
            whitelistHistory.push(WhitelistChange({
                targetContract: targetContract,
                functionSelector: functionSelector,
                allowed: false,
                blockNumber: block.number,
                timestamp: block.timestamp,
                proposalId: proposalId
            }));
            
            emit FunctionRemoved(targetContract, functionSelector, proposalId, block.number);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // GETTERS: WHITELIST CHECKS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if a function is whitelisted
     * @param targetContract Target contract address
     * @param functionSelector Function selector
     * @return True if whitelisted
     */
    function isWhitelisted(address targetContract, bytes4 functionSelector) 
        public 
        view 
        returns (bool) 
    {
        return whitelist[targetContract][functionSelector];
    }
    
    /**
     * @notice Get all whitelisted targets
     * @return Array of whitelisted contract addresses
     */
    function getWhitelistedTargets() external view returns (address[] memory) {
        return whitelistedTargets;
    }
    
    /**
     * @notice Get all whitelisted selectors for a target
     * @param targetContract Target contract address
     * @return Array of whitelisted function selectors
     */
    function getWhitelistedSelectors(address targetContract) 
        external 
        view 
        returns (bytes4[] memory) 
    {
        return whitelistedSelectors[targetContract];
    }
    
    /**
     * @notice Get the whitelist history
     * @return Array of all whitelist changes
     */
    function getWhitelistHistory() external view returns (WhitelistChange[] memory) {
        return whitelistHistory;
    }
    
    /**
     * @notice Get the execution history
     * @return Array of all action executions
     */
    function getExecutionHistory() external view returns (ActionExecution[] memory) {
        return executionHistory;
    }
    
    /**
     * @notice Get a specific execution result
     * @param index Index in execution history
     * @return ActionExecution struct
     */
    function getExecution(uint256 index) 
        external 
        view 
        returns (ActionExecution memory) 
    {
        require(index < executionHistory.length, "Invalid execution index");
        return executionHistory[index];
    }
    
    /**
     * @notice Get total number of executions
     * @return Count of executed actions
     */
    function getTotalExecutions() external view returns (uint256) {
        return executionHistory.length;
    }
    
    /**
     * @notice Get total number of whitelist changes
     * @return Count of whitelist operations
     */
    function getTotalWhitelistChanges() external view returns (uint256) {
        return whitelistHistory.length;
    }
}
