// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../registry/MemberRegistry.sol";
import "../registry/PartyRegistry.sol";
import "./VotingTopicManager.sol";

contract PartyAggregatedVoting {
    MemberRegistry public memberRegistry;
    PartyRegistry public partyRegistry;
    VotingTopicManager public topicManager;

    // topicId => voter => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // topicId => partyId => optionId => voteCount
    mapping(uint256 => mapping(uint256 => mapping(uint256 => uint256)))
        public voteCounts;

    event VoteCast(
        uint256 indexed topicId,
        uint256 indexed partyId,
        uint256 indexed optionId
    );

    constructor(
        address _memberRegistry,
        address _partyRegistry,
        address _topicManager
    ) {
        memberRegistry = MemberRegistry(_memberRegistry);
        partyRegistry = PartyRegistry(_partyRegistry);
        topicManager = VotingTopicManager(_topicManager);
    }

    function vote(uint256 topicId, uint256 optionId) external {
        require(
            !hasVoted[topicId][msg.sender],
            "Already voted"
        );
        require(
            memberRegistry.isMember(msg.sender),
            "Not a registered member"
        );

        VotingTopic memory topic = topicManager.getTopic(topicId);
        require(
            topic.status == TopicStatus.Open,
            "Voting is closed"
        );

        VoteOption[] memory options =
            topicManager.getVoteOptions(topicId);
        require(
            optionId < options.length,
            "Invalid vote option"
        );

        uint256 partyId =
            memberRegistry.memberPartyId(msg.sender);
        require(
            partyRegistry.isActiveParty(partyId),
            "Inactive party"
        );

        hasVoted[topicId][msg.sender] = true;
        voteCounts[topicId][partyId][optionId]++;

        emit VoteCast(topicId, partyId, optionId);
    }
}