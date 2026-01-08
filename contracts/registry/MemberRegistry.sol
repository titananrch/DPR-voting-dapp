// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/Admin.sol";
import "./PartyRegistry.sol";

contract MemberRegistry is Admin {
    mapping(address => bool) public isMember;
    mapping(address => uint256) public memberPartyId;
    mapping(uint256 => address[]) private partyMembers;

    PartyRegistry public partyRegistry;

    event MemberRegistered(address indexed member, uint256 indexed partyId);

    constructor(address _partyRegistry) {
        partyRegistry = PartyRegistry(_partyRegistry);
        _setAdmin(msg.sender);
    }

    function registerMember(
        address member,
        uint256 partyId
    ) external onlyAdmin {
        require(!isMember[member], "Already registered");
        require(
            partyRegistry.isActiveParty(partyId),
            "Invalid or inactive party"
        );

        isMember[member] = true;
        memberPartyId[member] = partyId;
        partyMembers[partyId].push(member);

        emit MemberRegistered(member, partyId);
    }

    function getMembersByParty(
        uint256 partyId
    ) external view returns (address[] memory) {
        return partyMembers[partyId];
    }

    function getMemberParty(address member) external view returns (uint256) {
        require(isMember[member], "Not a member");
        return memberPartyId[member];
    }
}
