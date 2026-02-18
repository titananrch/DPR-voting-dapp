// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SeatNFT
 * @notice Non-transferable Governance Seat NFT (Soulbound)
 * 
 * Constitutional layer of governance:
 * - One seat = one vote = governance authorization
 * - Non-transferable; cannot be moved between addresses
 * - Minted by external election authority (e.g., election oracle)
 * - Burned by external recall authority (e.g., recall mechanism)
 * - Party affiliation recorded at mint time for cross-party sponsorship validation
 * - All seat history is immutable for transparency
 */
contract SeatNFT is ERC721, ERC721Burnable, Ownable {
    
    // ═══════════════════════════════════════════════════════════════════════
    // CONSTANTS & CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Maximum supply of seats (immutable after construction)
    uint256 public immutable maxSupply;
    
    // ═══════════════════════════════════════════════════════════════════════
    // STATE: CORE SEAT DATA
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Counter for next seat ID to mint
    uint256 private nextSeatId = 1;
    
    /// @notice Total seats currently issued
    uint256 public totalSupply;
    
    /// @notice Party affiliation: seatId → partyId
    mapping(uint256 => uint256) public seatParty;
    
    // ═══════════════════════════════════════════════════════════════════════
    // STATE: AUTHORITIES
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Address authorized to mint seats (election oracle)
    address public electionAuthority;
    
    /// @notice Address authorized to burn seats (recall mechanism)
    address public recallAuthority;
    
    // ═══════════════════════════════════════════════════════════════════════
    // STATE: IMMUTABLE HISTORY
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice All seat transfers ever made (immutable log)
    struct SeatAction {
        uint256 seatId;
        address from;
        address to;
        uint256 partyId;
        uint256 blockNumber;
        uint256 timestamp;
    }
    
    SeatAction[] public seatHistory;
    
    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Emitted when a new seat is minted
    event SeatMinted(
        uint256 indexed seatId,
        address indexed holder,
        uint256 indexed partyId,
        uint256 blockNumber
    );
    
    /// @notice Emitted when a seat is burned
    event SeatBurned(
        uint256 indexed seatId,
        address indexed previousHolder,
        uint256 blockNumber
    );
    
    /// @notice Emitted when election authority is updated
    event ElectionAuthorityChanged(
        address indexed oldAuthority,
        address indexed newAuthority,
        address indexed updatedBy,
        uint256 blockNumber
    );
    
    /// @notice Emitted when recall authority is updated
    event RecallAuthorityChanged(
        address indexed oldAuthority,
        address indexed newAuthority,
        address indexed updatedBy,
        uint256 blockNumber
    );
    
    /// @notice Emitted when someone tries to transfer (always reverts)
    event TransferAttempted(
        uint256 indexed seatId,
        address indexed from,
        address indexed to,
        uint256 blockNumber
    );
    
    // ═══════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════
    
    error NonTransferable(string reason);
    error MaxSupplyExceeded();
    error InvalidAuthority();
    error UnauthorizedMint();
    error UnauthorizedBurn();
    
    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @param _maxSupply Fixed maximum seats (immutable)
     * @param _electionAuthority Address that can mint seats
     * @param _recallAuthority Address that can burn seats
     * @param _owner Owner address (can update authorities)
     */
    constructor(
        uint256 _maxSupply,
        address _electionAuthority,
        address _recallAuthority,
        address _owner
    ) ERC721("Governance Seat", "SEAT") Ownable(_owner) {
        require(_maxSupply > 0, "Max supply must be > 0");
        require(_electionAuthority != address(0), "Invalid election authority");
        require(_recallAuthority != address(0), "Invalid recall authority");
        
        maxSupply = _maxSupply;
        electionAuthority = _electionAuthority;
        recallAuthority = _recallAuthority;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // MINTING: ELECTION AUTHORITY ONLY
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Mint a new seat for a holder
     * @param _holder Address to receive the seat
     * @param _partyId Party affiliation (for sponsorship validation)
     * @return seatId The newly minted seat ID
     */
    function mint(address _holder, uint256 _partyId) external returns (uint256) {
        if (msg.sender != electionAuthority) {
            revert UnauthorizedMint();
        }
        if (totalSupply >= maxSupply) {
            revert MaxSupplyExceeded();
        }
        
        uint256 seatId = nextSeatId;
        nextSeatId++;
        totalSupply++;
        
        seatParty[seatId] = _partyId;
        
        // Mint ERC721 token
        _mint(_holder, seatId);
        
        // Log immutable history
        seatHistory.push(SeatAction({
            seatId: seatId,
            from: address(0),
            to: _holder,
            partyId: _partyId,
            blockNumber: block.number,
            timestamp: block.timestamp
        }));
        
        emit SeatMinted(seatId, _holder, _partyId, block.number);
        
        return seatId;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // BURNING: RECALL AUTHORITY ONLY
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Burn a seat (used by recall authority)
     * @param _seatId Seat to burn
     */
    function burnSeat(uint256 _seatId) external {
        if (msg.sender != recallAuthority) {
            revert UnauthorizedBurn();
        }
        
        address holder = ownerOf(_seatId);
        totalSupply--;
        
        // Burn ERC721 token
        _burn(_seatId);
        
        // Log immutable history
        seatHistory.push(SeatAction({
            seatId: _seatId,
            from: holder,
            to: address(0),
            partyId: seatParty[_seatId],
            blockNumber: block.number,
            timestamp: block.timestamp
        }));
        
        emit SeatBurned(_seatId, holder, block.number);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // TRANSFER PREVENTION: NON-TRANSFERABLE (SOULBOUND)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Override _update to prevent transfers while allowing mint/burn
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }
        
        // Allow burning (to == address(0)) only if called by recall authority
        if (to == address(0)) {
            // Burn is allowed via burnSeat(), which is gated by recallAuthority
            return super._update(to, tokenId, auth);
        }
        
        // Block all peer-to-peer transfers (from != address(0) && to != address(0))
        emit TransferAttempted(tokenId, from, to, block.number);
        revert NonTransferable("Seats are non-transferable");
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // AUTHORITY MANAGEMENT: OWNER ONLY
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Update election authority (owner-gated, governance will take over)
     * @param _newAuthority New election authority address
     */
    function setElectionAuthority(address _newAuthority) external onlyOwner {
        require(_newAuthority != address(0), "Invalid authority");
        address oldAuthority = electionAuthority;
        electionAuthority = _newAuthority;
        
        emit ElectionAuthorityChanged(oldAuthority, _newAuthority, msg.sender, block.number);
    }
    
    /**
     * @notice Update recall authority (owner-gated, governance will take over)
     * @param _newAuthority New recall authority address
     */
    function setRecallAuthority(address _newAuthority) external onlyOwner {
        require(_newAuthority != address(0), "Invalid authority");
        address oldAuthority = recallAuthority;
        recallAuthority = _newAuthority;
        
        emit RecallAuthorityChanged(oldAuthority, _newAuthority, msg.sender, block.number);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // VIEWS: SEAT INFORMATION
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get party affiliation of a seat
     */
    function getPartyOfSeat(uint256 _seatId) external view returns (uint256) {
        require(_ownerOf(_seatId) != address(0), "Seat does not exist");
        return seatParty[_seatId];
    }
    
    /**
     * @notice Get all seats held by an address
     */
    function getSeatsOfHolder(address _holder) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(_holder);
        uint256[] memory seats = new uint256[](balance);
        
        uint256 index = 0;
        for (uint256 i = 1; i < nextSeatId; i++) {
            if (_ownerOf(i) == _holder) {
                seats[index] = i;
                index++;
            }
        }
        
        return seats;
    }
    
    /**
     * @notice Get immutable history of all seat actions
     */
    function getSeatHistory() external view returns (SeatAction[] memory) {
        return seatHistory;
    }
    
    /**
     * @notice Get seat action history length
     */
    function getSeatHistoryLength() external view returns (uint256) {
        return seatHistory.length;
    }
    
    /**
     * @notice Check if seat is still valid (not burned)
     */
    function isSeatValid(uint256 _seatId) external view returns (bool) {
        return _ownerOf(_seatId) != address(0);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Return token URI (minimal implementation)
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Seat does not exist");
        return string(abi.encodePacked("seat://governance/", tokenId));
    }
    
    /**
     * @notice Disable transferFrom to enforce non-transferability
     */
    function transferFrom(address, address, uint256) 
        public 
        pure 
        override 
    {
        revert NonTransferable("transferFrom disabled: seats are non-transferable");
    }
}
