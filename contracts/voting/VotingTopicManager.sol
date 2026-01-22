// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "../core/Admin.sol";
import "../models/VotingTopic.sol";
import "../models/VoteOptionModel.sol";

contract VotingTopicManager is Admin {
    uint256 public topicCount;

    // topicId => topic
    mapping(uint256 => VotingTopic) public topics;

    // topicId => options
    mapping(uint256 => VoteOption[]) public topicOptions;

    event TopicCreated(uint256 indexed topicId, string title);
    event VoteOptionAdded(
        uint256 indexed topicId,
        uint256 indexed optionId,
        string label
    );
    event TopicOpened(uint256 indexed topicId, string title);
    event TopicClosed(uint256 indexed topicId, string title);
    event Voted(
        uint256 indexed topicId,
        uint256 indexed optionId,
        address indexed voter
    );

    constructor() {
        _setAdmin(msg.sender);
    }

    function createTopic(string calldata title) external onlyAdmin {
        topicCount++;

        topics[topicCount] = VotingTopic({
            id: topicCount,
            title: title,
            status: TopicStatus.Early
        });

        emit TopicCreated(topicCount, title);
    }

    function addVoteOption(
        uint256 topicId,
        string calldata label
    ) external onlyAdmin {
        require(
            topics[topicId].status == TopicStatus.Early,
            "Topic not in Early stage"
        );
        uint256 optionId = topicOptions[topicId].length;
        topicOptions[topicId].push(VoteOption({id: optionId, label: label}));
        emit VoteOptionAdded(topicId, optionId, label);
    }

    function openTopic(uint256 topicId) external onlyAdmin {
        require(
            topics[topicId].status == TopicStatus.Early,
            "Topic not in Early stage"
        );
        topics[topicId].status = TopicStatus.Open;
        emit TopicOpened(topicId, topics[topicId].title);
    }

    function closeTopic(uint256 topicId) external onlyAdmin {
        require(topics[topicId].status == TopicStatus.Open, "Topic not open");
        topics[topicId].status = TopicStatus.Closed;
        emit TopicClosed(topicId, topics[topicId].title);
    }

    function getVoteOptions(
        uint256 topicId
    ) external view returns (VoteOption[] memory) {
        return topicOptions[topicId];
    }

    function getTopic(
        uint256 topicId
    ) external view returns (VotingTopic memory) {
        return topics[topicId];
    }
}
