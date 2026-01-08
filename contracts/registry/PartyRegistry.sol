// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../models/PartyModel.sol";
import "../core/Admin.sol";

contract PartyRegistry is Admin {
    mapping(uint256 => Party) public parties;
    uint256 public partyCount;

    event PartyAdded(uint256 indexed partyId, string name);
    event PartyDeactivated(uint256 indexed partyId);

    constructor() {
        _setAdmin(msg.sender);
    }

    function addParty(string calldata name) external onlyAdmin {
        partyCount++;

        parties[partyCount] = Party({id: partyCount, name: name, active: true});

        emit PartyAdded(partyCount, name);
    }

    function deactivateParty(uint256 partyId) external onlyAdmin {
        require(parties[partyId].active, "Party not active");

        parties[partyId].active = false;

        emit PartyDeactivated(partyId);
    }

    function isActiveParty(uint256 partyId) public view returns (bool) {
        return parties[partyId].active;
    }
}
