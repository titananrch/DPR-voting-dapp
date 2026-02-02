/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  getParties,
  getMembersByParty,
  isMemberActive,
} from "../hooks/useReadContracts";
import {
  addParty,
  deactivateParty,
  activateParty,
  registerMember,
  deactivateMember,
  activateMember,
} from "../hooks/useWriteContracts";
import Toast from "./Toast";
import { X, Plus } from "lucide-react";

interface Party {
  id: number;
  name: string;
  active: boolean;
}

interface Member {
  address: string;
  active: boolean;
}

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => Promise<void>;
}

export default function AdminModal({
  isOpen,
  onClose,
  onRefreshData,
}: AdminModalProps) {
  const [activeTab, setActiveTab] = useState<"parties" | "members">("parties");
  const [parties, setParties] = useState<Party[]>([]);
  const [partyMembers, setPartyMembers] = useState<Record<number, Member[]>>(
    {},
  );
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success" | "info";
  } | null>(null);

  // Modal states
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newMemberAddress, setNewMemberAddress] = useState("");

  // Helper to parse contract errors
  function parseError(err: any): string {
    const message = err?.message || err?.toString() || "Unknown error";

    // Extract reason string from reverted errors
    const reasonMatch = message.match(/reverted with reason string '([^']+)'/);
    if (reasonMatch) {
      return reasonMatch[1];
    }

    // Handle other common errors
    if (message.includes("User denied")) {
      return "Transaction cancelled by user";
    }
    if (message.includes("insufficient funds")) {
      return "Insufficient funds for transaction";
    }
    if (message.includes("invalid address")) {
      return "Invalid address format";
    }

    // Default to generic message
    return "Transaction failed — no changes were made.";
  }

  function showToast(
    message: string,
    type: "error" | "success" | "info" = "error",
  ) {
    setToast({ message, type });
  }

  // Load parties
  useEffect(() => {
    if (!isOpen) return;
    loadParties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function loadParties() {
    try {
      setToast(null);
      const partiesData = await getParties();
      setParties(partiesData);
      if (partiesData.length > 0 && !selectedPartyId) {
        setSelectedPartyId(partiesData[0].id);
      }
    } catch (err: any) {
      showToast(parseError(err), "error");
    }
  }

  // Load members when party selected or tab changes
  useEffect(() => {
    if (activeTab === "members" && selectedPartyId) {
      loadMembersForParty(selectedPartyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedPartyId]);

  async function loadMembersForParty(partyId: number) {
    try {
      setToast(null);
      const memberAddresses = await getMembersByParty(partyId);

      // Check active status for each member
      const members: Member[] = await Promise.all(
        memberAddresses.map(async (address) => ({
          address,
          active: await isMemberActive(address),
        })),
      );

      setPartyMembers((prev) => ({
        ...prev,
        [partyId]: members,
      }));
    } catch {
      showToast("Failed to load data. Please try again.", "error");
    }
  }

  // Truncate address helper
  function truncateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Add Party
  async function handleAddParty() {
    if (!newPartyName.trim()) {
      setToast({ message: "Please enter a party name", type: "error" });
      return;
    }

    try {
      setLoading(true);
      setToast(null);
      await addParty(newPartyName);
      setNewPartyName("");
      setShowAddPartyModal(false);
      await loadParties();
      await onRefreshData();
      showToast("Party added successfully!", "success");
    } catch (err: any) {
      showToast(parseError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  // Toggle party status
  async function handleTogglePartyStatus(partyId: number, isActive: boolean) {
    try {
      setLoading(true);
      setToast(null);

      if (isActive) {
        await deactivateParty(partyId);
      } else {
        await activateParty(partyId);
      }

      await loadParties();
      await onRefreshData();
      showToast("Party status updated!", "success");
    } catch (err: any) {
      showToast(parseError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  // Register Member
  async function handleAddMember() {
    if (!newMemberAddress.trim() || !selectedPartyId) {
      setToast({
        message: "Please enter a valid address and select a party",
        type: "error",
      });
      return;
    }

    try {
      setLoading(true);
      setToast(null);
      await registerMember(newMemberAddress, selectedPartyId);
      setNewMemberAddress("");
      setShowAddMemberModal(false);
      await loadMembersForParty(selectedPartyId);
      await onRefreshData();
      showToast("Member added successfully!", "success");
    } catch (err: any) {
      showToast(parseError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  // Toggle member status
  async function handleToggleMemberStatus(
    memberAddress: string,
    isActive: boolean,
  ) {
    try {
      setLoading(true);
      setToast(null);

      if (isActive) {
        await deactivateMember(memberAddress);
      } else {
        await activateMember(memberAddress);
      }

      if (selectedPartyId) {
        await loadMembersForParty(selectedPartyId);
      }
      await onRefreshData();
      showToast("Member status updated!", "success");
    } catch (err: any) {
      showToast(parseError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/5 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-black rounded-lg border border-white/10 w-full max-w-2xl h-[80vh] overflow-hidden flex flex-col">
        {/* ============================================
            HEADER
            Styling: Modal header with title and close button
            ============================================ */}
        <div className="px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-medium">Manage Parliament</h2>
          <button
            onClick={onClose}
            className="text-gray-200 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================
            TABS
            Styling: Tab navigation between Parties and Members
            ============================================ */}
        <div className="border-b border-white/10 flex">
          <button
            onClick={() => setActiveTab("parties")}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === "parties"
                ? "border-b-3 border-white text-white"
                : "text-gray-400 hover:text-white hover:border-b-3 border-white"
            }`}
          >
            Parties
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === "members"
                ? "border-b-3 border-white text-white"
                : "text-gray-400 hover:text-white hover:border-b-3 border-white"
            }`}
          >
            Members
          </button>
        </div>

        {/* ============================================
            CONTENT AREA
            Styling: Main scrollable content section
            ============================================ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar scrollbar-thin scrollbar-thumb-rounded-full scrollbar-thumb-white/30 scrollbar-track-transparent">
          {/* PARTIES TAB */}
          {activeTab === "parties" && (
            <div className="space-y-4">
              <button
                onClick={() => setShowAddPartyModal(true)}
                className="pr-4 pl-3 py-2 inline-flex items-center gap-1 text-sm font-medium rounded bg-white text-black hover:bg-white/80 cursor-pointer disabled:opacity-50"
                disabled={loading}
              >
                <Plus className="w-3 h-3 shrink-0" strokeWidth={3} />
                <span>Add Party</span>
              </button>

              <div className="space-y-2">
                {parties.length === 0 ? (
                  <p className="text-gray-500 text-sm">No parties yet</p>
                ) : (
                  parties.map((party) => (
                    <div
                      key={party.id}
                      className="border border-white/10 bg-black hover:bg-white/5 rounded p-3 flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{party.name}</p>
                        <p className="text-sm text-gray-600">
                          Status:{" "}
                          <span
                            className={
                              party.active
                                ? "text-green-600 font-semibold"
                                : "text-red-500 font-semibold"
                            }
                          >
                            {party.active ? "Active" : "Inactive"}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleTogglePartyStatus(party.id, party.active)
                        }
                        className={`inline-flex items-center gap-1 cursor-pointer px-3 py-1.5 text-sm rounded disabled:opacity-70 ${
                          party.active
                            ? "bg-red-500/20 hover:bg-red-500/30 text-red-500/80"
                            : "bg-green-500/20 hover:bg-green-500/30 text-green-500/80"
                        }`}
                        disabled={loading}
                      >
                        {party.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MEMBERS TAB */}
          {activeTab === "members" && (
            <div className="space-y-4">
              {parties.length === 0 ? (
                <p className="text-gray-500 text-sm">No parties available</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm">Select Party:</label>
                    <select
                      value={selectedPartyId ?? ""}
                      onChange={(e) =>
                        setSelectedPartyId(Number(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-white/10 bg-black hover:bg-white/5  text-sm rounded"
                    >
                      {parties.map((party) => (
                        <option key={party.id} value={party.id} className="bg-black hover:bg-white/5">
                          {party.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="pr-4 pl-3 py-2 inline-flex items-center gap-1 text-sm font-medium rounded bg-white text-black hover:bg-white/80 cursor-pointer disabled:opacity-50"
                    disabled={loading || !selectedPartyId}
                  >
                    <Plus className="w-3 h-3 shrink-0" strokeWidth={3} />
                    <span>Add Member</span>
                  </button>

                  <div className="space-y-2">
                    {selectedPartyId &&
                    (partyMembers[selectedPartyId]?.length ?? 0) === 0 ? (
                      <p className="text-gray-500 text-sm">
                        No members in this party
                      </p>
                    ) : (
                      partyMembers[selectedPartyId]?.map((member) => (
                        <div
                          key={member.address}
                          className="border border-white/10 hover:bg-white/5 rounded p-3 flex justify-between items-center"
                        >
                          <div className="flex-1">
                            <p className="font-mono">
                              {truncateAddress(member.address)}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              Status:{" "}
                              <span
                                className={
                                  member.active
                                    ? "text-green-600 font-semibold"
                                    : "text-red-600 font-semibold"
                                }
                              >
                                {member.active ? "Active" : "Inactive"}
                              </span>
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleToggleMemberStatus(
                                member.address,
                                member.active,
                              )
                            }
                            className={`inline-flex items-center gap-1 cursor-pointer px-3 py-1.5 text-sm rounded disabled:opacity-70 ${
                          member.active
                            ? "bg-red-500/20 hover:bg-red-500/30 text-red-500/80"
                            : "bg-green-500/20 hover:bg-green-500/30 text-green-500/80"
                        }`}
                            disabled={loading}
                          >
                            {member.active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ============================================
            FOOTER
            Styling: Modal footer with close button
            ============================================ */}
        <div className="border-t border-white/10 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-white/10 text-sm rounded hover:bg-white/10"
          >
            Done
          </button>
        </div>
      </div>

      {/* ============================================
          ADD PARTY MODAL
          Styling: Modal backdrop and form container
          ============================================ */}
      {showAddPartyModal && (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-black border border-white/10 p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4">Add New Party</h3>
            <input
              type="text"
              placeholder="Party name"
              value={newPartyName}
              onChange={(e) => setNewPartyName(e.target.value)}
              className="w-full px-3 py-2 border border-white/10 bg-black text-sm rounded mb-4 focus:outline-none  hover:bg-white/5"
              disabled={loading}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddPartyModal(false)}
                className="px-4 py-2 border border-white/10 rounded text-sm hover:bg-white/10 cursor-pointer disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddParty}
                className="px-4 py-2 bg-white text-black rounded text-sm hover:bg-gray-200 cursor-pointer disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Party"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          ADD MEMBER MODAL
          Styling: Modal backdrop and form container
          ============================================ */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-black border border-white/10 p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4">Add New Member</h3>
            <input
              type="text"
              placeholder="Member address (0x...)"
              value={newMemberAddress}
              onChange={(e) => setNewMemberAddress(e.target.value)}
              className="w-full px-3 py-2 border border-white/10 rounded mb-4 focus:outline-none hover:bg-white/5 bg-black text-sm"
              disabled={loading}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 border border-white/10 rounded text-sm hover:bg-white/10 cursor-pointer disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                className="px-4 py-2 bg-white text-black rounded text-sm hover:bg-gray-200 cursor-pointer disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
