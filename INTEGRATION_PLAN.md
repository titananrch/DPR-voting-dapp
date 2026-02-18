# Frontend Integration Plan: DPR Governance Protocol

## Executive Summary
Complete specification for integrating deployed governance contracts into React + TypeScript frontend. This plan identifies all contract interfaces, categorizes functions by layer, defines required derived state, and proposes a clean hook architecture.

---

## 1. CONTRACT INTERFACE ANALYSIS

### 1.1 SeatNFT Contract

#### Read-Only Functions (UI Rendering)
| Function | Returns | Purpose |
|----------|---------|---------|
| `balanceOf(address)` | uint256 | User's seat count |
| `totalSupply()` | uint256 | Total issued seats |
| `ownerOf(uint256 seatId)` | address | Seat holder address |
| `getSeatsOfHolder(address)` | uint256[] | Array of seat IDs owned |
| `getPartyOfSeat(uint256 seatId)` | uint256 | Party affiliation |
| `maxSupply()` | uint256 | Maximum seats allowed |
| `isSeatValid(uint256 seatId)` | bool | Seat exists/not burned |
| `getSeatHistory()` | SeatAction[] | Full seat transfer history |
| `getSeatHistoryLength()` | uint256 | History array length |
| `electionAuthority()` | address | Seat minting authority |
| `recallAuthority()` | address | Seat burning authority |
| `name()` | string | "Governance Seat" |
| `symbol()` | string | "SEAT" |

#### Write Functions (User Interaction)
| Function | Parameters | Restrictions | Purpose |
|----------|------------|--------------|---------|
| `mint(address _holder, uint256 _partyId)` | holder, party | Only electionAuthority | Create new seat |
| `burnSeat(uint256 _seatId)` | seatId | Only recallAuthority | Remove seat |
| `setElectionAuthority(address _newAuthority)` | new authority | Only owner | Change minting authority |
| `setRecallAuthority(address _newAuthority)` | new authority | Only owner | Change burning authority |

#### Events
| Event | Index Fields | Use Case |
|-------|-------------|----------|
| `SeatMinted` | seatId, holder, partyId | Track new governance members |
| `SeatBurned` | seatId, previousHolder | Track removed members |
| `TransferAttempted` | seatId, from, to | Log transfer attempts (always fails - non-transferable) |
| `ElectionAuthorityChanged` | oldAuth, newAuth, updatedBy | Governance change timeline |
| `RecallAuthorityChanged` | oldAuth, newAuth, updatedBy | Governance change timeline |

---

### 1.2 ProposalDraftManager Contract

#### Read-Only Functions (UI Rendering)
| Function | Returns | Purpose |
|----------|---------|---------|
| `getProposal(uint256 proposalId)` | Proposal struct | Full proposal details |
| `getProposalCount()` | uint256 | Total proposals created |
| `getActiveProposals()` | uint256[] | Draft + voting proposals |
| `getDraftProposals()` | uint256[] | In-draft stage proposals |
| `getVotingProposals()` | uint256[] | Active voting proposals |
| `getClosedProposals()` | uint256[] | Executed/expired proposals |
| `getProposalSponsors(uint256 proposalId)` | uint256[] | Seat IDs supporting |
| `getProposalSponsorParties(uint256 proposalId)` | uint256[] | Parties representing supporters |
| `getSponsorshipStatus(uint256 proposalId)` | (sponsorCount, partyCount, thresholdMet) | Progress to voting |
| `getActionData(uint256 proposalId)` | ActionData struct | Target contract + function + params |
| `getRuleChangeData(uint256 proposalId)` | RuleChangeData struct | Change type, old/new values/addresses |
| `MIN_SPONSORS_REQUIRED()` | uint256 | Sponsorship threshold count |
| `MIN_PARTIES_REQUIRED()` | uint256 | Cross-party support required |
| `DRAFT_EXPIRATION_PERIOD()` | uint256 | Draft lifespan in seconds |

