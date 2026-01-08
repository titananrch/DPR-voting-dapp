// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

enum TopicStatus {
    Open,
    Closed
}

struct VotingTopic {
    uint256 id;
    string title;
    TopicStatus status;
}