/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
  getParties,
  getMembersByParty,
  getTopics,
  getUserVote,
  getResults,
  isAdmin,
} from "../src/hooks/useReadContracts";
import {
  vote,
  createTopic,
  addVoteOption,
  openTopic,
  closeTopic,
} from "../src/hooks/useWriteContracts";
import AdminModal from "../src/components/AdminModal";
import Toast from "../src/components/Toast";
import CreateTopicModal from "../src/components/modals/CreateTopicModal";
import AddOptionModal from "../src/components/modals/AddOptionModal";
import VoteConfirmationModal from "../src/components/modals/VoteConfirmationModal";
import WalletSection from "../src/components/home/WalletSection";
import DisabledStateOverlay from "../src/components/home/DisabledStateOverlay";
import PartiesSection from "../src/components/home/PartiesSection";
import TopicsSection from "../src/components/home/TopicsSection";
import { Plus,UserRoundPen } from "lucide-react";
import Background from "../src/components/Background";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function HomePage() {
  const [account, setAccount] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "connected"
  >("idle");
  const [walletError, setWalletError] = useState<string | null>(null);

  const [parties, setParties] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [members, setMembers] = useState<Record<number, string[]>>({});
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [showAddOptionModal, setShowAddOptionModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  // Form states
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newOptionLabel, setNewOptionLabel] = useState("");

  // Vote confirmation modal state
  const [showVoteConfirmModal, setShowVoteConfirmModal] = useState(false);
  const [pendingVote, setPendingVote] = useState<{
    topicId: number;
    optionId: number;
    optionLabel: string;
  } | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success" | "info";
  } | null>(null);

  function showToast(
    message: string,
    type: "error" | "success" | "info" = "error",
  ) {
    setToast({ message, type });
  }

  // Reset transient UI state
  const resetTransientState = () => {
    setShowNewTopicModal(false);
    setShowAddOptionModal(false);
    setShowAdminModal(false);
    setSelectedTopicId(null);
    setNewTopicTitle("");
    setNewOptionLabel("");
    setWalletError(null);
  };

  // Connect wallet
  async function connectWallet() {
    try {
      setConnectionState("connecting");
      setWalletError(null);

      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      setAccount(accounts[0]);
      setConnectionState("connected");
    } catch (error: any) {
      const errorMsg = error.message ?? "Failed to connect wallet";
      setWalletError(errorMsg);
      setConnectionState("idle");
    }
  }

  // Setup wallet event listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log("Accounts changed:", accounts);
      resetTransientState();

      if (accounts.length === 0) {
        // User disconnected
        setAccount(null);
        setConnectionState("idle");
        setParties([]);
        setTopics([]);
        setMembers({});
        setIsAdminUser(false);
      } else {
        // Account switched
        setAccount(accounts[0]);
        setConnectionState("connected");
        // Reload data with new account
        await loadData(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      console.log("Chain changed, reloading...");
      // Reload page on chain change
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // Check if already connected on mount
  useEffect(() => {
    async function checkConnection() {
      if (!window.ethereum) return;

      try {
        const accounts = (await window.ethereum.request({
          //Change This to eth_accounts after testing
          method: "eth_accounts",
        })) as string[];

        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setConnectionState("connected");
          await loadData(accounts[0]);
        }
      } catch (error) {
        console.error("Error checking connection:", error);
      }
    }

    checkConnection();
  }, []);

  async function loadData(account: string) {
    // Parties
    const partiesData = await getParties();
    setParties(partiesData);

    // Members
    const membersMap: Record<number, string[]> = {};
    for (const party of partiesData) {
      membersMap[party.id] = await getMembersByParty(party.id);
    }
    setMembers(membersMap);

    // Check if admin
    const adminStatus = await isAdmin(account);
    setIsAdminUser(adminStatus);

    // Check membership
    const isMember = Object.values(membersMap)
      .flat()
      .some((addr) => addr.toLowerCase() === account.toLowerCase());

    // Topics
    const rawTopics = await getTopics();

    const enrichedTopics = await Promise.all(
      rawTopics.map(async (t) => {
        const votedOptionId = await getUserVote(t.id, account);
        const hasVoted = votedOptionId !== -1; // Changed from !== 0 to !== -1

        console.log(
          `Topic ${t.id}: votedOptionId = ${votedOptionId}, hasVoted = ${hasVoted}`,
        ); // DEBUG

        // RESULTS (only if CLOSED)
        let results = null;

        if (t.status === 2) {
          const counts = await getResults(t.id);
          const totalVotes = counts.reduce((a, b) => a + b, 0);

          results = t.options.map((opt, idx) => {
            const count = counts[idx] ?? 0;
            const percentage =
              totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);

            return {
              optionId: opt.id,
              label: opt.label,
              count,
              percentage,
            };
          });
        }

        return {
          ...t,
          hasVoted,
          votedOptionId: hasVoted ? votedOptionId : null,
          canVote: t.isActive && isMember && !hasVoted && !isAdminUser,
          results,
        };
      }),
    );

    setTopics(enrichedTopics);
  }

  useEffect(() => {
    if (!account || connectionState !== "connected") return;

    (async () => {
      try {
        await loadData(account);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    })();
  }, [account, connectionState]);

  async function handleVote(topicId: number, optionId: number) {
    try {
      await vote(topicId, optionId);

      // reload everything after tx
      await loadData(account!);
      setShowVoteConfirmModal(false);
      setPendingVote(null);
      showToast("Voting submitted successfully", "success");
    } catch {
      showToast("Voting failed", "error");
    }
  }

  // Open confirmation modal before voting
  function handleRequestVote(
    topicId: number,
    optionId: number,
    optionLabel: string,
  ) {
    setPendingVote({ topicId, optionId, optionLabel });
    setShowVoteConfirmModal(true);
  }

  // Confirm the pending vote
  function handleConfirmVote() {
    if (!pendingVote) return;
    handleVote(pendingVote.topicId, pendingVote.optionId);
  }

  // Admin handlers
  async function handleCreateTopic() {
    if (!newTopicTitle.trim()) {
      showToast("Please enter a topic title", "info");
      return;
    }

    try {
      setLoading(true);
      await createTopic(newTopicTitle);
      setNewTopicTitle("");
      setShowNewTopicModal(false);
      await loadData(account!);
      showToast("Topic created successfully!", "success");
    } catch {
      showToast("Failed to create topic", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddOption() {
    if (!newOptionLabel.trim() || selectedTopicId === null) {
      showToast("Please enter an option label", "info");
      return;
    }

    try {
      setLoading(true);
      await addVoteOption(selectedTopicId, newOptionLabel);
      setNewOptionLabel("");
      setShowAddOptionModal(false);
      await loadData(account!);
      showToast("Option added successfully!", "success");
    } catch {
      showToast("Failed to add option", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenTopic(topicId: number) {
    try {
      setLoading(true);
      await openTopic(topicId);
      await loadData(account!);
      showToast("Topic opened successfully!", "success");
    } catch {
      showToast("Failed to open topic", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseTopic(topicId: number) {
    try {
      setLoading(true);
      await closeTopic(topicId);
      await loadData(account!);
      showToast("Topic closed successfully!", "success");
    } catch {
      showToast("Failed to close topic", "error");
    } finally {
      setLoading(false);
    }
  }

  const [activeView, setActiveView] = useState<"topics" | "parties">("topics");
  const [activeTopicFilter, setActiveTopicFilter] = useState<
    "all" | "active" | "early" | "closed"
  >("all");
  const [expandedPartyId, setExpandedPartyId] = useState<number | null>(null);
  const filteredTopics =
    activeTopicFilter === "all"
      ? topics
      : topics.filter((t) => {
          if (activeTopicFilter === "active") return t.status === 1;
          if (activeTopicFilter === "early") return t.status === 0;
          if (activeTopicFilter === "closed") return t.status === 2;
          return true;
        });

  return (
    <main className="relative flex flex-col min-h-screen ">
      <Background />
      <WalletSection
        connectionState={connectionState}
        account={account}
        walletError={walletError}
        connectWallet={connectWallet}
        isAdminUser={isAdminUser}
        setShowAdminModal={setShowAdminModal}
      />

      {connectionState !== "connected" && <DisabledStateOverlay />}

      {connectionState === "connected" && (
        <div className="flex-1 flex overflow-hidden mx-auto w-full max-w-7xl">
          {/* Scrollable main container */}
          <div className="flex-1 flex h-screen overflow-hidden">
            <aside className="w-80 border-r border-white/10 h-full pt-10 space-y-4 overflow-y-auto max-h-screen">
            {/* TOPICS */}
            <div className="sticky top-0 ">
              <button
                className={`w-full text-left text-md transition ${
                  activeView === "topics"
                    ? "text-white"
                    : "text-gray-500 hover:text-white"
                }`}
                onClick={() => {
                  if (activeView === "topics") {
                    // RESET topics view
                    setActiveTopicFilter("all");
                  } else {
                    // SWITCH to topics view
                    setActiveView("topics");
                    setActiveTopicFilter("all");
                  }
                }}
              >
                Topics
              </button>

              {activeView === "topics" && (
                <ul className="mt-2 ml-3 space-y-1 text-sm">
                  {[
                    { key: "active", label: "Active" },
                    { key: "early", label: "Early" },
                    { key: "closed", label: "Finished" },
                  ].map((f) => (
                    <li key={f.key}>
                      <button
                        className={`w-full text-left px-2 py-1 rounded transition ${
                          activeTopicFilter === f.key
                            ? "text-white"
                            : "text-gray-500 hover:text-white"
                        }`}
                        onClick={() => setActiveTopicFilter(f.key as any)}
                      >
                        {f.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* PARTIES */}
            <div>
              <button
                className={`w-full text-left text-md transition ${
                  activeView === "parties"
                    ? "text-white"
                    : "text-gray-500 hover:text-white"
                }`}
                onClick={() => {
                  if (activeView === "parties") {
                    // RESET parties view
                    setExpandedPartyId(null);
                  } else {
                    // SWITCH to parties view
                    setActiveView("parties");
                    setExpandedPartyId(null);
                  }
                }}
              >
                Parties
              </button>

              {activeView === "parties" && (
                <ul className="mt-2 ml-3 space-y-1 text-sm">
                  {parties.map((p) => (
                    <li key={p.id}>
                      <button
                        className={`w-full text-left px-2 py-1 rounded transition ${
                          expandedPartyId === p.id
                            ? "text-white"
                            : "text-gray-500 hover:text-white"
                        }`}
                        onClick={() =>
                          setExpandedPartyId(
                            expandedPartyId === p.id ? null : p.id,
                          )
                        }
                      >
                        {p.name}
                      </button>

                      {/* MEMBERS */}
                      {expandedPartyId === p.id && (
                        <ul className="ml-4 mt-1 space-y-1 text-sm font-mono text-gray-600">
                          {members[p.id]?.map((m) => (
                            <li key={m} className="truncate">
                              {m}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <section className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto py-10 px-6">
            {/* TOPICS VIEW */}
            {activeView === "topics" && (
              <>
                {/* Header (non-scrolling later if you want) */}
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {activeTopicFilter === "all" && "All Topics"}
                    {activeTopicFilter === "active" && "Active Topics"}
                    {activeTopicFilter === "early" && "Early Topics"}
                    {activeTopicFilter === "closed" && "Finished Topics"}
                  </h2>

                  {isAdminUser && (
                    <button
                      onClick={() => setShowNewTopicModal(true)}
                      className="pr-4 pl-3 py-2 inline-flex items-center gap-1 text-xs font-medium rounded bg-white text-black hover:bg-white/80 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 shrink-0" strokeWidth={3}/>
                      <span>New Topic</span>
                    </button>
                  )}
                </div>
                {/* EMPTY STATE */}
                {filteredTopics.length === 0 ? (
                  <div className="mt-12 text-center text-sm text-gray-400">
                    {activeTopicFilter === "active" && (
                      <p>No active topics at the moment.</p>
                    )}
                    {activeTopicFilter === "early" && (
                      <p>
                        No early topics. New topics will appear here before
                        voting starts.
                      </p>
                    )}
                    {activeTopicFilter === "closed" && (
                      <p>No finished topics yet.</p>
                    )}
                  </div>
                ) : (
                  <TopicsSection
                    topics={filteredTopics}
                    isAdminUser={isAdminUser}
                    loading={loading}
                    setSelectedTopicId={setSelectedTopicId}
                    setShowAddOptionModal={setShowAddOptionModal}
                    handleOpenTopic={handleOpenTopic}
                    handleRequestVote={handleRequestVote}
                    handleCloseTopic={handleCloseTopic}
                  />
                )}
              </>
            )}

            {/* PARTIES VIEW */}
            {activeView === "parties" && (
              <>
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {expandedPartyId ? "Party Members" : "All Parties"}
                  </h2>

                  {isAdminUser && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAdminModal(true)}
                        className="pr-4 pl-3 py-2 inline-flex items-center gap-1 text-xs font-medium rounded bg-white text-black hover:bg-white/80 cursor-pointer"
                    >
                      <UserRoundPen className="w-3 h-3 shrink-0" strokeWidth={3}/>
                        <span>Manage Parliament</span>
                      </button>
                    </div>
                  )}
                </div>

                <PartiesSection
                  parties={parties}
                  members={members}
                  selectedPartyId={expandedPartyId}
                />
              </>
            )}
            </div>
            
          </section>
        </div>
      </div>
      )}

       {/* Footer - inside main, shown when connected */}
      {connectionState === "connected" && (
        <footer className="border-t border-white/10 bg-black/10 p-6 text-center text-sm text-white/50 flex mx-auto w-full justify-center gap-1">
          <p>&copy; 2026 Democratic Parliament Voting System.</p>
          <a href="https://github.com/titananrch" className="hover:text-white hover:underline">titananrch</a>
        </footer>
      )}

      {connectionState === "connected" && (
        <>
          <CreateTopicModal
            isOpen={showNewTopicModal}
            loading={loading}
            title={newTopicTitle}
            onTitleChange={setNewTopicTitle}
            onClose={() => setShowNewTopicModal(false)}
            onCreate={handleCreateTopic}
          />

          <AddOptionModal
            isOpen={showAddOptionModal}
            loading={loading}
            optionLabel={newOptionLabel}
            onOptionLabelChange={setNewOptionLabel}
            onClose={() => setShowAddOptionModal(false)}
            onAdd={handleAddOption}
          />

          <VoteConfirmationModal
            isOpen={showVoteConfirmModal}
            loading={loading}
            optionLabel={pendingVote?.optionLabel}
            onClose={() => {
              setShowVoteConfirmModal(false);
              setPendingVote(null);
            }}
            onConfirm={handleConfirmVote}
          />

          <AdminModal
            isOpen={showAdminModal}
            onClose={() => setShowAdminModal(false)}
            onRefreshData={() => account && loadData(account)}
          />

          {/* Toast Notification */}
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onDismiss={() => setToast(null)}
            />
          )}
        </>
      )}
    </main>
  );
}