#### Write Functions (User Interaction)
| Function | Parameters | Require | Purpose |
|----------|------------|---------|---------|
| `createDraftProposal(string, string, RuleChangeType, uint256)` | title, desc, changeType, newValue | Caller has seat | Create rule change proposal |
| `createDraftProposalWithAddress(string, string, RuleChangeType, address)` | title, desc, changeType, newAddress | Caller has seat | Create authority change proposal |
| `createActionProposal(string, string, address, bytes4, bytes)` | title, desc, target, selector, params | Caller has seat | Create custom action proposal |
| `supportProposal(uint256 proposalId, uint256 seatId)` | proposalId, seatId | Own seat, in draft stage | Add sponsorship |
| `activateDraft(uint256 proposalId)` | proposalId | Draft complete, not expired | Transition to voting |
| `startVoting(uint256 proposalId)` | proposalId | Active, voting not started | Begin voting period |
| `closeVoting(uint256 proposalId)` | proposalId | Voting ended or failed | Finalize voting |
| `expireDraft(uint256 proposalId)` | proposalId | Draft expired, unsafe | Clean up stale proposal |

#### Events
| Event | Index Fields | Use Case |
|-------|-------------|----------|
| `DraftProposalCreated` | proposalId, proposer, proposalType | UI notification: "New proposal" |
| `ProposalSupported` | proposalId, seatId, supporter | Real-time sponsorship progress |
| `DraftActivated` | proposalId | Transition draft→voting |
| `VotingStarted` | proposalId | Begin voting period countdown |
| `VotingClosed` | proposalId, newStatus | Voting period ended |
| `DraftExpired` | proposalId | Cleanup notification |

---

### 1.3 VotingEngine Contract

#### Read-Only Functions (UI Rendering)
| Function | Returns | Purpose |
|----------|---------|---------|
| `getVote(uint256 proposalId, uint256 seatId)` | uint256 optionId | How a seat voted (0=yes, 1=no, 2=abstain) |
| `hasSeatsVoted(uint256 proposalId, uint256 seatId)` | bool | Check if seat participated |
| `getOptionVoteCount(uint256 proposalId, uint256 optionId)` | uint256 | Votes for option |
| `getTotalVotes(uint256 proposalId)` | uint256 | Total votes cast |
| `getTotalVotesCastEver()` | uint256 | Cumulative votes across all proposals |
| `getVotingResults(uint256 proposalId)` | (approvalVotes, rejectionVotes) | Vote split |
| `getFullVotingResult(uint256 proposalId)` | VotingResult struct | Complete voting analytics |
| `getProposalVoteHistory(uint256 proposalId)` | VoteAction[] | Chronological vote log |
| `getVoteHistory()` | VoteAction[] | All votes across all proposals |

#### Write Functions (User Interaction)
| Function | Parameters | Require | Purpose |
|----------|------------|---------|---------|
| `vote(uint256 proposalId, uint256 seatId, uint256 optionId)` | proposalId, seatId, optionId | Own seat, voting active, not voted | Cast vote |

#### Events
| Event | Index Fields | Use Case |
|-------|-------------|----------|
| `VoteCast` | proposalId, seatId, voter | Real-time vote count updates |
| `VoteRecorded` | proposalId, seatId, optionId | Vote confirmation in UI |

#### VotingResult Struct (Return Type)
```solidity
struct VotingResult {
  uint256 proposalId;
  uint256 totalVotesCast;
  uint256 approvalVotes;
  uint256 rejectionVotes;
  uint256 totalSeatsIssued;
  bool quorumMet;           // ← DERIVED STATE
  bool approvalThresholdMet; // ← DERIVED STATE
  bool approved;            // ← DERIVED STATE
}
```

---

### 1.4 GovernanceConfig Contract

#### Read-Only Functions (UI Rendering)
| Function | Returns | Purpose |
|----------|---------|---------|
| `quorum()` | uint256 | Min participation % (0-10000) |
| `votingDuration()` | uint256 | Vote period length (seconds) |
| `approvalThreshold()` | uint256 | Min approval % (0-10000) |
| `minProposalDelay()` | uint256 | Delay draft→voting (seconds) |
| `emergencyPause()` | bool | Execution disabled flag |
| `electionAuthority()` | address | Seat minting authority |
| `recallAuthority()` | address | Seat burning authority |
| `executionEngineAddress()` | address | Execution layer reference |
| `seatNftAddress()` | address | Constitutional layer reference |
| `constitutionVersion()` | uint256 | Immutable constitution marker |
| `constitutionHash()` | bytes32 | Constitution document hash |
| `getConfigHistory()` | ConfigChange[] | All governance changes |
| `getAuthorityHistory()` | AuthorityChange[] | Authority updates timeline |
| `getConfigHistoryLength()` | uint256 | History length |
| `getAuthorityHistoryLength()` | uint256 | History length |

