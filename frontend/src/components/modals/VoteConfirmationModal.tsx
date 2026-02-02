"use client";

interface VoteConfirmationModalProps {
  isOpen: boolean;
  loading: boolean;
  optionLabel: string | undefined;
  onClose: () => void;
  onConfirm: () => void;
}

export default function VoteConfirmationModal({
  isOpen,
  loading,
  optionLabel,
  onClose,
  onConfirm,
}: VoteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/5 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-black rounded-lg border border-white/10 w-96">
        <div className="px-6 pt-4 pb-2 border-b border-white/10">
          <h3 className="text-xl font-bold">Confirm Your Vote</h3>
        </div>
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-sm mb-4">Are you sure you want to vote for:</p>
          <p className="text-xl font-semibold mb-4">{optionLabel}</p>
          <p className="text-sm font-light italic text-white/50 mb-6">
            This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-white/10 rounded hover:bg-white/10 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm bg-white text-black rounded hover:bg-white/80 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Confirming..." : "Confirm Vote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
