┌──────────────────────────────┐
│       CONSTITUTION LAYER     │
│ (Defines Authority & Rights) │
└──────────────────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ SeatNFT (Soulbound ERC721)   │
│ - Fixed max supply           │
│ - One NFT = one seat         │
│ - One seat = one vote        │
│ - Non-transferable           │
│ - Mint/Burn by election auth │
└──────────────────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ Election / Recall Authority  │
│ (External legitimacy bridge) │
│ - Mints seats to winners     │
│ - Burns seats on recall      │
│ - Authority updatable by gov │
└──────────────────────────────┘

================================================

┌──────────────────────────────┐
│       GOVERNANCE LAYER       │
│   (Exercises Authority)      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ GovernanceConfig             │
│ - quorum                     │
│ - votingDuration             │
│ - approvalThreshold          │
│ - emergencyPause             │
│ - electionAuthority          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ProposalDraftManager         │
│ - createDraftProposal        │
│ - supportProposal            │
│ - requires 3 cross-party     │
│   seat supports              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ VotingEngine                 │
│ - seat-based voting          │
│ - one vote per seat          │
│ - transparent vote mapping   │
│ - time-bound lifecycle       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ExecutionEngine              │
│ - validates results          │
│ - executes RuleChange        │
│ - executes Action proposals  │
│ - enforces emergency pause   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PartyRegistry (Optional)     │
│ - Metadata only              │
│ - No authority               │
└──────────────────────────────┘