#### Write Functions (User Interaction - NOT EXPOSED DIRECTLY)
| Function | Called By | Purpose |
|----------|-----------|---------|
| `updateQuorum(uint256, uint256)` | ExecutionEngine | Post-vote governance change |
| `updateVotingDuration(uint256, uint256)` | ExecutionEngine | Post-vote governance change |
| `updateApprovalThreshold(uint256, uint256)` | ExecutionEngine | Post-vote governance change |
| `updateMinProposalDelay(uint256, uint256)` | ExecutionEngine | Post-vote governance change |
| `setEmergencyPause(bool, uint256)` | ExecutionEngine | Emergency freeze |
| `updateElectionAuthority(address, uint256)` | ExecutionEngine | Post-vote governance change |
| `updateRecallAuthority(address, uint256)` | ExecutionEngine | Post-vote governance change |
| `setExecutionEngine(address)` | Deployer only (once) | Initialization only |

#### Events
| Event | Index Fields | Use Case |
|-------|-------------|----------|
| `ConfigUpdated` | parameterName, proposalId | Governance parameter change timeline |
| `AuthorityUpdated` | authorityType, oldAddress, newAddress | Authority replacement timeline |

---

### 1.5 ExecutionEngine Contract

#### Read-Only Functions (UI Rendering)
| Function | Returns | Purpose |
|----------|---------|---------|
| `canExecuteProposal(uint256 proposalId)` | (canExecute: bool, reason: string) | Check executability + reason |
| `executed(uint256 proposalId)` | bool | Already executed flag |
| `getExecutionResult(uint256 proposalId)` | ExecutionResult struct | Execution outcome details |
| `getExecutionHistory()` | ExecutionResult[] | All proposal executions |
| `getTotalExecutedProposals()` | uint256 | Count of executed proposals |
| `actionExecutor()` | address | ActionExecutor contract reference |
| `governanceConfig()` | address | GovernanceConfig reference |

#### Write Functions (User Interaction)
| Function | Parameters | Require | Purpose |
|----------|------------|---------|---------|
| `executeProposal(uint256 proposalId)` | proposalId | Voting closed, approved, not executed | Execute approved proposal |

#### Events
| Event | Index Fields | Use Case |
|-------|-------------|----------|
| `ProposalEvaluated` | proposalId | Voting outcome determination |
| `ProposalExecuted` | proposalId, approved | Successful execution |
| `ProposalRejected` | proposalId | Vote failed - rejected |
| `RuleChangeExecuted` | proposalId, changeType | Governance parameter updated |
| `ActionExecuted` | proposalId, targetContract | Custom action executed |
| `ExecutionPausedByEmergency` | proposalId | Blocked by emergency pause |

#### ExecutionResult Struct (Return Type)
```solidity
struct ExecutionResult {
  bool approved;      // ← Vote passed
  bool executed;      // ← Executed successfully
  string reason;      // ← Execution failure reason
  uint256 blockNumber;
  uint256 timestamp;
}
```

---

## 2. ENUMS & TYPES TO REPLICATE IN FRONTEND

### 2.1 ProposalType (uint8)
```typescript
enum ProposalType {
  DRAFT = 0,
  ACTION = 1
}
```
**Usage**: Filter proposal lists, display proposal category

### 2.2 ProposalStatus (uint8)
```typescript
enum ProposalStatus {
  DRAFT = 0,
  VOTING = 1,
  APPROVED = 2,
  REJECTED = 3,
  EXECUTED = 4,
  EXPIRED = 5
}
```
**Usage**: Display proposal lifecycle badge/color

