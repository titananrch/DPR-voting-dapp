// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VotingTopicManager.sol";
import "./PartyAggregatedVoting.sol";
import "../core/Admin.sol";

contract DPRVoting is Admin {
    VotingTopicManager public topicManager;
    PartyAggregatedVoting public partyVoting;

    constructor(address _topicManager, address _partyVoting) {
        topicManager = VotingTopicManager(_topicManager);
        partyVoting = PartyAggregatedVoting(_partyVoting);
        _setAdmin(msg.sender);
    }

    event MemberAdded(address indexed member, uint256 indexed partyId);
    event MemberUpdated(address indexed member, uint256 indexed newPartyId);
    event MemberRemoved(address indexed member);
    event MemberVoted(
        address indexed member,
        uint256 indexed topicId,
        uint256 indexed optionId
    );

    // MODELS

    struct Member {
        bool exists;
        uint256 partyId;
    }

    // STORAGE

    mapping(address => Member) public members;

    // topicId => voter => voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // MEMBER MODIFIERS
    modifier onlyMember() {
        require(members[msg.sender].exists, "Not a DPR member");
        _;
    }

    // MEMBER MANAGEMENT

    function registerMember(
        address member,
        uint256 partyId
    ) external onlyAdmin {
        members[member] = Member({exists: true, partyId: partyId});
        emit MemberAdded(member, partyId);
    }

    function updateMemberParty(
        address member,
        uint256 newPartyId
    ) external onlyAdmin {
        require(members[member].exists, "Member not found");
        members[member].partyId = newPartyId;
        emit MemberUpdated(member, newPartyId);
    }

    function removeMember(address member) external onlyAdmin {
        delete members[member];
        emit MemberRemoved(member);
    }

    // VOTING

    // expose topic creation so DPRVoting (contract) can create topics on the manager
    function createTopic(string calldata title) external {
        topicManager.createTopic(title);
    }

    function vote(uint256 topicId, uint256 optionId) external onlyMember {
        require(!hasVoted[topicId][msg.sender], "Already voted");

        VotingTopic memory topic = topicManager.getTopic(topicId);

        require(topic.status == TopicStatus.Open, "Topic not active");
        hasVoted[topicId][msg.sender] = true;
        partyVoting.vote(topicId, optionId);
        emit MemberVoted(msg.sender, topicId, optionId);
    }
}