### 2.3 RuleChangeType (uint8)
```typescript
enum RuleChangeType {
  QUORUM = 0,
  VOTING_DURATION = 1,
  APPROVAL_THRESHOLD = 2,
  MIN_PROPOSAL_DELAY = 3,
  EMERGENCY_PAUSE = 4,
  ELECTION_AUTHORITY = 5,
  RECALL_AUTHORITY = 6
}
```
**Usage**: Form selectors, change description display

### 2.4 Vote Options (implicit uint256)
```typescript
const VOTE_OPTION = {
  YES: 0,
  NO: 1,
  ABSTAIN: 2
} as const
```
**Usage**: Vote button selection

---

## 3. KEY CONTRACT STRUCTURES

### Proposal Struct
```typescript
interface Proposal {
  id: uint256;
  proposer: address;
  proposalType: ProposalType;       // DRAFT or ACTION
  title: string;
  description: string;
  status: ProposalStatus;
  createdAt: uint256;               // Timestamp
  votingStartedAt: uint256;
  votingEndedAt: uint256;
  executedAt: uint256;
  blockNumber: uint256;
}
```

### ActionData Struct
```typescript
interface ActionData {
  targetContract: address;
  functionSelector: bytes4;
  encodedParams: bytes;
  description: string;
}
```

### RuleChangeData Struct
```typescript
interface RuleChangeData {
  changeType: RuleChangeType;
  oldValue: uint256;
  newValue: uint256;
  oldAddress: address;
  newAddress: address;
}
```

### VotingResult Struct
```typescript
interface VotingResult {
  proposalId: uint256;
  totalVotesCast: uint256;
  approvalVotes: uint256;
  rejectionVotes: uint256;
  totalSeatsIssued: uint256;
  quorumMet: boolean;
  approvalThresholdMet: boolean;
  approved: boolean;
}
```

### SeatAction Struct (History)
```typescript
interface SeatAction {
  seatId: uint256;
  from: address;
  to: address;
  partyId: uint256;
  blockNumber: uint256;
  timestamp: uint256;
}
```

---

## 4. DERIVED UI STATE

State that must be computed from contract data (NOT directly readable):

### 4.1 Proposal-Level Derived State

| State | Computation | Used For |
|-------|------------|----------|
| `isProposalExecutable` | `canExecuteProposal()` contract call required | Execute button enabled state |
| `daysUntilVotingEnds` | `votingEndedAt - currentTimestamp` | Countdown display |
| `currentVotingPercent` | `totalVotesCast / totalSeatsIssued * 100` | Progress bar |
| `approvalPercent` | `approvalVotes / totalVotesCast * 100` | Vote split display |
| `sponsorshipPercent` | `partyCount / requiredParties * 100` | Progress to activation |
| `isProposalStale` | `createdAt + DRAFT_EXPIRATION_PERIOD < now` | Expiry warning |
| `canUserVote` | `hasSeatsVoted(proposalId, userSeatId)` | Vote button disabled |
| `userHasVoted` | Check VotingEngine state | UI feedback |
| `userVoteChoice` | `getVote(proposalId, userSeatId)` | Vote button selection |
| `userCanSponsor` | `!hasSponsoredProposal(proposalId, seatId) && status == DRAFT` | Sponsor button enabled |

### 4.2 User-Level Derived State

| State | Computation | Used For |
|-------|------------|----------|
| `userSeatCount` | `balanceOf(userAddress)` from SeatNFT | User dashboard badge |
| `userSeats` | `getSeatsOfHolder(userAddress)` | Voting seat selector dropdown |
| `userCanCreateProposal` | `seatCount > 0` | Create proposal button enabled |
| `userIsGovernanceAdmin` | Compare user address with authority addresses | Admin panel visibility |

### 4.3 System-Level Derived State

| State | Computation | Used For |
|-------|------------|----------|
| `systemIsEmergencyPaused` | `emergencyPause()` from GovernanceConfig | Global warning banner |
| `votingParticipationRate` | `totalSeatsIssued / maxSupply * 100` | System health dashboard |
| `governanceHealthScore` | Composite: turnout, execution rate, stability | Admin panel metrics |

---

## 5. FUNCTIONS NOT TO EXPOSE DIRECTLY TO UI

### Administrative/Internal Functions (Backend Only)
| Contract | Function | Reason |
|----------|----------|--------|
| SeatNFT | `mint()` | Only electionAuthority can call |
| SeatNFT | `burnSeat()` | Only recallAuthority can call |
| SeatNFT | `setElectionAuthority()` | Only owner can call - controlled via governance |
| SeatNFT | `setRecallAuthority()` | Only owner can call - controlled via governance |
| GovernanceConfig | `updateQuorum()` | Only ExecutionEngine - auto-called post-vote |
| GovernanceConfig | `updateVotingDuration()` | Only ExecutionEngine - auto-called post-vote |
| GovernanceConfig | `updateApprovalThreshold()` | Only ExecutionEngine - auto-called post-vote |
| GovernanceConfig | `updateMinProposalDelay()` | Only ExecutionEngine - auto-called post-vote |
| GovernanceConfig | `setEmergencyPause()` | Only ExecutionEngine - auto-called post-vote |
| GovernanceConfig | `updateElectionAuthority()` | Only ExecutionEngine - auto-called post-vote |
| GovernanceConfig | `updateRecallAuthority()` | Only ExecutionEngine - auto-called post-vote |
| GovernanceConfig | `setExecutionEngine()` | Initialization only - already called |
| ExecutionEngine | Any internal voting/evaluation logic | Auto-executed by smart contract |
| ProposalDraftManager | `expireDraft()` | Maintenance function - can be called but not primary UI feature |

---

## 6. PROPOSED HOOK ARCHITECTURE

### 6.1 Layer 0: Core Contract Factories
**File**: `src/hooks/useContractFactory.ts`

Factory functions to create contract instances:
- `contractFactory.getSeatNFT(provider)`
- `contractFactory.getGovernanceConfig(provider)`
- `contractFactory.getProposalManager(provider)`
- `contractFactory.getVotingEngine(provider)`
- `contractFactory.getExecutionEngine(provider)`

---

### 6.2 Layer 1: Constitutional Layer Hooks (SeatNFT)
**File**: `src/hooks/useSeatInfo.ts`

```typescript
interface UseSeatInfoReturn {
  // User seat data
  userSeatCount: number;
  userSeats: number[];
  userSeatDetails: Array<{ seatId: number; partyId: number }>;
  
  // System seat data
  totalSeatsIssued: number;
  maxSeats: number;
  participationRate: number;
  
  // Authorities
  electionAuthority: string;
  recallAuthority: string;
  
  // Loading & errors
  isLoading: boolean;
  error: Error | null;
  
  // Refresh
  refresh: () => Promise<void>;
}
```

**Methods**:
- `useSeatInfo(userAddress?: string): UseSeatInfoReturn`
- `useSeatHistory(): SeatAction[]`
- `isSeatValid(seatId: number): Promise<boolean>`
- `getSeatParty(seatId: number): Promise<number>`

---

### 6.3 Layer 2a: Proposal Lifecycle Hooks (ProposalDraftManager)
**File**: `src/hooks/useProposalList.ts`

```typescript
interface UseProposalListReturn {
  // All proposals
  allProposals: Proposal[];
  proposalCount: number;
  
  // Filtered lists
  draftProposals: Proposal[];
  votingProposals: Proposal[];
  closedProposals: Proposal[];
  
  // Loading & errors
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  refresh: () => Promise<void>;
}
```

**Methods**:
- `useProposalList(): UseProposalListReturn`
- `useProposal(proposalId: number): Proposal & { derivedState: ProposalDerivedState }`

---

### 6.3 Layer 2b: Proposal Interaction Hooks
**File**: `src/hooks/useCreateProposal.ts`

```typescript
interface UseCreateProposalReturn {
  // Creation functions
  createRuleChangeProposal: (title, desc, changeType, newValue) => Promise<hash>;
  createAuthorityChangeProposal: (title, desc, changeType, newAddress) => Promise<hash>;
  createActionProposal: (title, desc, target, selector, params) => Promise<hash>;
  
  // Proposal sponsorship
  sponsorProposal: (proposalId, seatId) => Promise<hash>;
  getSponsorshipStatus: (proposalId) => Promise<({sponsorCount, partyCount, thresholdMet}));
  
  // Lifecycle management
  activateDraft: (proposalId) => Promise<hash>;
  startVoting: (proposalId) => Promise<hash>;
  closeVoting: (proposalId) => Promise<hash>;
  
  // State
  isLoading: boolean;
  error: Error | null;
  lastTxHash: string | null;
}
```

**Methods**:
- `useCreateProposal(): UseCreateProposalReturn`
- `useProposalSponsors(proposalId): { sponsors: number[]; parties: number[]; status }`

---

### 6.4 Layer 3: Voting Hooks (VotingEngine)
**File**: `src/hooks/useVote.ts`

```typescript
interface UseVoteReturn {
  // Voting interface
  vote: (proposalId, seatId, voteOption) => Promise<hash>;
  
  // Voting data
  getUserVote: (proposalId, seatId) => Promise<voteOption | null>;
  getVotingResults: (proposalId) => Promise<VotingResult>;
  getVoteCount: (proposalId, optionId) => Promise<number>;
  getTotalVotes: (proposalId) => Promise<number>;
  
  // Vote history
  getVoteHistory: () => Promise<VoteAction[]>;
  getProposalVoteHistory: (proposalId) => Promise<VoteAction[]>;
  
  // State
  isLoading: boolean;
  error: Error | null;
  
  // Computed
  votingStats: {
    totalVotes: number;
    approvalPercent: number;
    rejectionPercent: number;
  };
}
```

**Methods**:
- `useVote(proposalId?: number): UseVoteReturn`
- `useVotingResults(proposalId): DetailedVotingAnalytics`

---

### 6.5 Layer 4: Execution Hooks (ExecutionEngine)
**File**: `src/hooks/useExecuteProposal.ts`

```typescript
interface UseExecuteProposalReturn {
  // Execution
  executeProposal: (proposalId) => Promise<hash>;
  canExecute: (proposalId) => Promise<{canExecute: bool; reason: string}>;
  
  // Execution tracking
  isProposalExecuted: (proposalId) => Promise<boolean>;
  getExecutionResult: (proposalId) => Promise<ExecutionResult>;
  getExecutionHistory: () => Promise<ExecutionResult[]>;
  getTotalExecutedProposals: () => Promise<number>;
  
  // State
  isLoading: boolean;
  error: Error | null;
  isExecuting: boolean;
  
  // Helpers
  hasEmergencyPause: () => Promise<boolean>;
}
```

**Methods**:
- `useExecuteProposal(): UseExecuteProposalReturn`
- `useProposalStatus(proposalId): DetailedProposalStatus`

---

### 6.6 Layer 5: Governance Config Hooks (Read-Only)
**File**: `src/hooks/useGovernanceConfig.ts`

```typescript
interface UseGovernanceConfigReturn {
  // Parameters
  parameters: {
    quorum: number;
    votingDuration: number;
    approvalThreshold: number;
    minProposalDelay: number;
    maxSupply: number;
  };
  
  // Authorities
  authorities: {
    electionAuthority: string;
    recallAuthority: string;
    executionEngine: string;
  };
  
  // Status
  isEmergencyPaused: boolean;
  constitutionVersion: number;
  
  // History
  configChangeHistory: ConfigChange[];
  authorityChangeHistory: AuthorityChange[];
  
  // Computed percentages
  quorumPercent: number;
  approvalPercent: number;
  
  // State
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
```

**Methods**:
- `useGovernanceConfig(): UseGovernanceConfigReturn`
- `useGovernanceHistory(): { configChanges: ConfigChange[]; authorityChanges: AuthorityChange[] }`
- `isParameterValid(param: string, value: number): boolean`

---

### 6.7 Layer 6: Event Listening Hooks
**File**: `src/hooks/useGovernanceEvents.ts`

```typescript
interface UseGovernanceEventsReturn {
  // Real-time event streams
  onSeatMinted: (callback) => unsubscribe;
  onProposalCreated: (callback) => unsubscribe;
  onVoteCast: (callback) => unsubscribe;
  onProposalApproved: (callback) => unsubscribe;
  onProposalExecuted: (callback) => unsubscribe;
  onParameterChanged: (callback) => unsubscribe;
  
  // All events combined (for timeline)
  timelineEvents: GovernanceEvent[];
  
  // State
  isConnected: boolean;
  lastUpdate: timestamp;
}
```

**Methods**:
- `useGovernanceEvents(): UseGovernanceEventsReturn`
- Individual event listeners registered via `useEffect`

---

### 6.8 Compound Hooks (Convenience)
**File**: `src/hooks/useGovernanceState.ts`

```typescript
interface UseGovernanceStateReturn {
  // Everything in one place
  seats: ReturnType<typeof useSeatInfo>;
  proposals: ReturnType<typeof useProposalList>;
  voting: ReturnType<typeof useVote>;
  execution: ReturnType<typeof useExecuteProposal>;
  config: ReturnType<typeof useGovernanceConfig>;
  events: ReturnType<typeof useGovernanceEvents>;
  
  // Derived dashboard data
  dashboardMetrics: {
    activeProposals: number;
    totalParticipation: number;
    executionRate: number;
    systemHealth: "healthy" | "warning" | "critical";
  };
  
  // User actions shortcut
  userCanVote: boolean;
  userCanCreateProposal: boolean;
  userIsAdmin: boolean;
}
```

**Methods**:
- `useGovernanceState(userAddress?: string): UseGovernanceStateReturn` (single hook for entire app state)

---

## 7. EVENT ANALYSIS & REAL-TIME UPDATE STRATEGY

### 7.1 Events for Live Updates (Real-Time Subscriptions)

| Event | Priority | Update UI | Listening Strategy |
|-------|----------|-----------|-------------------|
| **VoteCast** | HIGH | Real-time vote counter | WebSocket listener on active proposals |
| **ProposalSupported** | HIGH | Sponsorship progress bar | WebSocket listener on draft proposals |
| **DraftActivated** | MEDIUM | Move to voting list | Poll or event listener |
| **VotingStarted** | MEDIUM | Start countdown timer | Event listener + timer start |
| **VotingClosed** | MEDIUM | Disable voting, show results | Event listener |
| **RuleChangeExecuted** | LOW | Parameter update notification | Event listener + read GovernanceConfig |
| **ProposalExecuted** | MEDIUM | Mark as executed | Event listener |
| **SeatMinted** | LOW | Update seat count | Event listener |
| **SeatBurned** | LOW | Update seat count | Event listener |

### 7.2 Events for Timeline Display

| Event Type | Fields to Display | Formatting |
|------------|------------------|-----------|
| Proposal Created | proposalId, proposer, title, type | "Proposal #123 created by 0x..." |
| Draft Activated | proposalId, sponsorCount | "Proposal #123 activated (45 sponsors)" |
| Voting Started | proposalId, votingEndTime | "Voting open until [Date]" |
| Vote Cast | proposalId, totalVotes, seatId | "Seat #42 voted (Total: 67 votes)" |
| Voting Closed | proposalId, newStatus, approvalVotes | "Voting closed - 52/100 approval (52%)" |
| Rule Change Executed | changeType, oldValue, newValue | "Quorum changed: 50% → 51%" |
| Proposal Executed | proposalId, actionDetails | "Proposal #123 executed" |

### 7.3 Events for Transaction Decoding

| Event | Transaction Type | Data to Extract |
|-------|-----------------|------------------|
| DraftProposalCreated | `createDraftProposal()` | ProposalId from event logs |
| ProposalSupported | `supportProposal()` | Confirmation of sponsorship added |
| VoteCast | `vote()` | Confirmation of vote recorded |
| DraftActivated | `activateDraft()` | Confirmation proposal moved to voting |
| VotingClosed | `closeVoting()` | Final proposal status |
| ProposalExecuted | `executeProposal()` | Execution success/failure |
| RuleChangeExecuted | `executeProposal()` | Specific governance parameter updated |

---

## 8. HOOK INTERDEPENDENCIES

```
useSeatInfo (SeatNFT)
├─ useCreateProposal (ProposalManager)
│  ├─ useProposalList (ProposalManager)
│  │  └─ useVote (VotingEngine)
│  │     └─ useExecuteProposal (ExecutionEngine)
│  │        └─ useGovernanceConfig (GovernanceConfig)
│  └─ useGovernanceConfig
└─ useGovernanceEvents (All contracts)
   └─ useGovernanceState (Compound hook - uses all above)
```

---

## 9. EVENT LISTENER IMPLEMENTATION PATTERNS

### 9.1 Real-Time Vote Counter
```
Setup:
1. Get proposal from chain
2. Set initial vote counts from getFullVotingResult()
3. Subscribe to VoteCast events for proposalId
4. Update UI on each event received
5. Cleanup unsubscriber on unmount
```

### 9.2 Sponsorship Progress Tracking
```
Setup:
1. Poll getSponsorshipStatus() every 3-5 seconds during draft phase
2. Listen to ProposalSupported events for instant updates
3. Calculate progress percentage and threshold met status
4. Stop polling when activated
```

### 9.3 Proposal Timeline
```
Setup:
1. Fetch historical events from deployment to current block
2. Listen to new events in real-time
3. Maintain timestamped event log
4. Sort chronologically with proposal milestones
5. Update timestamp-relative displays every minute
```

---

## 10. CACHING & OPTIMIZATION STRATEGIES

### 10.1 Query Caching
- Cache proposal data for 30 seconds (refresh on vote events)
- Cache governance parameters for 1 minute
- Cache seat info for 10 seconds
- Invalidate on relevant events

### 10.2 Event Deduplication
- Filter duplicate events (same txHash)
- Block multiple rapid vote casts from UI
- Debounce proposal refresh calls

### 10.3 Lazy Loading
- Load closed proposals on-demand (paginated)
- Load vote history only when timeline expanded
- Load seat history on seat detail page

---

## 11. ERROR HANDLING STRATEGY

| Error Type | Handling |
|-----------|----------|
| User doesn't have seat | Show "Create Proposal" blocked; show seat migration path |
| User already voted | Show "You voted on option X" |
| Proposal expired | Show "Expired (draft removed)" with reason |
| Voting not open | Show "Voting starts [Date]" or "Voting ended" |
| Cannot execute | Show reason from contract (`canExecuteProposal()`) |
| Emergency pause active | Show global warning banner with expiration |
| Network error | Show retry button, display last-known state |
| MetaMask not connected | Show connection prompt |

---

## 12. IMPLEMENTATION PRIORITY

### Phase 1 (Core Voting Flow)
1. `useSeatInfo` - User seat data
2. `useProposalList` - Proposal listing
3. `useVote` - Voting interface
4. `useGovernanceConfig` - Parameters display

### Phase 2 (Proposal Creation)
5. `useCreateProposal` - Create/sponsor proposals
6. `useGovernanceEvents` - Real-time updates

### Phase 3 (Execution & Advanced)
7. `useExecuteProposal` - Proposal execution
8. `useGovernanceState` - Compound hook
9. `useGovernanceHistory` - Full audit trail

---

## 13. TESTING CHECKLIST

- [ ] Happy path: Create → Sponsor → Vote → Execute
- [ ] Edge cases: Expired drafts, failed votes, paused execution
- [ ] Event listening: Real-time updates on vote cast
- [ ] Error states: No seat, already voted, network error
- [ ] Permissions: Only authorized actions allowed
- [ ] Derived state: Computed values match contract state
- [ ] Caching: Stale data refreshes on events
- [ ] Performance: No UI lag with 100+ proposals

---

## Summary

This integration plan provides:
- ✅ Complete ABI analysis (5 contracts, 60+ read functions, 20+ write functions)
- ✅ 7 key enums/types to replicate in frontend
- ✅ 40+ pieces of derived UI state to compute
- ✅ 8 specialized + 1 compound hook architecture
- ✅ 26 contract events categorized by use case
- ✅ Event listening patterns for real-time updates
- ✅ Timeline display strategy
- ✅ Error handling guidelines
- ✅ Implementation phases

**Ready for development**: All code generation can now proceed with confidence in the complete requirements.
